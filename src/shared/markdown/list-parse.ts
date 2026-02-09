import { indentCols, leadingIndentText } from "./indent-utils";

// Shared parsing helpers for list-based features (outliner, etc).

// Matches the start of a Markdown list item (ul/ol) including optional task checkbox.
export const LIST_ITEM_PREFIX_RE =
	/^(\s*)(?:([-*+])|(\d+\.))\s+(?:\[(?: |x|X)\]\s+)?/;

// Matches fenced code block markers. Treat content inside fences as opaque.
export const FENCE_LINE_REGEX = /^(\s*)(```+|~~~+).*/;

export const BLOCK_ID_AT_END_RE = /\s*\^([a-zA-Z0-9_-]+)\s*$/;

export function escapeRegex(s: string): string {
	return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export function isFenceMarkerLine(text: string): boolean {
	return FENCE_LINE_REGEX.test(text);
}

export type ListItemPrefixInfo = {
	indentText: string;
	indentLen: number;
	indentCols: number;
	markerText: string;
	markerLen: number;
	prefixText: string;
	prefixLen: number;
};

export function parseListItemPrefix(text: string, tabSize: number): ListItemPrefixInfo | null {
	const m = text.match(LIST_ITEM_PREFIX_RE);
	if (!m) return null;

	const indentText = m[1] ?? "";
	const markerText = (m[2] ?? m[3] ?? "").toString();
	if (!markerText) return null;

	return {
		indentText,
		indentLen: indentText.length,
		indentCols: indentCols(indentText, tabSize),
		markerText,
		markerLen: markerText.length,
		prefixText: m[0] ?? "",
		prefixLen: (m[0] ?? "").length,
	};
}

export function getListItemPrefixLength(text: string): number | null {
	const m = text.match(LIST_ITEM_PREFIX_RE);
	if (!m) return null;
	return (m[0] ?? "").length;
}

export function isEmptyListItemLine(text: string): { prefixLen: number; indentLen: number } | null {
	const m = text.match(LIST_ITEM_PREFIX_RE);
	if (!m) return null;
	const prefixLen = (m[0] ?? "").length;
	if (text.slice(prefixLen).trim().length !== 0) return null;
	return { prefixLen, indentLen: (m[1] ?? "").length };
}

export function computeContinuationIndentFromStartLine(startLineText: string): string | null {
	const m = startLineText.match(LIST_ITEM_PREFIX_RE);
	if (!m) return null;
	const indentPrefix = m[1] ?? "";
	const prefixLenWithoutIndent = (m[0] ?? "").length - indentPrefix.length;
	return indentPrefix + " ".repeat(Math.max(0, prefixLenWithoutIndent));
}

type DocLike = { lines: number; line: (n: number) => { text: string } };

export function buildFenceStateMapFromDoc(doc: DocLike): boolean[] {
	const inFenceByLineNo: boolean[] = new Array(Math.max(0, doc.lines) + 1).fill(false);

	let inFence = false;
	let fenceChar = "";
	let fenceLen = 0;
	let openedAtLineNo = 0;

	for (let ln = 1; ln <= doc.lines; ln++) {
		const text = doc.line(ln).text ?? "";

		if (!inFence) {
			// Markdown allows fenced code blocks to start at the beginning of a list item:
			// `- ```lang` / `1. ```lang` (and even task items like `- [ ] ```lang`).
			// Many list-based features (outliner, etc) rely on fences being treated as opaque,
			// so the fence detector MUST look past the list-item marker.
			const prefixLen = getListItemPrefixLength(text);
			const fenceText = prefixLen !== null ? text.slice(prefixLen) : text;

			const m = fenceText.match(FENCE_LINE_REGEX);
			if (m) {
				inFence = true;
				fenceChar = (m[2] ?? "")[0] ?? "";
				fenceLen = (m[2] ?? "").length;
				openedAtLineNo = ln;
			}
		}

		inFenceByLineNo[ln] = inFence;

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

	return inFenceByLineNo;
}

export function buildFenceStateMapFromLines(lines: string[]): boolean[] {
	const doc: DocLike = {
		lines: lines.length,
		line: (n: number) => ({ text: lines[n - 1] ?? "" }),
	};
	return buildFenceStateMapFromDoc(doc);
}

export function isListContextBarrierLine(text: string, opts: { targetIndentCols: number; tabSize: number }): boolean {
	// Blank line always breaks list context for features that operate on "adjacent list items".
	if (text.trim().length === 0) return true;

	// A non-list line at or above the target indent breaks the list context.
	if (!LIST_ITEM_PREFIX_RE.test(text)) {
		const cols = indentCols(leadingIndentText(text), opts.tabSize);
		return cols <= opts.targetIndentCols;
	}

	return false;
}

