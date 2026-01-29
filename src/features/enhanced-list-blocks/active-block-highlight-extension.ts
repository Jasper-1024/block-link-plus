import { RangeSetBuilder } from "@codemirror/state";
import { Decoration, ViewPlugin, ViewUpdate } from "@codemirror/view";
import { editorInfoField, editorLivePreviewField } from "obsidian";
import type BlockLinkPlus from "../../main";
import { isEnhancedListEnabledFile } from "./enable-scope";
import { indentCols, lineIndentCols, MARKDOWN_TAB_WIDTH } from "./indent-utils";
import { FENCE_LINE_REGEX, LIST_ITEM_PREFIX_RE, escapeRegex } from "./list-parse";

// Same as LIST_ITEM_PREFIX_RE but stops right after the marker + whitespace.
// Used to align the "active block" highlight to the editable content column (incl. task checkbox).
const LIST_ITEM_MARKER_RE = /^(\s*)(?:([-*+])|(\d+\.))\s+/;

const LOOKBACK_LINES = 500;

function getIndentLen(text: string, tabSize: number): number {
	return lineIndentCols(text, tabSize);
}

type ActiveListBlock = {
	startLineNo: number; // 1-based
	endLineNo: number; // 1-based, inclusive
	bulletLineNo: number; // 1-based
};

function findClosestCmLine(node: any): HTMLElement | null {
	// `domAtPos()` may return a Text node; normalize to an Element before `closest()`.
	const el: Element | null =
		node instanceof Element ? node : (node?.parentElement as Element | null);
	return (el?.closest?.(".cm-line") as HTMLElement | null) ?? null;
}

const ACTIVE_BLOCK_LEFT_VAR = "--blp-enhanced-list-active-block-left";
const ACTIVE_BLOCK_LEFT_PAD_PX = 2;

function measureActiveBlockContentLeftPx(view: any, active: ActiveListBlock): number | null {
	try {
		const bulletLine = view.state.doc.line(active.bulletLineNo);
		const markerMatch = bulletLine.text.match(LIST_ITEM_MARKER_RE);
		if (!markerMatch) return null;

		const domAt = view.domAtPos(bulletLine.from);
		const bulletLineEl = findClosestCmLine(domAt?.node);
		if (!bulletLineEl) return null;

		const lineRect = bulletLineEl.getBoundingClientRect();
		const markerPos = bulletLine.from + markerMatch[0].length;

		// In Live Preview the list marker is rendered via widgets. `coordsAtPos()` gives us the
		// real editable content column (after the marker, before any task checkbox).
		const coords = typeof view.coordsAtPos === "function" ? view.coordsAtPos(markerPos) : null;
		let leftPx: number | null = null;

		if (coords && Number.isFinite(coords.left)) {
			leftPx = coords.left - lineRect.left;
		} else {
			const markerEl = bulletLineEl.querySelector(
				".cm-formatting-list-ul, .cm-formatting-list-ol",
			) as HTMLElement | null;
			if (markerEl) {
				const rect = markerEl.getBoundingClientRect();
				leftPx = rect.right - lineRect.left;
			}
		}

		if (leftPx == null || !Number.isFinite(leftPx)) return null;
		leftPx = Math.max(0, leftPx - ACTIVE_BLOCK_LEFT_PAD_PX);
		if (leftPx < ACTIVE_BLOCK_LEFT_PAD_PX) return null;
		return Math.max(0, Math.min(2000, leftPx));
	} catch {
		return null;
	}
}

