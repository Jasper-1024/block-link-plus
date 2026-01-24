import { RangeSetBuilder } from "@codemirror/state";
import { Decoration, ViewPlugin, ViewUpdate } from "@codemirror/view";
import { editorInfoField, editorLivePreviewField } from "obsidian";
import type BlockLinkPlus from "../../main";
import { isEnhancedListEnabledFile } from "./enable-scope";

// Detect a Markdown list item prefix (bullet or ordered), including optional task checkbox.
const LIST_ITEM_PREFIX_RE = /^(\s*)(?:([-*+])|(\d+\.))\s+(?:\[(?: |x|X)\]\s+)?/;

// Detect fenced code blocks so we don't misinterpret `- foo` lines inside code fences as list items.
const FENCE_LINE_REGEX = /^(\s*)(```+|~~~+).*/;
const LOOKBACK_LINES = 500;

function escapeRegex(s: string): string {
	return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function getIndentLen(text: string): number {
	return (text.match(/^\s*/)?.[0] ?? "").length;
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

function updateActiveBlockLeftOffsetVar(view: any, active: ActiveListBlock | null) {
	const root = view?.dom as HTMLElement | null;
	if (!root?.style) return;

	if (!active) {
		root.style.removeProperty("--blp-enhanced-list-active-block-left");
		return;
	}

	let leftPx: number | null = null;

	try {
		const bulletLine = view.state.doc.line(active.bulletLineNo);
		const domAt = view.domAtPos(bulletLine.from);
		const bulletLineEl = findClosestCmLine(domAt?.node);
		if (!bulletLineEl) throw new Error("no bullet line element");

		const lineRect = bulletLineEl.getBoundingClientRect();

		const bulletEl = bulletLineEl.querySelector(
			".cm-formatting-list-ul .list-bullet, .cm-formatting-list-ol .list-bullet",
		) as HTMLElement | null;

		if (bulletEl) {
			const bulletRect = bulletEl.getBoundingClientRect();
			const after = getComputedStyle(bulletEl, "::after");
			const afterW = parseFloat(after.width || "0");
			const afterLeft = parseFloat(after.left || "0");

			// Prefer the pseudo-element dot left edge when present; fall back to the span box.
			const dotLeftClient =
				afterW > 0 && Number.isFinite(afterLeft)
					? bulletRect.left + afterLeft
					: bulletRect.left;
			leftPx = dotLeftClient - lineRect.left;
		}
	} catch {
		// Ignore DOM/layout failures; we have a text-based fallback below.
	}

	// Text-based fallback (works in tests / minimal DOM environments).
	if (leftPx === null || !Number.isFinite(leftPx)) {
		try {
			const bulletLine = view.state.doc.line(active.bulletLineNo);
			const m = bulletLine.text.match(LIST_ITEM_PREFIX_RE);
			if (m) {
				const indentLen = (m[1] ?? "").length;
				const cw = Number.isFinite(view?.defaultCharacterWidth) ? view.defaultCharacterWidth : 0;
				leftPx = indentLen * cw;
			}
		} catch {
			// ignore
		}
	}

	if (leftPx === null || !Number.isFinite(leftPx)) leftPx = 0;
	leftPx = Math.max(0, Math.min(2000, leftPx));

	const next = `${Math.round(leftPx * 100) / 100}px`;
	const current = root.style.getPropertyValue("--blp-enhanced-list-active-block-left");
	if (current !== next) root.style.setProperty("--blp-enhanced-list-active-block-left", next);
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

function findActiveListBulletLine(doc: any, cursorLineNo: number): { lineNo: number; indentLen: number } | null {
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
				return { lineNo: ln, indentLen: (m[1] ?? "").length };
			}

			// If we hit a non-indented, non-list line, we're outside any list item.
			if (getIndentLen(text) === 0) return null;
		}
	}

	return null;
}

function findActiveListBlock(doc: any, head: number): ActiveListBlock | null {
	const cursorLine = doc.lineAt(head);
	const cursorLineNo = cursorLine.number;

	const bullet = findActiveListBulletLine(doc, cursorLineNo);
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
			if (getIndentLen(text) <= parentIndentLen) {
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

	const head = view.state.selection.main.head;
	const active = findActiveListBlock(view.state.doc, head);
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
