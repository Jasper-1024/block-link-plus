// NOTE: Markdown indentation semantics:
// a tab advances to the next 4-column stop. Do not use editor tabSize here.

export const MARKDOWN_TAB_WIDTH = 4;

export function clampTabSize(raw: unknown, fallback = 4): number {
	const n = typeof raw === "number" ? raw : Number.NaN;
	if (!Number.isFinite(n) || n <= 0) return fallback;
	return Math.max(1, Math.floor(n));
}

export function leadingIndentText(text: string): string {
	return text.match(/^\s*/)?.[0] ?? "";
}

export function indentCols(indentText: string, tabSize: number): number {
	let col = 0;
	const ts = clampTabSize(tabSize, 4);

	for (const ch of indentText) {
		if (ch === "\t") {
			// Advance to next tab stop.
			col += ts - (col % ts);
			continue;
		}

		// Treat all other whitespace as 1 column.
		col += 1;
	}

	return col;
}

export function lineIndentCols(text: string, tabSize: number): number {
	return indentCols(leadingIndentText(text), tabSize);
}

export function expandIndentTabsToSpaces(indentText: string, tabSize: number): string {
	let col = 0;
	const ts = clampTabSize(tabSize, 4);
	let out = "";

	for (const ch of indentText) {
		if (ch === "\t") {
			const step = ts - (col % ts);
			out += " ".repeat(step);
			col += step;
			continue;
		}

		out += ch;
		col += 1;
	}

	return out;
}

export function normalizeLineLeadingIndentTabsToSpaces(text: string, tabSize: number): string {
	const indent = leadingIndentText(text);
	if (!indent.includes("\t")) return text;
	const normalizedIndent = expandIndentTabsToSpaces(indent, tabSize);
	return normalizedIndent + text.slice(indent.length);
}

