import { FENCE_LINE_REGEX, LIST_ITEM_PREFIX_RE, escapeRegex } from "../../shared/markdown/list-parse";

export type OutlinerBlockMarkdownIssueKind = "list" | "heading";

export type OutlinerBlockMarkdownIssue = {
	kind: OutlinerBlockMarkdownIssueKind;
	lineNo: number; // 1-based
	line: string;
};

export type OutlinerBlockMarkdownSanitizeResult = {
	sanitized: string;
	issues: OutlinerBlockMarkdownIssue[];
	hasListIssue: boolean;
	hasHeadingIssue: boolean;
};

// ATX headings: allow up to 3 leading spaces, and require a space (or EOL) after the hashes.
const HEADING_LINE_RE = /^\s{0,3}#{1,6}(?:\s+|$)/;

function escapeListMarkerLine(line: string): string {
	// Unordered list markers: escape the marker token while preserving indentation.
	const ul = line.match(/^(\s*)[-*+](\s+)/);
	if (ul) {
		const indentLen = (ul[1] ?? "").length;
		return `${line.slice(0, indentLen)}\\${line.slice(indentLen)}`;
	}

	// Ordered list markers: escape the dot while preserving indentation.
	if (/^\s*\d+\.\s+/.test(line)) {
		return line.replace(/^(\s*)(\d+)\.(\s+)/, "$1$2\\.$3");
	}

	return line;
}

function escapeHeadingLine(line: string): string {
	// Escape the first `#` so it can't become an ATX heading.
	return line.replace(/^(\s{0,3})(#{1,6})/, "$1\\$2");
}

/**
 * Detect and sanitize block-internal Markdown constructs that should not become nested structure
 * inside a single outliner block (lists/headings). Fenced code blocks are treated as opaque.
 */
export function sanitizeOutlinerBlockMarkdownForDisplay(text: string): OutlinerBlockMarkdownSanitizeResult {
	const normalized = String(text ?? "").replace(/\r\n/g, "\n").replace(/\r/g, "\n");
	const lines = normalized.split("\n");

	const outLines: string[] = [];
	const issues: OutlinerBlockMarkdownIssue[] = [];

	let hasListIssue = false;
	let hasHeadingIssue = false;

	let inFence = false;
	let fenceChar = "";
	let fenceLen = 0;
	let openedAtLineNo = 0;

	for (let i = 0; i < lines.length; i++) {
		const lineNo = i + 1;
		const raw = lines[i] ?? "";

		if (!inFence) {
			let next = raw;

			if (LIST_ITEM_PREFIX_RE.test(raw)) {
				hasListIssue = true;
				issues.push({ kind: "list", lineNo, line: raw });
				next = escapeListMarkerLine(next);
			}

			// Run after list escaping so a line can't be both a list marker and a heading.
			if (HEADING_LINE_RE.test(raw)) {
				hasHeadingIssue = true;
				issues.push({ kind: "heading", lineNo, line: raw });
				next = escapeHeadingLine(next);
			}

			outLines.push(next);

			// Fence detection is based on the sanitized line so invalid constructs like `- ````
			// don't accidentally suppress validation for subsequent lines.
			const m = next.match(FENCE_LINE_REGEX);
			if (m) {
				inFence = true;
				fenceChar = String(m[2] ?? "")[0] ?? "";
				fenceLen = String(m[2] ?? "").length;
				openedAtLineNo = lineNo;
			}

			continue;
		}

		// Inside fences: keep content opaque.
		outLines.push(raw);

		// Fence close detection.
		if (fenceChar && fenceLen >= 3 && lineNo !== openedAtLineNo) {
			const closeRe = new RegExp(`^\\s*${escapeRegex(fenceChar)}{${fenceLen},}\\s*$`);
			if (closeRe.test(raw)) {
				inFence = false;
				fenceChar = "";
				fenceLen = 0;
				openedAtLineNo = 0;
			}
		}
	}

	return {
		sanitized: outLines.join("\n"),
		issues,
		hasListIssue,
		hasHeadingIssue,
	};
}