function updateActiveBlockLeftOffsetVar(view: any, active: ActiveListBlock | null) {
	const root = view?.dom as HTMLElement | null;
	if (!root?.style) return;

	if (!active) {
		root.style.removeProperty(ACTIVE_BLOCK_LEFT_VAR);
		return;
	}

	const existingRaw = root.style.getPropertyValue(ACTIVE_BLOCK_LEFT_VAR).trim();
	const existingNum = Number.parseFloat(existingRaw);
	const shouldSeedFallback = existingRaw.length === 0 || !Number.isFinite(existingNum) || existingNum <= 0;

	// `coordsAtPos()` can return transient/incorrect values during the same update cycle that moves
	// the selection (Obsidian Live Preview widgets/layout settle across a measure pass). Schedule a
	// measure so we can update the highlight start to the real content column.
	if (typeof view.requestMeasure === "function") {
		const bulletLineNo = active.bulletLineNo;
		let filePath: string | null = null;
		try {
			const info = view.state.field(editorInfoField, false);
			filePath = info?.file?.path ?? null;
		} catch {
			filePath = null;
		}

		view.requestMeasure({
			key: "blp-active-block-left",
			read: (v: any) => {
				const measuredActive = { ...active, bulletLineNo };
				const leftPx = measureActiveBlockContentLeftPx(v, measuredActive);
				return { filePath, bulletLineNo, leftPx };
			},
			write: (m: any, v: any) => {
				const r = v?.dom as HTMLElement | null;
				if (!r?.style) return;

				// Ignore stale measures after selection/file changes.
				try {
					const info = v.state.field(editorInfoField, false);
					const currentPath = info?.file?.path ?? null;
					if (m?.filePath != null && currentPath !== m.filePath) return;
				} catch {
					// ignore
				}

				const left = m?.leftPx;
				if (left == null || !Number.isFinite(left)) return;

				const next = `${Math.round(left * 100) / 100}px`;
				const current = r.style.getPropertyValue(ACTIVE_BLOCK_LEFT_VAR);
				if (current !== next) r.style.setProperty(ACTIVE_BLOCK_LEFT_VAR, next);
			},
		});
	}

	let leftPx: number | null = null;

	// Text-based fallback (works in tests / minimal DOM environments).
	if (shouldSeedFallback && (leftPx === null || !Number.isFinite(leftPx))) {
		try {
			const bulletLine = view.state.doc.line(active.bulletLineNo);
			const m = bulletLine.text.match(LIST_ITEM_MARKER_RE);
			if (m) {
				const markerLen = m[0].length;
				const cwRaw = Number.isFinite(view?.defaultCharacterWidth) ? view.defaultCharacterWidth : 0;
				const cw = cwRaw > 0 ? cwRaw : 8;
				leftPx = Math.max(0, markerLen * cw - ACTIVE_BLOCK_LEFT_PAD_PX);
			}
		} catch {
			// ignore
		}
	}

	if (leftPx === null || !Number.isFinite(leftPx)) leftPx = 0;
	leftPx = Math.max(0, Math.min(2000, leftPx));

	const next = `${Math.round(leftPx * 100) / 100}px`;
	if (shouldSeedFallback) {
		const current = root.style.getPropertyValue(ACTIVE_BLOCK_LEFT_VAR);
		if (current !== next) root.style.setProperty(ACTIVE_BLOCK_LEFT_VAR, next);
	}
}

