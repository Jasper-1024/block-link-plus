import { Prec, type EditorState } from "@codemirror/state";
import { EditorView } from "@codemirror/view";
import { DateTime } from "luxon";
import { editorInfoField, editorLivePreviewField } from "obsidian";
import type BlockLinkPlus from "../../main";
import { generateRandomId } from "../../utils";
import { isEnhancedListEnabledFile } from "./enable-scope";
import { clearEnhancedListBlockSelection, enhancedListBlockSelectionStateField } from "./block-selection-extension";
import { indentCols, lineIndentCols, MARKDOWN_TAB_WIDTH } from "./indent-utils";
import {
	FENCE_LINE_REGEX,
	LIST_ITEM_PREFIX_RE,
	SYSTEM_LINE_DATE_ONLY_RE,
	SYSTEM_LINE_ID_ONLY_RE,
	SYSTEM_LINE_MERGED_RE,
	escapeRegex,
} from "./list-parse";

// Keep a versioned, internal-only MIME type so "internal paste" can preserve system lines / IDs.
const BLP_SUBTREE_CLIPBOARD_MIME = "application/x-blp-enhanced-list-subtree-v1";

type Range = { from: number; to: number };

type ClipboardPayloadV1 = {
	v: 1;
	kind: "copy" | "cut";
	textWithSystemLines: string;
	baseIndentCols: number;
};

function mergeRanges(ranges: Range[]): Range[] {
	if (ranges.length === 0) return [];
	const sorted = [...ranges].sort((a, b) => a.from - b.from);
	const merged: Range[] = [];
	for (const r of sorted) {
		const last = merged[merged.length - 1];
		if (!last || r.from > last.to) {
			merged.push({ from: r.from, to: r.to });
			continue;
		}
		last.to = Math.max(last.to, r.to);
	}
	return merged;
}

function computeSubtreeRange(
	state: EditorState,
	startLineNumber: number,
	parentIndentCols: number,
	tabSize: number
): Range {
	const doc = state.doc;
	const startLine = doc.line(startLineNumber);

	let inFence = false;
	let fenceChar = "";
	let fenceLen = 0;
	let openedAtLineNo = 0;

	let to = doc.length;
	for (let ln = startLineNumber + 1; ln <= doc.lines; ln++) {
		const line = doc.line(ln);
		const text = line.text ?? "";

		if (!inFence) {
			const m = text.match(FENCE_LINE_REGEX);
			if (m) {
				inFence = true;
				fenceChar = (m[2] ?? "")[0] ?? "";
				fenceLen = (m[2] ?? "").length;
				openedAtLineNo = ln;
			}
		}

		if (!inFence) {
			// Blank lines are kept as part of the subtree.
			if (text.trim() === "") continue;

			// Any non-blank line at or above the parent's marker indent ends the subtree.
			if (lineIndentCols(text, tabSize) <= parentIndentCols) {
				to = line.from;
				break;
			}
		}

		if (inFence) {
			const closeRe = new RegExp(`^\\s*${escapeRegex(fenceChar)}{${fenceLen},}\\s*$`);
			if (fenceChar && fenceLen >= 3 && ln !== openedAtLineNo && closeRe.test(text)) {
				inFence = false;
				fenceChar = "";
				fenceLen = 0;
				openedAtLineNo = 0;
			}
		}
	}

	return { from: startLine.from, to };
}

function computeSelectedSubtreeRanges(state: EditorState, selectedStartPos: number[]): Range[] {
	const doc = state.doc;
	const ranges: Range[] = [];
	for (const pos of selectedStartPos) {
		let line;
		try {
			line = doc.lineAt(pos);
		} catch {
			continue;
		}
		const m = (line.text ?? "").match(LIST_ITEM_PREFIX_RE);
		if (!m) continue;
		const parentIndentCols = indentCols(m[1] ?? "", MARKDOWN_TAB_WIDTH);
		ranges.push(computeSubtreeRange(state, line.number, parentIndentCols, MARKDOWN_TAB_WIDTH));
	}
	return mergeRanges(ranges);
}

