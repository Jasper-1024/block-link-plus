import { EditorState, type Text, type Transaction, type TransactionSpec } from "@codemirror/state";
import { editorInfoField } from "obsidian";
import { DateTime } from "luxon";
import type BlockLinkPlus from "../../main";
import { generateRandomId } from "../../utils";
import { isEnhancedListEnabledFile } from "./enable-scope";
import {
	clampTabSize,
	indentCols,
	leadingIndentText,
	normalizeLineLeadingIndentTabsToSpaces,
	MARKDOWN_TAB_WIDTH,
} from "./indent-utils";

export type DirtyRange = { from: number; to: number };

const dirtyRangesByPath = new Map<string, DirtyRange[]>();

function mergeRanges(ranges: DirtyRange[]): DirtyRange[] {
	if (ranges.length === 0) return [];

	const sorted = [...ranges].sort((a, b) => a.from - b.from);
	const merged: DirtyRange[] = [];

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

function clampPos(pos: number, docLen: number): number {
	if (!Number.isFinite(pos)) return 0;
	return Math.max(0, Math.min(docLen, Math.floor(pos)));
}

export function consumeEnhancedListDirtyRanges(filePath: string): DirtyRange[] {
	const ranges = dirtyRangesByPath.get(filePath) ?? [];
	dirtyRangesByPath.delete(filePath);
	return ranges;
}

export function clearEnhancedListDirtyRanges(filePath: string): void {
	dirtyRangesByPath.delete(filePath);
}

export function createEnhancedListDirtyRangeTrackerExtension(plugin: BlockLinkPlus) {
	return EditorState.transactionFilter.of(
		(tr: Transaction): Transaction | readonly TransactionSpec[] => {
			if (!tr.docChanged) return tr;

			const info = tr.startState.field(editorInfoField, false);
			const file = info?.file as any;
			if (!file) return tr;
			if (!isEnhancedListEnabledFile(plugin, file)) return tr;

			const filePath = String(file.path ?? "");
			if (!filePath) return tr;

			const prev = dirtyRangesByPath.get(filePath) ?? [];
			const mappedPrev: DirtyRange[] = prev
				.map((r) => {
					const from = clampPos(tr.changes.mapPos(r.from, 1), tr.newDoc.length);
					const to = clampPos(tr.changes.mapPos(r.to, -1), tr.newDoc.length);
					return { from: Math.min(from, to), to: Math.max(from, to) };
				})
				.filter((r) => r.to >= r.from);

			const next: DirtyRange[] = [];
			tr.changes.iterChangedRanges((_fromA, _toA, fromB, toB) => {
				const from = clampPos(fromB, tr.newDoc.length);
				const to = clampPos(toB, tr.newDoc.length);
				next.push({ from: Math.min(from, to), to: Math.max(from, to) });
			});

			dirtyRangesByPath.set(filePath, mergeRanges([...mappedPrev, ...next]));

			return tr;
		}
	);
}

const SYSTEM_LINE_EXACT_RE =
	/^(\s*)\[date::\s*(\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2})\]\s*\^([a-zA-Z0-9_-]+)\s*$/;

const SYSTEM_LINE_DATE_ONLY_RE =
	/^(\s*)\[date::\s*(\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2})\]\s*$/;

const SYSTEM_LINE_ID_ONLY_RE = /^(\s*)\^([a-zA-Z0-9_-]+)\s*$/;

const LIST_ITEM_PREFIX_RE =
	/^(\s*)(?:([-*+])|(\d+\.))\s+(?:\[(?: |x|X)\]\s+)?/;

const BLOCK_ID_AT_END_RE = /\s*\^([a-zA-Z0-9_-]+)\s*$/;

