import { DateTime } from "luxon";
import type BlockLinkPlus from "../../main";
import { generateRandomId } from "../../utils";

type EditorPos = { line: number; ch: number };

type EditorLike = {
	getValue: () => string;
	getLine: (line: number) => string;
	getCursor: (which?: "from" | "to") => EditorPos;
	replaceRange: (replacement: string, from: EditorPos, to?: EditorPos) => void;
};

const SYSTEM_LINE_EXACT_RE =
	/^(\s*)\[date::\s*(\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2})\]\s*\^([a-zA-Z0-9_-]+)\s*$/;

const LIST_ITEM_PREFIX_RE =
	/^(\s*)(?:([-*+])|(\d+\.))\s+(?:\[(?: |x|X)\]\s+)?/;

const BLOCK_ID_AT_END_RE = /\s*\^([a-zA-Z0-9_-]+)\s*$/;

function hasEditorApi(editor: any): editor is EditorLike {
	return (
		editor &&
		typeof editor.getValue === "function" &&
		typeof editor.getLine === "function" &&
		typeof editor.getCursor === "function" &&
		typeof editor.replaceRange === "function"
	);
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

function getIndentLen(text: string): number {
	return (text.match(/^\s*/)?.[0] ?? "").length;
}

function findListItemEndLineIndex(lines: string[], startLineIndex: number, parentIndentLen: number): number {
	for (let n = startLineIndex + 1; n < lines.length; n++) {
		const text = lines[n] ?? "";

		// Enhanced List Blocks forbids blank lines inside a list item. Treat blanks as an item boundary.
		if (text.trim().length === 0) return n - 1;

		const m = text.match(LIST_ITEM_PREFIX_RE);
		if (m) {
			const indentLen = (m[1] ?? "").length;
			// Next sibling (same indent) or ancestor (smaller indent) starts here; current item ends above.
			if (indentLen <= parentIndentLen) return n - 1;
			continue;
		}

		const indentLen = getIndentLen(text);
		// Continuation/content lines MUST be indented deeper than the list marker indent.
		if (indentLen <= parentIndentLen) return n - 1;
	}

	return Math.max(0, lines.length - 1);
}

function findFirstChildListStartLineIndex(
	lines: string[],
	startLineIndex: number,
	endLineIndex: number,
	parentIndentLen: number
): number | null {
	for (let n = startLineIndex + 1; n <= endLineIndex; n++) {
		const text = lines[n] ?? "";
		const m = text.match(LIST_ITEM_PREFIX_RE);
		if (!m) continue;

		const indentLen = (m[1] ?? "").length;
		if (indentLen > parentIndentLen) return n;
	}
	return null;
}

function findSystemLine(
	lines: string[],
	startLineIndex: number,
	endLineIndex: number
): { lineIndex: number; date: string; id: string } | null {
	for (let n = startLineIndex; n <= endLineIndex; n++) {
		const text = lines[n] ?? "";
		const m = text.match(SYSTEM_LINE_EXACT_RE);
		if (!m) continue;
		return { lineIndex: n, date: m[2], id: m[3] };
	}
	return null;
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

function deleteLine(editor: EditorLike, lineIndex: number): void {
	const lines = editor.getValue().split("\n");
	if (lineIndex < 0 || lineIndex >= lines.length) return;

	if (lineIndex + 1 < lines.length) {
		editor.replaceRange("", { line: lineIndex, ch: 0 }, { line: lineIndex + 1, ch: 0 });
		return;
	}

	// Last line: remove the preceding line break as well (when possible) to avoid leaving a trailing blank line.
	if (lineIndex === 0) {
		editor.replaceRange("", { line: 0, ch: 0 }, { line: 0, ch: (lines[0] ?? "").length });
		return;
	}

	const prevLineLen = (lines[lineIndex - 1] ?? "").length;
	const lineLen = (lines[lineIndex] ?? "").length;
	editor.replaceRange("", { line: lineIndex - 1, ch: prevLineLen }, { line: lineIndex, ch: lineLen });
}

function insertLineBefore(editor: EditorLike, lineIndex: number, lineText: string): void {
	editor.replaceRange(`${lineText}\n`, { line: lineIndex, ch: 0 }, { line: lineIndex, ch: 0 });
}

function appendLine(editor: EditorLike, lineText: string): void {
	const lines = editor.getValue().split("\n");
	const lastLineIndex = Math.max(0, lines.length - 1);
	const lastLineText = lines[lastLineIndex] ?? "";
	editor.replaceRange(`\n${lineText}`, { line: lastLineIndex, ch: lastLineText.length });
}

function applyLineEdit(
	editor: EditorLike,
	edit: { deleteLineIndex: number | null; insertBeforeLineIndex: number | null; lineText: string }
): void {
	let { deleteLineIndex, insertBeforeLineIndex } = edit;

	if (deleteLineIndex !== null && insertBeforeLineIndex !== null && deleteLineIndex < insertBeforeLineIndex) {
		deleteLine(editor, deleteLineIndex);
		insertBeforeLineIndex -= 1;
		insertLineBefore(editor, insertBeforeLineIndex, edit.lineText);
		return;
	}

	if (insertBeforeLineIndex !== null) {
		insertLineBefore(editor, insertBeforeLineIndex, edit.lineText);
		if (deleteLineIndex !== null && deleteLineIndex >= insertBeforeLineIndex) {
			deleteLineIndex += 1;
		}
		if (deleteLineIndex !== null) {
			deleteLine(editor, deleteLineIndex);
		}
		return;
	}

	if (deleteLineIndex !== null) {
		deleteLine(editor, deleteLineIndex);
	}
	appendLine(editor, edit.lineText);
}

export function ensureEnhancedListSystemLineForActiveListItem(plugin: BlockLinkPlus, editor: any): string | null {
	if (!hasEditorApi(editor)) return null;

	const startLineIndex = editor.getCursor("to").line;
	const startLineText = editor.getLine(startLineIndex);
	const startPrefixMatch = startLineText.match(LIST_ITEM_PREFIX_RE);
	if (!startPrefixMatch) return null;

	const parentIndentLen = (startPrefixMatch[1] ?? "").length;
	const continuationIndent = computeContinuationIndentFromStartLine(startLineText);
	if (!continuationIndent) return null;

	const fileText = editor.getValue();
	const lines = fileText.split("\n");
	if (startLineIndex < 0 || startLineIndex >= lines.length) return null;

	const endLineIndex = findListItemEndLineIndex(lines, startLineIndex, parentIndentLen);
	const firstChildLineIndex = findFirstChildListStartLineIndex(
		lines,
		startLineIndex,
		endLineIndex,
		parentIndentLen
	);
	const insertBeforeLineIndex =
		firstChildLineIndex ?? (endLineIndex + 1 < lines.length ? endLineIndex + 1 : null);

	const existingSystemLine = findSystemLine(lines, startLineIndex, endLineIndex);
	const hasSystemLineInCorrectPlace =
		existingSystemLine &&
		(insertBeforeLineIndex === null || existingSystemLine.lineIndex < insertBeforeLineIndex);
	if (hasSystemLineInCorrectPlace) {
		return `^${existingSystemLine!.id}`;
	}

	const systemLineDate = existingSystemLine?.date ?? formatSystemDate(DateTime.now());
	const parentContentEndLineIndex =
		insertBeforeLineIndex !== null ? insertBeforeLineIndex - 1 : endLineIndex;
	const systemLineId =
		existingSystemLine?.id ??
		findExistingBlockIdInParentContent(lines, startLineIndex, parentContentEndLineIndex) ??
		generateUniqueId(plugin, fileText);

	const normalizedSystemLineText = `${continuationIndent}[date:: ${systemLineDate}] ^${systemLineId}`;

	applyLineEdit(editor, {
		deleteLineIndex: existingSystemLine?.lineIndex ?? null,
		insertBeforeLineIndex,
		lineText: normalizedSystemLineText,
	});

	return `^${systemLineId}`;
}