function stripSystemLines(text: string): string {
	const lines = text.split("\n");
	const out: string[] = [];
	for (let i = 0; i < lines.length; i++) {
		const line = lines[i] ?? "";

		if (SYSTEM_LINE_MERGED_RE.test(line)) continue;

		const dateOnly = line.match(SYSTEM_LINE_DATE_ONLY_RE);
		if (dateOnly) {
			const next = lines[i + 1] ?? "";
			if (SYSTEM_LINE_ID_ONLY_RE.test(next)) {
				i += 1;
				continue;
			}
			// A stray date-only system line is still considered internal noise.
			continue;
		}

		// A bare `^id` line is only removed when it is part of a split pair.
		out.push(line);
	}
	return out.join("\n");
}

function computeBaseIndentColsFromSelection(state: EditorState, selectedStartPos: number[]): number {
	const doc = state.doc;
	let base = Number.POSITIVE_INFINITY;

	for (const pos of selectedStartPos) {
		let line;
		try {
			line = doc.lineAt(pos);
		} catch {
			continue;
		}
		const m = (line.text ?? "").match(LIST_ITEM_PREFIX_RE);
		if (!m) continue;
		base = Math.min(base, indentCols(m[1] ?? "", MARKDOWN_TAB_WIDTH));
	}

	return Number.isFinite(base) ? base : 0;
}

function computeDestIndentColsAtPos(state: EditorState, pos: number): number {
	const doc = state.doc;
	try {
		const line = doc.lineAt(pos);
		const m = (line.text ?? "").match(LIST_ITEM_PREFIX_RE);
		if (!m) return 0;
		return indentCols(m[1] ?? "", MARKDOWN_TAB_WIDTH);
	} catch {
		return 0;
	}
}

function computeBaseIndentColsFromText(text: string): number {
	const lines = text.split("\n");
	let base = Number.POSITIVE_INFINITY;

	for (const line of lines) {
		const m = (line ?? "").match(LIST_ITEM_PREFIX_RE);
		if (!m) continue;
		base = Math.min(base, indentCols(m[1] ?? "", MARKDOWN_TAB_WIDTH));
	}

	return Number.isFinite(base) ? base : 0;
}

function looksLikeListSubtree(text: string): boolean {
	const lines = text.split("\n");
	for (const line of lines) {
		if ((line ?? "").trim().length === 0) continue;
		return LIST_ITEM_PREFIX_RE.test(line);
	}
	return false;
}

function isSystemLine(text: string): boolean {
	return (
		SYSTEM_LINE_MERGED_RE.test(text) ||
		SYSTEM_LINE_DATE_ONLY_RE.test(text) ||
		SYSTEM_LINE_ID_ONLY_RE.test(text)
	);
}

function reindentTextByDelta(text: string, deltaCols: number): string {
	if (deltaCols === 0) return text;
	const lines = text.split("\n");
	for (let i = 0; i < lines.length; i++) {
		const line = lines[i] ?? "";
		if (line.length === 0) continue;
		const m = line.match(/^(\s*)(.*)$/);
		if (!m) continue;
		const leading = m[1] ?? "";
		const rest = m[2] ?? "";
		const currentCols = indentCols(leading, MARKDOWN_TAB_WIDTH);
		const nextCols = Math.max(0, currentCols + deltaCols);
		lines[i] = `${" ".repeat(nextCols)}${rest}`;
	}
	return lines.join("\n");
}

function collectExistingBlockIdsInDoc(state: EditorState): Set<string> {
	const ids = new Set<string>();
	const text = state.doc.toString();
	const re = /\^([a-zA-Z0-9_-]+)/g;
	let m: RegExpExecArray | null;
	while ((m = re.exec(text))) {
		ids.add(m[1]);
	}
	return ids;
}