const FENCE_LINE_REGEX = /^(\s*)(```+|~~~+).*/;

function escapeRegex(s: string): string {
	return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function formatSystemDate(dt: DateTime): string {
	return dt.toFormat("yyyy-MM-dd'T'HH:mm:ss");
}

function computeContinuationIndentFromStartLine(startLineText: string): string | null {
	const m = startLineText.match(LIST_ITEM_PREFIX_RE);
	if (!m) return null;
	const indentPrefix = m[1] ?? "";
	const prefixLenWithoutIndent = m[0].length - indentPrefix.length;
	return indentPrefix + " ".repeat(prefixLenWithoutIndent);
}

function buildFenceStateMap(lines: string[]): Map<number, boolean> {
	const inFenceByLine = new Map<number, boolean>();

	let inFence = false;
	let fenceChar = "";
	let fenceLen = 0;
	let openedAtLineNo = 0;

	for (let ln = 1; ln <= lines.length; ln++) {
		const text = lines[ln - 1] ?? "";

		if (!inFence) {
			const m = text.match(FENCE_LINE_REGEX);
			if (m) {
				inFence = true;
				fenceChar = (m[2] ?? "")[0] ?? "";
				fenceLen = (m[2] ?? "").length;
				openedAtLineNo = ln;
			}
		}

		inFenceByLine.set(ln, inFence);

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

	return inFenceByLine;
}

function isFenceMarkerLine(text: string): boolean {
	return FENCE_LINE_REGEX.test(text);
}

function findOwningListStartLineIndex(
	lines: string[],
	lineIndex: number,
	tabSize: number,
	fenceMap: Map<number, boolean>
): number | null {
	const touchedLineNo = lineIndex + 1;
	const touchedText = lines[lineIndex] ?? "";
	const touchedInFence = fenceMap.get(touchedLineNo) ?? false;

	if (!touchedInFence && LIST_ITEM_PREFIX_RE.test(touchedText)) return lineIndex;

	const touchedIsSystemLine =
		SYSTEM_LINE_EXACT_RE.test(touchedText) ||
		SYSTEM_LINE_DATE_ONLY_RE.test(touchedText) ||
		SYSTEM_LINE_ID_ONLY_RE.test(touchedText);

	const touchedIndentCols = indentCols(leadingIndentText(touchedText), tabSize);
	if (touchedIndentCols <= 0) {
		// Broken-indentation system lines (indent=0) should still be attributed to their owning list item,
		// otherwise cleanup may delete them as "orphan" and we may miss normalizing the right item.
		if (!touchedInFence && touchedIsSystemLine) {
			for (let n = lineIndex - 1; n >= 0; n--) {
				const lineNo = n + 1;
				const text = lines[n] ?? "";
				const inFence = fenceMap.get(lineNo) ?? false;

				// Enhanced List Blocks forbids blank lines inside a list item unless inside a fenced code block.
				if (!inFence && text.trim().length === 0) return null;

				if (!inFence) {
					const m = text.match(LIST_ITEM_PREFIX_RE);
					if (m) {
						const parentIndentCols = indentCols(m[1] ?? "", tabSize);
						const endLineIndex = findListItemEndLineIndex(lines, n, parentIndentCols, tabSize, fenceMap);
						if (lineIndex <= endLineIndex) return n;
						continue;
					}

					// Non-indented, non-list lines end the list context (unless fenced).
					if (indentCols(leadingIndentText(text), tabSize) === 0) return null;
				}
			}
		}
		return null;
	}

	for (let n = lineIndex; n >= 0; n--) {
		const lineNo = n + 1;
		const text = lines[n] ?? "";
		const inFence = fenceMap.get(lineNo) ?? false;

		if (n !== lineIndex && !inFence && text.trim().length === 0) return null;

		if (!inFence) {
			const m = text.match(LIST_ITEM_PREFIX_RE);
			if (m) {
				const parentIndentCols = indentCols(m[1] ?? "", tabSize);
				if (parentIndentCols < touchedIndentCols) return n;
				continue;
			}

			// Non-indented, non-list lines end the list context (unless fenced).
			if (indentCols(leadingIndentText(text), tabSize) === 0) return null;
		}
	}

	return null;
}

function findParentListStartLineIndex(
	lines: string[],
	startLineIndex: number,
	tabSize: number,
	fenceMap: Map<number, boolean>
): number | null {
	const startLineNo = startLineIndex + 1;
	if (fenceMap.get(startLineNo) ?? false) return null;

	const startText = lines[startLineIndex] ?? "";
	const startMatch = startText.match(LIST_ITEM_PREFIX_RE);
	if (!startMatch) return null;

	const startIndentCols = indentCols(startMatch[1] ?? "", tabSize);
	if (startIndentCols <= 0) return null;

	for (let n = startLineIndex - 1; n >= 0; n--) {
		const lineNo = n + 1;
		const text = lines[n] ?? "";
		const inFence = fenceMap.get(lineNo) ?? false;

		if (!inFence && text.trim().length === 0) return null;

		if (!inFence) {
			// Broken indentation system lines shouldn't stop parent discovery.
			if (
				SYSTEM_LINE_EXACT_RE.test(text) ||
				SYSTEM_LINE_DATE_ONLY_RE.test(text) ||
				SYSTEM_LINE_ID_ONLY_RE.test(text)
			) {
				continue;
			}

			const m = text.match(LIST_ITEM_PREFIX_RE);
			if (m) {
				const indentHere = indentCols(m[1] ?? "", tabSize);
				if (indentHere < startIndentCols) return n;
				continue;
			}

			// Non-indented, non-list lines end the list context (unless fenced).
			if (indentCols(leadingIndentText(text), tabSize) === 0) return null;
		}
	}

	return null;
}

function findListItemEndLineIndex(
	lines: string[],
	startLineIndex: number,
	parentIndentCols: number,
	tabSize: number,
	fenceMap: Map<number, boolean>
): number {
	for (let n = startLineIndex + 1; n < lines.length; n++) {
		const lineNo = n + 1;
		const text = lines[n] ?? "";
		const inFence = fenceMap.get(lineNo) ?? false;

		// Enhanced List Blocks forbids blank lines inside a list item unless inside a fenced code block.
		if (!inFence && text.trim().length === 0) return n - 1;

		if (!inFence) {
			// Treat system lines as tolerant continuation lines even when their indentation is broken.
			// This lets save-time normalization fix cases like:
			// - a
			// [date:: ...] ^id
			// - b
			if (
				SYSTEM_LINE_EXACT_RE.test(text) ||
				SYSTEM_LINE_DATE_ONLY_RE.test(text) ||
				SYSTEM_LINE_ID_ONLY_RE.test(text)
			) {
				continue;
			}

			const m = text.match(LIST_ITEM_PREFIX_RE);
			if (m) {
				const indentHere = indentCols(m[1] ?? "", tabSize);
				if (indentHere <= parentIndentCols) return n - 1;
				continue;
			}

			const indentHere = indentCols(leadingIndentText(text), tabSize);
			if (indentHere <= parentIndentCols) return n - 1;
		}
	}

	return Math.max(0, lines.length - 1);
}

function findFirstChildListStartLineIndex(
	lines: string[],
	startLineIndex: number,
	endLineIndex: number,
	parentIndentCols: number,
	tabSize: number,
	fenceMap: Map<number, boolean>
): number | null {
	for (let n = startLineIndex + 1; n <= endLineIndex; n++) {
		const lineNo = n + 1;
		if (fenceMap.get(lineNo) ?? false) continue;

		const text = lines[n] ?? "";
		const m = text.match(LIST_ITEM_PREFIX_RE);
		if (!m) continue;

		const indentHere = indentCols(m[1] ?? "", tabSize);
		if (indentHere > parentIndentCols) return n;
	}

	return null;
}

function findSystemLineInRange(
	lines: string[],
	startLineIndex: number,
	endLineIndex: number,
	fenceMap: Map<number, boolean>
): Array<{ lineIndex: number; indent: string; date: string; id: string }> {
	const out: Array<{ lineIndex: number; indent: string; date: string; id: string }> = [];
	for (let n = startLineIndex; n <= endLineIndex; n++) {
		const lineNo = n + 1;
		const text = lines[n] ?? "";
		const inFence = fenceMap.get(lineNo) ?? false;
		if (inFence && !isFenceMarkerLine(text)) continue;

		const m = text.match(SYSTEM_LINE_EXACT_RE);
		if (!m) continue;
		out.push({ lineIndex: n, indent: m[1] ?? "", date: m[2], id: m[3] });
	}

	return out;
}

function findSystemLineInSubtree(
	lines: string[],
	startLineIndex: number,
	endLineIndex: number,
	tabSize: number,
	fenceMap: Map<number, boolean>,
	expectedIndentCols: number
): Array<{ lineIndex: number; indent: string; date: string; id: string }> {
	const out: Array<{ lineIndex: number; indent: string; date: string; id: string }> = [];
	for (let n = startLineIndex; n <= endLineIndex; n++) {
		const lineNo = n + 1;
		const text = lines[n] ?? "";
		const inFence = fenceMap.get(lineNo) ?? false;
		if (inFence && !isFenceMarkerLine(text)) continue;

		const m = text.match(SYSTEM_LINE_EXACT_RE);
		if (!m) continue;

		// Only consider a system line as belonging to this item if its indentation
		// is not deeper than the parent's continuation indent (children are deeper).
		const indentHereCols = indentCols(m[1] ?? "", tabSize);
		if (indentHereCols > expectedIndentCols + 1) continue;

		out.push({ lineIndex: n, indent: m[1] ?? "", date: m[2], id: m[3] });
	}

	return out;
}

function findExistingBlockIdInParentContent(
	lines: string[],
	startLineIndex: number,
	endLineIndex: number
): string | null {
	for (let n = startLineIndex; n <= endLineIndex; n++) {
		const text = lines[n] ?? "";
		const m = text.match(BLOCK_ID_AT_END_RE);
		if (m?.[1]) return m[1];
	}
	return null;
}

function generateUniqueId(plugin: BlockLinkPlus, fileContent: string): string {
	const prefix = plugin.settings.enable_prefix ? plugin.settings.id_prefix : "";
	const length = plugin.settings.id_length;

	for (let i = 0; i < 50; i++) {
		const id = generateRandomId(prefix, length);
		if (fileContent.includes(`^${id}`)) continue;
		return id;
	}

	// Extremely unlikely fallback: keep trying with a longer random suffix.
	while (true) {
		const id = Math.random().toString(36).slice(2, 10);
		if (fileContent.includes(`^${id}`)) continue;
		return id;
	}
}

function mergeSplitSystemLinesInSubtree(
	lines: string[],
	startLineIndex: number,
	endLineIndex: number,
	tabSize: number,
	fenceMap: Map<number, boolean>,
	expectedIndentCols: number
): { lines: string[]; didChange: boolean } {
	let didChange = false;

	// Mutate `lines` in place. Scan bottom-up so index shifts don't invalidate fenceMap lookups
	// for lines we haven't processed yet.
	for (let n = endLineIndex - 1; n >= startLineIndex; n--) {
		const lineNo = n + 1;
		const nextLineNo = n + 2;

		const text = lines[n] ?? "";
		const next = lines[n + 1] ?? "";

		const inFence = fenceMap.get(lineNo) ?? false;
		const inFenceNext = fenceMap.get(nextLineNo) ?? false;
		if ((inFence && !isFenceMarkerLine(text)) || (inFenceNext && !isFenceMarkerLine(next))) continue;

		const dateMatch = text.match(SYSTEM_LINE_DATE_ONLY_RE);
		if (!dateMatch) continue;

		const dateIndentCols = indentCols(dateMatch[1] ?? "", tabSize);
		if (dateIndentCols > expectedIndentCols + 1) continue;

		const idMatch = next.match(SYSTEM_LINE_ID_ONLY_RE);
		if (!idMatch) continue;

		const idIndentCols = indentCols(idMatch[1] ?? "", tabSize);
		if (idIndentCols > expectedIndentCols + 1) continue;

		lines[n] = `${dateMatch[1] ?? ""}[date:: ${dateMatch[2]}] ^${idMatch[2]}`;
		lines.splice(n + 1, 1);
		didChange = true;
	}

	return { lines, didChange };
}

function insertOrMoveSystemLine(
	lines: string[],
	ops: { deleteLineIndex: number | null; insertBeforeLineIndex: number | null; lineText: string }
): void {
	let insertIndex = ops.insertBeforeLineIndex;

	if (insertIndex === null) {
		// Preserve a single trailing newline when present.
		if (lines.length > 0 && lines[lines.length - 1] === "") {
			insertIndex = lines.length - 1;
		} else {
			insertIndex = lines.length;
		}
	}

	if (ops.deleteLineIndex !== null) {
		const del = ops.deleteLineIndex;
		if (del >= 0 && del < lines.length) {
			lines.splice(del, 1);
			if (del < insertIndex) insertIndex -= 1;
		}
	}

	lines.splice(insertIndex, 0, ops.lineText);
}

export function normalizeEnhancedListContentOnSave(
	content: string,
	plugin: BlockLinkPlus,
	opts: { dirtyRanges: DirtyRange[] }
): string {
	const settings = plugin.settings;
	if (!settings.enhancedListNormalizeOnSave) return content;
	if (!opts.dirtyRanges || opts.dirtyRanges.length === 0) return content;

	// Parse list indentation using Markdown semantics so mixed tab/space content doesn't re-parent list items.
	const parseTabSize = MARKDOWN_TAB_WIDTH;
	// Separate knob: how many spaces a leading tab expands to during normalization.
	// Default is 2 to match the vault default indentation style.
	const normalizeTabSize = clampTabSize(settings.enhancedListNormalizeTabSize, 2);
	let lines = content.split("\n");

	// Convert dirty ranges (doc positions) to touched list item start lines.
	const doc = EditorState.create({ doc: content }).doc as Text;
	const touchedStartLines = new Set<number>();

	const initialFenceMap = buildFenceStateMap(lines);

	for (const r of opts.dirtyRanges) {
		const from = clampPos(r.from, doc.length);
		const to = clampPos(r.to, doc.length);

		const startLineNo = doc.lineAt(from).number;
		const endLineNo = doc.lineAt(to).number;

		for (let ln = startLineNo; ln <= endLineNo; ln++) {
			const idx = ln - 1;
			if (idx < 0 || idx >= lines.length) continue;
			const owner = findOwningListStartLineIndex(lines, idx, parseTabSize, initialFenceMap);
			if (owner != null) {
				touchedStartLines.add(owner);

				// Editing a nested item implicitly changes its ancestor blocks (subtree changed).
				// Include parents so save-time normalization can ensure/move the system line for those blocks too.
				let cursor = owner;
				while (true) {
					const parent = findParentListStartLineIndex(lines, cursor, parseTabSize, initialFenceMap);
					if (parent == null) break;
					if (touchedStartLines.has(parent)) break;
					touchedStartLines.add(parent);
					cursor = parent;
				}
			}
		}
	}

	if (touchedStartLines.size === 0) return content;

	const starts = [...touchedStartLines].sort((a, b) => b - a);

	const ruleTabsToSpaces = settings.enhancedListNormalizeTabsToSpaces === true;
	const ruleCleanupInvalidSystemLines = settings.enhancedListNormalizeCleanupInvalidSystemLines === true;
	const ruleMergeSplit = settings.enhancedListNormalizeMergeSplitSystemLine === true;
	const ruleSystemIndent = settings.enhancedListNormalizeSystemLineIndent === true;
	const ruleEnsureSystemLine = settings.enhancedListNormalizeEnsureSystemLineForTouchedItems === true;

	for (const startLineIndex of starts) {
		if (startLineIndex < 0 || startLineIndex >= lines.length) continue;

		let startIdx = startLineIndex;
		let fenceMap = buildFenceStateMap(lines);

		// Cleanup: remove an orphan system line immediately above the touched list item.
		// This commonly happens when a list item is deleted/edited and a system line is left behind.
		if (ruleCleanupInvalidSystemLines && startIdx > 0) {
			const aboveIndex = startIdx - 1;
			const aboveLineNo = aboveIndex + 1;
			const aboveText = lines[aboveIndex] ?? "";
			const aboveInFence = fenceMap.get(aboveLineNo) ?? false;
			if (!(aboveInFence && !isFenceMarkerLine(aboveText))) {
				const m = aboveText.match(SYSTEM_LINE_EXACT_RE);
				if (m) {
					const owner = findOwningListStartLineIndex(lines, aboveIndex, parseTabSize, fenceMap);
					if (owner == null) {
						lines.splice(aboveIndex, 1);
						startIdx -= 1;
						// Rebuild fenceMap because line numbers shifted.
						fenceMap = buildFenceStateMap(lines);
					}
				}
			}
		}

		const startLineNo = startIdx + 1;
		if (fenceMap.get(startLineNo) ?? false) continue;

		let startLineText = lines[startIdx] ?? "";
		if (!LIST_ITEM_PREFIX_RE.test(startLineText)) continue;

		// Compute boundaries first so we can scope line rewrites to "parent content" (not children).
		let startPrefixMatch = startLineText.match(LIST_ITEM_PREFIX_RE);
		if (!startPrefixMatch) continue;
		let parentIndentCols = indentCols(startPrefixMatch[1] ?? "", parseTabSize);
		let endLineIndex = findListItemEndLineIndex(lines, startIdx, parentIndentCols, parseTabSize, fenceMap);
		let firstChildLineIndex = findFirstChildListStartLineIndex(
			lines,
			startIdx,
			endLineIndex,
			parentIndentCols,
			parseTabSize,
			fenceMap
		);

		// Convert leading indentation tabs to spaces within the touched item's own content area.
		if (ruleTabsToSpaces) {
			const parentContentEnd =
				firstChildLineIndex != null ? Math.max(startIdx, firstChildLineIndex - 1) : endLineIndex;

			// Converting a tab to fewer columns (e.g. tabSize=2) can accidentally "outdent" a list item
			// so it becomes a sibling of its parent. Keep conversion configurable, but avoid breaking
			// list nesting by falling back to Markdown semantics (tab=4 columns) when required.
			const parentStartIdx = findParentListStartLineIndex(lines, startIdx, parseTabSize, fenceMap);
			let parentStartIndentCols = -1;
			if (parentStartIdx != null) {
				const parentText = lines[parentStartIdx] ?? "";
				const parentMatch = parentText.match(LIST_ITEM_PREFIX_RE);
				if (parentMatch) {
					parentStartIndentCols = indentCols(parentMatch[1] ?? "", parseTabSize);
				}
			}

			const startTextBefore = lines[startIdx] ?? "";
			const startCandidate = normalizeLineLeadingIndentTabsToSpaces(startTextBefore, normalizeTabSize);
			if (startCandidate !== startTextBefore) {
				const candidateIndentCols = indentCols(leadingIndentText(startCandidate), parseTabSize);
				if (parentStartIndentCols >= 0 && candidateIndentCols <= parentStartIndentCols) {
					lines[startIdx] = normalizeLineLeadingIndentTabsToSpaces(startTextBefore, parseTabSize);
				} else {
					lines[startIdx] = startCandidate;
				}
			}

			// Recompute the current item's indent after converting its start line (threshold for continuation lines).
			startLineText = lines[startIdx] ?? "";
			startPrefixMatch = startLineText.match(LIST_ITEM_PREFIX_RE);
			if (!startPrefixMatch) continue;
			parentIndentCols = indentCols(startPrefixMatch[1] ?? "", parseTabSize);

			for (let ln = startIdx + 1; ln <= parentContentEnd; ln++) {
				const lineNo = ln + 1;
				const text = lines[ln] ?? "";
				const inFence = fenceMap.get(lineNo) ?? false;
				if (inFence && !isFenceMarkerLine(text)) continue;

				const candidate = normalizeLineLeadingIndentTabsToSpaces(text, normalizeTabSize);
				if (candidate === text) continue;

				// Continuation/content lines must remain indented deeper than the list marker indent.
				const candidateIndentCols = indentCols(leadingIndentText(candidate), parseTabSize);
				if (candidateIndentCols <= parentIndentCols) {
					lines[ln] = normalizeLineLeadingIndentTabsToSpaces(text, parseTabSize);
				} else {
					lines[ln] = candidate;
				}
			}
		}

		// Recompute prefix + continuation indent after potential tab normalization.
		startLineText = lines[startIdx] ?? "";
		startPrefixMatch = startLineText.match(LIST_ITEM_PREFIX_RE);
		if (!startPrefixMatch) continue;
		parentIndentCols = indentCols(startPrefixMatch[1] ?? "", parseTabSize);

		const continuationIndent = computeContinuationIndentFromStartLine(startLineText);
		if (!continuationIndent) continue;
		const expectedIndentCols = indentCols(continuationIndent, parseTabSize);

		// Merge split system line pairs (`[date:: ...]` + `^id`) within the subtree.
		if (ruleMergeSplit) {
			endLineIndex = findListItemEndLineIndex(lines, startIdx, parentIndentCols, parseTabSize, fenceMap);
			mergeSplitSystemLinesInSubtree(lines, startIdx, endLineIndex, parseTabSize, fenceMap, expectedIndentCols);
		}

		// Recompute after merges (line count can change).
		fenceMap = buildFenceStateMap(lines);
		startLineText = lines[startIdx] ?? "";
		startPrefixMatch = startLineText.match(LIST_ITEM_PREFIX_RE);
		if (!startPrefixMatch) continue;
		parentIndentCols = indentCols(startPrefixMatch[1] ?? "", parseTabSize);
		endLineIndex = findListItemEndLineIndex(lines, startIdx, parentIndentCols, parseTabSize, fenceMap);
		firstChildLineIndex = findFirstChildListStartLineIndex(
			lines,
			startIdx,
			endLineIndex,
			parentIndentCols,
			parseTabSize,
			fenceMap
		);

		const desiredInsertBeforeLineIndex =
			firstChildLineIndex ??
			(endLineIndex + 1 < lines.length ? endLineIndex + 1 : null);
		const parentContentEndLineIndex =
			desiredInsertBeforeLineIndex != null ? desiredInsertBeforeLineIndex - 1 : endLineIndex;

		// Cleanup: keep only the first system line inside the edited list item's own content (not children).
		if (ruleCleanupInvalidSystemLines) {
			const systemLinesInContent = findSystemLineInRange(lines, startIdx, parentContentEndLineIndex, fenceMap);
			if (systemLinesInContent.length > 1) {
				// Remove from bottom-up so earlier indices stay valid.
				for (let i = systemLinesInContent.length - 1; i >= 1; i--) {
					lines.splice(systemLinesInContent[i].lineIndex, 1);
				}

				// Recompute because line numbers shifted.
				fenceMap = buildFenceStateMap(lines);
				startLineText = lines[startIdx] ?? "";
				startPrefixMatch = startLineText.match(LIST_ITEM_PREFIX_RE);
				if (!startPrefixMatch) continue;
				parentIndentCols = indentCols(startPrefixMatch[1] ?? "", parseTabSize);
				endLineIndex = findListItemEndLineIndex(lines, startIdx, parentIndentCols, parseTabSize, fenceMap);
				firstChildLineIndex = findFirstChildListStartLineIndex(
					lines,
					startIdx,
					endLineIndex,
					parentIndentCols,
					parseTabSize,
					fenceMap
				);
			}
		}

		const desiredInsertBeforeLineIndexAfterCleanup =
			firstChildLineIndex ??
			(endLineIndex + 1 < lines.length ? endLineIndex + 1 : null);
		const parentContentEndLineIndexAfterCleanup =
			desiredInsertBeforeLineIndexAfterCleanup != null
				? desiredInsertBeforeLineIndexAfterCleanup - 1
				: endLineIndex;

		// Fix indentation for an existing system line that is already in the correct logical place.
		if (ruleSystemIndent) {
			const systemInContent =
				findSystemLineInRange(lines, startIdx, parentContentEndLineIndexAfterCleanup, fenceMap)[0] ?? null;
			if (systemInContent) {
				lines[systemInContent.lineIndex] = `${continuationIndent}[date:: ${systemInContent.date}] ^${systemInContent.id}`;
			}
		}

		if (!ruleEnsureSystemLine) continue;

		const systemLineInContent =
			findSystemLineInRange(lines, startIdx, parentContentEndLineIndexAfterCleanup, fenceMap)[0] ?? null;
		const systemLineAny =
			systemLineInContent ??
			findSystemLineInSubtree(lines, startIdx, endLineIndex, parseTabSize, fenceMap, expectedIndentCols)[0] ??
			null;

		const hasSystemLineInCorrectPlace =
			systemLineInContent &&
			(desiredInsertBeforeLineIndexAfterCleanup === null ||
				systemLineInContent.lineIndex < desiredInsertBeforeLineIndexAfterCleanup);
		if (hasSystemLineInCorrectPlace) continue;

		const fileText = lines.join("\n");
		const systemLineDate = systemLineAny?.date ?? formatSystemDate(DateTime.now());

		const systemLineId =
			systemLineAny?.id ??
			findExistingBlockIdInParentContent(lines, startIdx, parentContentEndLineIndexAfterCleanup) ??
			generateUniqueId(plugin, fileText);

		const normalizedSystemLineText = `${continuationIndent}[date:: ${systemLineDate}] ^${systemLineId}`;

		insertOrMoveSystemLine(lines, {
			deleteLineIndex: systemLineAny?.lineIndex ?? null,
			insertBeforeLineIndex: desiredInsertBeforeLineIndexAfterCleanup,
			lineText: normalizedSystemLineText,
		});
	}

	const next = lines.join("\n");
	return next === content ? content : next;
}