function buildFenceStateMap(doc: any, fromLineNo: number, toLineNo: number): Map<number, boolean> {
	const inFenceByLine = new Map<number, boolean>();

	let inFence = false;
	let fenceChar = "";
	let fenceLen = 0;
	let openedAtLineNo = 0;

	for (let ln = fromLineNo; ln <= toLineNo; ln++) {
		const text: string = doc.line(ln).text;

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

function findActiveListBulletLine(
	doc: any,
	cursorLineNo: number,
	tabSize: number
): { lineNo: number; indentLen: number } | null {
	const scanStartLineNo = Math.max(1, cursorLineNo - LOOKBACK_LINES);
	const fenceMap = buildFenceStateMap(doc, scanStartLineNo, cursorLineNo);

	for (let ln = cursorLineNo; ln >= 1; ln--) {
		const text: string = doc.line(ln).text;
		const inFence = fenceMap.get(ln) ?? false;

		// Blank lines end an Enhanced List block unless they're inside a fenced code block.
		if (!inFence && text.trim().length === 0) return null;

		if (!inFence) {
			const m = text.match(LIST_ITEM_PREFIX_RE);
			if (m) {
				return { lineNo: ln, indentLen: indentCols(m[1] ?? "", tabSize) };
			}

			// If we hit a non-indented, non-list line, we're outside any list item.
			if (getIndentLen(text, tabSize) === 0) return null;
		}
	}

	return null;
}

function findActiveListBlock(doc: any, head: number, tabSize: number): ActiveListBlock | null {
	const cursorLine = doc.lineAt(head);
	const cursorLineNo = cursorLine.number;

	const bullet = findActiveListBulletLine(doc, cursorLineNo, tabSize);
	if (!bullet) return null;

	const startLineNo = bullet.lineNo;
	const parentIndentLen = bullet.indentLen;

	let endLineNo = startLineNo;

	let inFence = false;
	let fenceChar = "";
	let fenceLen = 0;
	let openedAtLineNo = 0;

	for (let ln = startLineNo + 1; ln <= doc.lines; ln++) {
		const text: string = doc.line(ln).text;

		if (!inFence) {
			const fenceMatch = text.match(FENCE_LINE_REGEX);
			if (fenceMatch) {
				inFence = true;
				fenceChar = (fenceMatch[2] ?? "")[0] ?? "";
				fenceLen = (fenceMatch[2] ?? "").length;
				openedAtLineNo = ln;
			}

			// Enhanced List Blocks forbids blank lines inside a list item; treat blanks as a boundary.
			if (text.trim().length === 0) {
				endLineNo = ln - 1;
				break;
			}

			// Next list item (child or sibling) starts here; current "block content" ends above.
			if (LIST_ITEM_PREFIX_RE.test(text)) {
				endLineNo = ln - 1;
				break;
			}

			// Continuation/content lines MUST be indented deeper than the list marker indent.
			if (getIndentLen(text, tabSize) <= parentIndentLen) {
				endLineNo = ln - 1;
				break;
			}
		}

		// Never treat blank lines or `- foo` within a fenced code block as an item boundary.
		if (inFence) {
			const closeRe = new RegExp(`^\\s*${escapeRegex(fenceChar)}{${fenceLen},}\\s*$`);
			if (fenceChar && fenceLen >= 3 && ln !== openedAtLineNo && closeRe.test(text)) {
				inFence = false;
				fenceChar = "";
				fenceLen = 0;
				openedAtLineNo = 0;
			}
		}

		endLineNo = ln;
	}

	return { startLineNo, endLineNo, bulletLineNo: startLineNo };
}

function buildDecorations(view: any, plugin: BlockLinkPlus) {
	const builder = new RangeSetBuilder<Decoration>();

	try {
		if (view.state.field?.(editorLivePreviewField, false) !== true) {
			updateActiveBlockLeftOffsetVar(view, null);
			return builder.finish();
		}
	} catch {
		updateActiveBlockLeftOffsetVar(view, null);
		return builder.finish();
	}

	const info = view.state.field(editorInfoField, false);
	const file = info?.file;
	if (!file) {
		updateActiveBlockLeftOffsetVar(view, null);
		return builder.finish();
	}
	if (!isEnhancedListEnabledFile(plugin, file)) {
		updateActiveBlockLeftOffsetVar(view, null);
		return builder.finish();
	}

	const tabSize = MARKDOWN_TAB_WIDTH;
	const head = view.state.selection.main.head;
	const active = findActiveListBlock(view.state.doc, head, tabSize);
	if (!active) {
		updateActiveBlockLeftOffsetVar(view, null);
		return builder.finish();
	}

	updateActiveBlockLeftOffsetVar(view, active);

	const bulletDeco = Decoration.line({
		class: "blp-enhanced-list-active-block blp-enhanced-list-active-bullet",
	});
	const blockDeco = Decoration.line({ class: "blp-enhanced-list-active-block" });

	for (const { from, to } of view.visibleRanges) {
		let pos = from;
		while (pos <= to) {
			const line = view.state.doc.lineAt(pos);
			if (line.number >= active.startLineNo && line.number <= active.endLineNo) {
				builder.add(line.from, line.from, line.number === active.bulletLineNo ? bulletDeco : blockDeco);
			}
			pos = line.to + 1;
		}
	}

	return builder.finish();
}

export function createEnhancedListActiveBlockHighlightExtension(plugin: BlockLinkPlus) {
	return ViewPlugin.fromClass(
		class {
			decorations: any;

			constructor(view: any) {
				this.decorations = buildDecorations(view, plugin);
			}

			update(update: ViewUpdate) {
				// Recompute on selection moves as well so block highlight persists when the caret
				// is on continuation lines (e.g., code fences, hidden system lines).
				if (update.selectionSet || update.docChanged || update.viewportChanged) {
					this.decorations = buildDecorations(update.view, plugin);
				}
			}
		},
		{ decorations: (v) => v.decorations },
	);
}
