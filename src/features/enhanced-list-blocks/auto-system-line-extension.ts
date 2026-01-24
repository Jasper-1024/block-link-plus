import { EditorState, StateEffect, type Text, type Transaction, type TransactionSpec } from "@codemirror/state";
import { editorInfoField, editorLivePreviewField } from "obsidian";
import { DateTime } from "luxon";
import type BlockLinkPlus from "../../main";
import { generateRandomId } from "../../utils";
import { isEnhancedListEnabledFile } from "./enable-scope";

const autoSystemLineEffect = StateEffect.define<void>();
const autoSystemLineCursorFixEffect = StateEffect.define<void>();

const SYSTEM_LINE_EXACT_RE =
	/^(\s*)\[date::\s*(\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2})\]\s*\^([a-zA-Z0-9_-]+)\s*$/;

const LIST_ITEM_PREFIX_RE =
	/^(\s*)(?:([-*+])|(\d+\.))\s+(?:\[(?: |x|X)\]\s+)?/;

const BLOCK_ID_AT_END_RE = /\s*\^([a-zA-Z0-9_-]+)\s*$/;

function formatSystemDate(dt: DateTime): string {
	return dt.toFormat("yyyy-MM-dd'T'HH:mm:ss");
}

function getListItemPrefixLength(text: string): number | null {
	const m = text.match(LIST_ITEM_PREFIX_RE);
	if (!m) return null;
	return m[0].length;
}

function isEmptyListItemLine(text: string): { indentLen: number } | null {
	const m = text.match(LIST_ITEM_PREFIX_RE);
	if (!m) return null;
	const prefixLen = m[0].length;
	if (text.slice(prefixLen).trim().length !== 0) return null;
	return { indentLen: (m[1] ?? "").length };
}

function computeContinuationIndentFromStartLine(startLineText: string): string | null {
	const m = startLineText.match(LIST_ITEM_PREFIX_RE);
	if (!m) return null;
	const indentPrefix = m[1] ?? "";
	const prefixLenWithoutIndent = m[0].length - indentPrefix.length;
	return indentPrefix + " ".repeat(prefixLenWithoutIndent);
}

function findPreviousListItemStartLineNumber(
	doc: Text,
	fromLineNumber: number,
	targetIndentLen: number
): number | null {
	for (let n = fromLineNumber; n >= 1; n--) {
		const line = doc.line(n);
		const m = line.text.match(LIST_ITEM_PREFIX_RE);
		if (!m) continue;

		const indentLen = (m[1] ?? "").length;
		if (indentLen === targetIndentLen) return n;
		if (indentLen < targetIndentLen) return null;
	}
	return null;
}

function findFirstChildListStartLineNumber(
	doc: Text,
	startLineNumber: number,
	endLineNumber: number,
	parentIndentLen: number
): number | null {
	for (let n = startLineNumber + 1; n <= endLineNumber; n++) {
		const line = doc.line(n);
		const m = line.text.match(LIST_ITEM_PREFIX_RE);
		if (!m) continue;
		const indentLen = (m[1] ?? "").length;
		if (indentLen > parentIndentLen) return n;
	}
	return null;
}

function findSystemLine(
	doc: Text,
	startLineNumber: number,
	endLineNumber: number
): { lineNumber: number; date: string; id: string } | null {
	for (let n = startLineNumber; n <= endLineNumber; n++) {
		const line = doc.line(n);
		const m = line.text.match(SYSTEM_LINE_EXACT_RE);
		if (!m) continue;
		return { lineNumber: n, date: m[2], id: m[3] };
	}
	return null;
}

