import { EditorState, StateEffect, type Text, type Transaction, type TransactionSpec } from "@codemirror/state";
import { editorInfoField, editorLivePreviewField } from "obsidian";
import { DateTime } from "luxon";
import type BlockLinkPlus from "../../main";
import { generateRandomId } from "../../utils";
import { isEnhancedListEnabledFile } from "./enable-scope";

const autoSystemLineEffect = StateEffect.define<void>();

const SYSTEM_LINE_EXACT_RE =
	/^(\s*)\[date::\s*(\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2})\]\s*\^([a-zA-Z0-9_-]+)\s*$/;

const LIST_ITEM_PREFIX_RE =
	/^(\s*)(?:([-*+])|(\d+\.))\s+(?:\[(?: |x|X)\]\s+)?/;

const BLOCK_ID_AT_END_RE = /\s*\^([a-zA-Z0-9_-]+)\s*$/;

function formatSystemDate(dt: DateTime): string {
	return dt.toFormat("yyyy-MM-dd'T'HH:mm:ss");
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

export function createEnhancedListAutoSystemLineExtension(plugin: BlockLinkPlus) {
	return EditorState.transactionFilter.of((tr: Transaction): Transaction | readonly TransactionSpec[] => {
		if (!tr.docChanged) return tr;
		if (tr.effects.some((e) => e.is(autoSystemLineEffect))) return tr;

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