function generateUniqueId(plugin: BlockLinkPlus, usedIds: Set<string>): string {
	const prefix = plugin.settings.enable_prefix ? plugin.settings.id_prefix : "";
	const length = plugin.settings.id_length;

	for (let i = 0; i < 50; i++) {
		const id = generateRandomId(prefix, length);
		if (usedIds.has(id)) continue;
		usedIds.add(id);
		return id;
	}

	// Extremely unlikely fallback: keep trying with a longer random suffix.
	while (true) {
		const id = Math.random().toString(36).slice(2, 10);
		if (usedIds.has(id)) continue;
		usedIds.add(id);
		return id;
	}
}

function formatSystemDate(dt: DateTime): string {
	return dt.toFormat("yyyy-MM-dd'T'HH:mm:ss");
}

function remapSystemLinesForCopy(text: string, plugin: BlockLinkPlus, usedIds: Set<string>): string {
	const now = DateTime.now();
	const date = formatSystemDate(now);

	const lines = text.split("\n");
	const out: string[] = [];

	for (let i = 0; i < lines.length; i++) {
		const line = lines[i] ?? "";

		const merged = line.match(SYSTEM_LINE_MERGED_RE);
		if (merged) {
			const indent = merged[1] ?? "";
			const nextId = generateUniqueId(plugin, usedIds);
			out.push(`${indent}[date:: ${date}] ^${nextId}`);
			continue;
		}

		const dateOnly = line.match(SYSTEM_LINE_DATE_ONLY_RE);
		if (dateOnly) {
			const next = lines[i + 1] ?? "";
			const idOnly = next.match(SYSTEM_LINE_ID_ONLY_RE);
			if (idOnly) {
				const indent = dateOnly[1] ?? "";
				const nextId = generateUniqueId(plugin, usedIds);
				out.push(`${indent}[date:: ${date}] ^${nextId}`);
				i += 1;
				continue;
			}
		}

		out.push(line);
	}

	return out.join("\n");
}

function shouldEnableSubtreeClipboard(
	view: EditorView,
	plugin: BlockLinkPlus,
	infoField: typeof editorInfoField,
	livePreviewField: typeof editorLivePreviewField
): boolean {
	// Clipboard semantics are only active in the same conditions as block selection mode.
	if (plugin.settings.enhancedListSubtreeClipboardEnabled === false) return false;
	if (!plugin.settings.enhancedListHandleActions) return false;
	if (plugin.settings.enhancedListHandleClickAction !== "select-block") return false;

	try {
		if (view.state.field?.(livePreviewField, false) !== true) {
			return false;
		}
	} catch {
		return false;
	}

	const info = view.state.field(infoField, false);
	const file = info?.file;
	if (!file) return false;

	return isEnhancedListEnabledFile(plugin, file);
}

function getSelectedStartPos(view: EditorView): number[] {
	const st = view.state.field(enhancedListBlockSelectionStateField, false) as
		| { selectedStartPos: number[] }
		| undefined;
	return st?.selectedStartPos ?? [];
}

function isEmptyTextSelection(view: EditorView): boolean {
	return view.state.selection.main.empty === true;
}