function findExistingBlockIdInParentContent(
	doc: Text,
	startLineNumber: number,
	endLineNumber: number
): string | null {
	for (let n = startLineNumber; n <= endLineNumber; n++) {
		const line = doc.line(n);
		const m = line.text.match(BLOCK_ID_AT_END_RE);
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

function computeCursorFixSelection(doc: Text, head: number): { anchor: number; head: number } | null {
	const headLine = doc.lineAt(head);

	// Case A: caret jumped into the (hidden) system line, but the next line is the newly-created empty list item.
	if (SYSTEM_LINE_EXACT_RE.test(headLine.text)) {
		const nextLineNumber = headLine.number + 1;
		if (nextLineNumber <= doc.lines) {
			const nextLine = doc.line(nextLineNumber);
			const nextPrefixLen = getListItemPrefixLength(nextLine.text);
			if (nextPrefixLen !== null && nextLine.text.slice(nextPrefixLen).trim().length === 0) {
				const pos = nextLine.from + nextPrefixLen;
				return { anchor: pos, head: pos };
			}
		}

		return null;
	}

	// Case B: caret is on the newly-created empty list item, but it got placed before the `- ` marker.
	const prefixLen = getListItemPrefixLength(headLine.text);
	if (prefixLen === null) return null;
	if (headLine.text.slice(prefixLen).trim().length !== 0) return null;

	const ch = head - headLine.from;
	if (ch >= prefixLen) return null;

	if (headLine.number <= 1) return null;
	const prevLine = doc.line(headLine.number - 1);
	if (!SYSTEM_LINE_EXACT_RE.test(prevLine.text)) return null;

	const pos = headLine.from + prefixLen;
	return { anchor: pos, head: pos };
}

type SystemLineEscapeDirection = "up" | "down";

function computeSystemLineEscapeSelection(
	doc: Text,
	head: number,
	direction: SystemLineEscapeDirection,
	opts: { preferLineEnd?: boolean; preferLineStart?: boolean }
): { anchor: number; head: number } | null {
	const headLine = doc.lineAt(head);
	if (!SYSTEM_LINE_EXACT_RE.test(headLine.text)) return null;

	const headCh = head - headLine.from;

	const findCandidate = (dir: SystemLineEscapeDirection) => {
		if (dir === "up") {
			for (let n = headLine.number - 1; n >= 1; n--) {
				const line = doc.line(n);
				if (SYSTEM_LINE_EXACT_RE.test(line.text)) continue;
				return { line, dir };
			}
			return null;
		}

		for (let n = headLine.number + 1; n <= doc.lines; n++) {
			const line = doc.line(n);
			if (SYSTEM_LINE_EXACT_RE.test(line.text)) continue;
			return { line, dir };
		}

		return null;
	};

	let candidate = findCandidate(direction);
	if (!candidate) candidate = findCandidate(direction === "up" ? "down" : "up");
	if (!candidate) return null;

	const { line, dir } = candidate;

	let pos: number;
	if (opts.preferLineEnd && dir === "up") {
		pos = line.to;
	} else if (opts.preferLineStart && dir === "down") {
		pos = line.from;
	} else {
		pos = line.from + Math.min(headCh, line.text.length);
	}

	return { anchor: pos, head: pos };
}

function inferSystemLineEscapeIntent(tr: Transaction): {
	direction: SystemLineEscapeDirection;
	preferLineEnd: boolean;
	preferLineStart: boolean;
} {
	const preferLineStart = tr.isUserEvent("delete.forward");
	const preferLineEnd = tr.isUserEvent("delete") && !preferLineStart;

	if (!tr.docChanged) {
		const startHead = tr.startState.selection.main.head;
		const newHead = tr.newSelection.main.head;

		if (newHead > startHead) {
			return { direction: "down", preferLineEnd: false, preferLineStart: false };
		}
		if (newHead < startHead) {
			return { direction: "up", preferLineEnd: false, preferLineStart: false };
		}
	}

	if (preferLineStart) {
		return { direction: "down", preferLineEnd, preferLineStart };
	}
	if (preferLineEnd) {
		return { direction: "up", preferLineEnd, preferLineStart };
	}

	return { direction: "up", preferLineEnd: false, preferLineStart: false };
}

export function createEnhancedListAutoSystemLineExtension(plugin: BlockLinkPlus) {
	return EditorState.transactionFilter.of((tr: Transaction): Transaction | readonly TransactionSpec[] => {
		if (tr.effects.some((e) => e.is(autoSystemLineEffect) || e.is(autoSystemLineCursorFixEffect))) {
			return tr;
		}

		try {
			if (tr.startState.field?.(editorLivePreviewField, false) !== true) {
				return tr;
			}
		} catch {
			return tr;
		}

		const info = tr.startState.field(editorInfoField, false);
		const file = info?.file;
		if (!file) return tr;
		if (!isEnhancedListEnabledFile(plugin, file as any)) return tr;

		if (plugin.settings.enhancedListHideSystemLine === true) {
			const selection = tr.newSelection;
			if (selection.ranges.length === 1 && selection.main.empty) {
				const main = selection.main;

				const intent = inferSystemLineEscapeIntent(tr);
				const desiredSelection =
					computeCursorFixSelection(tr.newDoc, main.head) ??
					computeSystemLineEscapeSelection(tr.newDoc, main.head, intent.direction, intent);

				if (
					desiredSelection &&
					(desiredSelection.anchor !== main.anchor || desiredSelection.head !== main.head)
				) {
					return [
						tr,
						{
							sequential: true,
							effects: [autoSystemLineCursorFixEffect.of()],
							selection: desiredSelection,
						},
					];
				}
			}
		}

		if (!tr.docChanged) return tr;

		const doc = tr.newDoc;
		const head = tr.newSelection.main.head;
		const currentLine = doc.lineAt(head);
		const currentLineNumber = currentLine.number;

		const emptyListInfo = isEmptyListItemLine(currentLine.text);
		if (!emptyListInfo) return tr;

		const currentPrefixMatch = currentLine.text.match(LIST_ITEM_PREFIX_RE);
		if (!currentPrefixMatch) return tr;
		const currentPrefixLen = currentPrefixMatch[0].length;
		const headCh = head - currentLine.from;
		if (headCh !== currentPrefixLen) return tr;

		if (currentLineNumber <= 1) return tr;

		const parentIndentLen = emptyListInfo.indentLen;
		const prevStartLineNumber = findPreviousListItemStartLineNumber(
			doc,
			currentLineNumber - 1,
			parentIndentLen
		);
		if (!prevStartLineNumber) return tr;

		const prevStartLine = doc.line(prevStartLineNumber);
		const continuationIndent = computeContinuationIndentFromStartLine(prevStartLine.text);
		if (!continuationIndent) return tr;

		const endLineNumber = currentLineNumber - 1;
		if (endLineNumber < prevStartLineNumber) return tr;

		const firstChildLineNumber = findFirstChildListStartLineNumber(
			doc,
			prevStartLineNumber,
			endLineNumber,
			parentIndentLen
		);
		const desiredInsertBeforeLineNumber = firstChildLineNumber ?? currentLineNumber;

		const existingSystemLine = findSystemLine(doc, prevStartLineNumber, endLineNumber);
		const hasSystemLineInCorrectPlace =
			existingSystemLine && existingSystemLine.lineNumber < desiredInsertBeforeLineNumber;
		if (hasSystemLineInCorrectPlace) return tr;

		const fileText = doc.toString();

		const systemLineDate = existingSystemLine?.date ?? formatSystemDate(DateTime.now());
		const systemLineId =
			existingSystemLine?.id ??
			findExistingBlockIdInParentContent(doc, prevStartLineNumber, desiredInsertBeforeLineNumber - 1) ??
			generateUniqueId(plugin, fileText);

		const normalizedSystemLineText = `${continuationIndent}[date:: ${systemLineDate}] ^${systemLineId}`;
		const insertPos = doc.line(desiredInsertBeforeLineNumber).from;
		const insertText = `${normalizedSystemLineText}\n`;

		if (existingSystemLine) {
			const oldLine = doc.line(existingSystemLine.lineNumber);
			const oldFrom = oldLine.from;
			const oldTo = existingSystemLine.lineNumber < doc.lines ? oldLine.to + 1 : oldLine.to;

			return [
				tr,
				{
					sequential: true,
					effects: [autoSystemLineEffect.of()],
					changes: [
						{ from: oldFrom, to: oldTo, insert: "" },
						{ from: insertPos, to: insertPos, insert: insertText },
					].sort((a, b) => a.from - b.from),
				},
			];
		}

		return [
			tr,
			{
				sequential: true,
				effects: [autoSystemLineEffect.of()],
				changes: { from: insertPos, to: insertPos, insert: insertText },
			},
		];
	});
}