export function createEnhancedListSubtreeClipboardExtension(
	plugin: BlockLinkPlus,
	deps: { infoField?: typeof editorInfoField; livePreviewField?: typeof editorLivePreviewField } = {}
) {
	const infoField = deps.infoField ?? editorInfoField;
	const livePreviewField = deps.livePreviewField ?? editorLivePreviewField;

	function computeCursorPasteTarget(
		state: EditorState,
		cursorPos: number
	): { insertAt: number; destIndentCols: number; replaceRange: Range | null } | null {
		const doc = state.doc;
		let line;
		try {
			line = doc.lineAt(cursorPos);
		} catch {
			return null;
		}

		const originalText = line.text ?? "";

		// Normal case: cursor is on a list item marker line.
		let m = originalText.match(LIST_ITEM_PREFIX_RE);

		// When system lines are hidden in Live Preview, the caret can end up on the
		// hidden system line. In that case, resolve the owning list item above so
		// subtree paste stays block-level (instead of falling back to plain text).
		if (!m) {
			const isIndentedBlank =
				originalText.trim().length === 0 && lineIndentCols(originalText, MARKDOWN_TAB_WIDTH) > 0;
			if (!isSystemLine(originalText) && !isIndentedBlank) return null;

			for (let ln = line.number - 1; ln >= 1; ln--) {
				const candidate = doc.line(ln);
				const cm = (candidate.text ?? "").match(LIST_ITEM_PREFIX_RE);
				if (!cm) continue;

				const parentIndentCols = indentCols(cm[1] ?? "", MARKDOWN_TAB_WIDTH);
				const subtreeRange = computeSubtreeRange(state, candidate.number, parentIndentCols, MARKDOWN_TAB_WIDTH);

				if (cursorPos < subtreeRange.from || cursorPos >= subtreeRange.to) continue;

				m = cm;
				line = candidate;
				break;
			}

			if (!m) return null;
		}

		const text = line.text ?? "";
		const parentIndentCols = indentCols(m[1] ?? "", MARKDOWN_TAB_WIDTH);
		const subtreeRange = computeSubtreeRange(state, line.number, parentIndentCols, MARKDOWN_TAB_WIDTH);

		// When the cursor sits on an empty placeholder list item (`- `), replace it so we don't
		// leave a dangling empty block above the pasted subtree.
		const afterPrefix = text.slice(m[0].length);
		const isEmptyItem = afterPrefix.trim().length === 0;
		if (isEmptyItem) {
			return { insertAt: subtreeRange.from, destIndentCols: parentIndentCols, replaceRange: subtreeRange };
		}

		// Default: paste below the current block subtree (sibling insertion).
		return { insertAt: subtreeRange.to, destIndentCols: parentIndentCols, replaceRange: null };
	}

	function handleCopy(event: ClipboardEvent, view: EditorView, kind: "copy" | "cut"): boolean {
		if (!shouldEnableSubtreeClipboard(view, plugin, infoField, livePreviewField)) return false;
		if (!isEmptyTextSelection(view)) return false;

		const selected = getSelectedStartPos(view);
		if (selected.length === 0) return false;

		const clipboardData = event.clipboardData ?? (window as any).clipboardData;
		if (!clipboardData) return false;

		const ranges = computeSelectedSubtreeRanges(view.state, selected);
		if (ranges.length === 0) return false;

		const textWithSystemLines = ranges.map((r) => view.state.doc.sliceString(r.from, r.to)).join("");
		const textPlain = stripSystemLines(textWithSystemLines);
		const baseIndentCols = computeBaseIndentColsFromSelection(view.state, selected);

		const payload: ClipboardPayloadV1 = {
			v: 1,
			kind,
			textWithSystemLines,
			baseIndentCols,
		};

		try {
			clipboardData.setData("text/plain", textPlain);
			clipboardData.setData(BLP_SUBTREE_CLIPBOARD_MIME, JSON.stringify(payload));
		} catch {
			// If the platform rejects custom clipboard writes, fall back to plain text only.
			try {
				clipboardData.setData("text/plain", textPlain);
			} catch {
				// ignore
			}
		}

		event.preventDefault();
		return true;
	}

	function handleCut(event: ClipboardEvent, view: EditorView): boolean {
		const didCopy = handleCopy(event, view, "cut");
		if (!didCopy) return false;

		const selected = getSelectedStartPos(view);
		const ranges = computeSelectedSubtreeRanges(view.state, selected);
		if (ranges.length === 0) return true;

		const first = ranges[0];
		view.dispatch({
			changes: ranges.map((r) => ({ from: r.from, to: r.to, insert: "" })),
			selection: { anchor: first.from },
		});
		clearEnhancedListBlockSelection(view);
		return true;
	}

	function handlePaste(event: ClipboardEvent, view: EditorView): boolean {
		if (!shouldEnableSubtreeClipboard(view, plugin, infoField, livePreviewField)) return false;
		if (!isEmptyTextSelection(view)) return false;

		const clipboardData = event.clipboardData ?? (window as any).clipboardData;
		if (!clipboardData) return false;

		const selected = getSelectedStartPos(view);
		const hasBlockSelection = selected.length > 0;

		let ranges: Range[] = [];
		let insertAt = 0;
		let destIndentCols = 0;
		let cursorReplaceRange: Range | null = null;

		if (hasBlockSelection) {
			ranges = computeSelectedSubtreeRanges(view.state, selected);
			if (ranges.length === 0) return false;
			insertAt = ranges[0].from;
			destIndentCols = computeDestIndentColsAtPos(view.state, insertAt);
		} else {
			const cursorPos = view.state.selection.main.head;
			const cursorTarget = computeCursorPasteTarget(view.state, cursorPos);
			if (!cursorTarget) return false;
			insertAt = cursorTarget.insertAt;
			destIndentCols = cursorTarget.destIndentCols;
			cursorReplaceRange = cursorTarget.replaceRange;
		}

		let insertText = "";
		let internalKind: ClipboardPayloadV1["kind"] | null = null;
		let sourceBaseIndentCols = 0;

		const rawInternal = clipboardData.getData(BLP_SUBTREE_CLIPBOARD_MIME);
		if (rawInternal) {
			try {
				const parsed = JSON.parse(rawInternal) as ClipboardPayloadV1;
				if (parsed && parsed.v === 1 && typeof parsed.textWithSystemLines === "string") {
					insertText = parsed.textWithSystemLines;
					internalKind = parsed.kind === "cut" ? "cut" : "copy";
					sourceBaseIndentCols = Number(parsed.baseIndentCols) || 0;
				}
			} catch {
				// ignore
			}
		}

		// Fall back to plain text (external clipboard).
		if (!insertText) {
			insertText = clipboardData.getData("text/plain") || "";

			// When block selection is not active, only intercept if the clipboard looks like a list subtree;
			// otherwise allow normal "paste text into the current line" behavior.
			if (!hasBlockSelection && !looksLikeListSubtree(insertText)) return false;

			sourceBaseIndentCols = computeBaseIndentColsFromText(insertText);
			internalKind = null;
		}

		// Re-indent pasted blocks so their top-level indent matches the destination block level.
		const deltaCols = destIndentCols - sourceBaseIndentCols;
		if (insertText) insertText = reindentTextByDelta(insertText, deltaCols);

		// Copy semantics should produce new block IDs immediately.
		if (internalKind === "copy") {
			const used = collectExistingBlockIdsInDoc(view.state);
			insertText = remapSystemLinesForCopy(insertText, plugin, used);
		}

		// Ensure we don't merge with the next line when pasting into the middle of a document.
		if (insertText && insertAt < view.state.doc.length && !insertText.endsWith("\n")) {
			insertText += "\n";
		}

		let changes:
			| { from: number; to: number; insert: string }[]
			| readonly { from: number; to: number; insert: string }[] = [];
		let anchor = insertAt;

		if (hasBlockSelection) {
			const [first, ...rest] = ranges;
			changes = [
				{ from: first.from, to: first.to, insert: insertText },
				...rest.map((r) => ({ from: r.from, to: r.to, insert: "" })),
			];
			anchor = first.from;
		} else if (cursorReplaceRange) {
			changes = [{ from: cursorReplaceRange.from, to: cursorReplaceRange.to, insert: insertText }];
			anchor = cursorReplaceRange.from;
		} else {
			changes = [{ from: insertAt, to: insertAt, insert: insertText }];
			anchor = insertAt;
		}

		view.dispatch({ changes, selection: { anchor } });
		if (hasBlockSelection) clearEnhancedListBlockSelection(view);

		event.preventDefault();
		return true;
	}

	// Use the highest precedence so we can override CM's default clipboard behavior
	// when block selection mode is active (block-tree semantics).
	return Prec.highest(
		EditorView.domEventHandlers({
			copy: (event, view) => handleCopy(event as any, view, "copy"),
			cut: (event, view) => handleCut(event as any, view),
			paste: (event, view) => handlePaste(event as any, view),
		})
	);
}
