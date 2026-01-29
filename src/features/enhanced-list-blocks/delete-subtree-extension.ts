import { EditorState, StateEffect, type Text, type Transaction, type TransactionSpec } from "@codemirror/state";
import { editorInfoField, editorLivePreviewField } from "obsidian";
import type BlockLinkPlus from "../../main";
import { isEnhancedListEnabledFile } from "./enable-scope";
import { indentCols, lineIndentCols, MARKDOWN_TAB_WIDTH } from "./indent-utils";
import {
	LIST_ITEM_PREFIX_RE,
	SYSTEM_LINE_EXACT_RE,
	buildFenceStateMapFromDoc,
	computeContinuationIndentFromStartLine,
	parseListItemPrefix,
} from "./list-parse";

const deleteSubtreeEffect = StateEffect.define<void>();

type Range = { from: number; to: number };

function mergeRanges(ranges: Range[]): Range[] {
	if (ranges.length === 0) return [];

	const sorted = [...ranges].sort((a, b) => a.from - b.from);
	const merged: Range[] = [];

	for (const range of sorted) {
		const last = merged[merged.length - 1];
		if (!last || range.from > last.to) {
			merged.push({ from: range.from, to: range.to });
			continue;
		}
		last.to = Math.max(last.to, range.to);
	}

	return merged;
}

function leadingWhitespaceLen(text: string, tabSize: number): number {
	return lineIndentCols(text, tabSize);
}

function computeSubtreeDeleteRange(
	doc: Text,
	startLineNumber: number,
	parentIndentLen: number,
	tabSize: number,
	fenceMap: boolean[]
): Range {
	const startLine = doc.line(startLineNumber);

	let to = doc.length;
	for (let n = startLineNumber + 1; n <= doc.lines; n++) {
		const line = doc.line(n);
		if (fenceMap[n]) continue;
		if (line.text.trim() === "") continue;
		if (leadingWhitespaceLen(line.text, tabSize) <= parentIndentLen) {
			to = line.from;
			break;
		}
	}

	return { from: startLine.from, to };
}

function findSubtreeEndLineNumber(
	doc: Text,
	startLineNumber: number,
	parentIndentLen: number,
	tabSize: number,
	fenceMap: boolean[]
): number {
	for (let n = startLineNumber + 1; n <= doc.lines; n++) {
		const line = doc.line(n);
		if (fenceMap[n]) continue;
		if (line.text.trim() === "") continue;
		if (leadingWhitespaceLen(line.text, tabSize) <= parentIndentLen) {
			return n - 1;
		}
	}

	return doc.lines;
}

function computeSystemLineDeletions(
	doc: Text,
	startLineNumber: number,
	endLineNumber: number,
	expectedIndent: string,
	tabSize: number,
	fenceMap: boolean[]
): Range[] {
	const expectedIndentCols = indentCols(expectedIndent, tabSize);
	const ranges: Range[] = [];
	for (let n = startLineNumber; n <= endLineNumber; n++) {
		if (fenceMap[n]) continue;
		const line = doc.line(n);
		const m = line.text.match(SYSTEM_LINE_EXACT_RE);
		if (!m) continue;
		if (indentCols(m[1] ?? "", tabSize) !== expectedIndentCols) continue;

		const from = line.from;
		const to = n < doc.lines ? line.to + 1 : line.to;
		if (to > from) ranges.push({ from, to });
	}
	return ranges;
}

function computeCleanupDeletionsOldDoc(tr: Transaction, deleteSubtree: boolean, tabSize: number): Range[] {
	const oldDoc = tr.startState.doc;
	const newDoc = tr.newDoc;
	const fenceMapOld = buildFenceStateMapFromDoc(oldDoc as any);

	const changes: Array<{ fromA: number; toA: number }> = [];
	const touchedLineNumbers = new Set<number>();

	tr.changes.iterChanges((fromA, toA) => {
		changes.push({ fromA, toA });

		const startLine = oldDoc.lineAt(fromA);
		const endLine = oldDoc.lineAt(Math.max(fromA, toA));
		for (let n = startLine.number; n <= endLine.number; n++) {
			touchedLineNumbers.add(n);
		}
	});

	const ranges: Range[] = [];

	for (const lineNumber of touchedLineNumbers) {
		const line = oldDoc.line(lineNumber);
		const prefix = parseListItemPrefix(line.text, tabSize);
		if (!prefix) continue;

		const markerFrom = line.from + prefix.indentLen;
		const markerTo = markerFrom + prefix.markerLen;

		const markerTouched = changes.some((c) => c.toA > c.fromA && c.fromA < markerTo && c.toA > markerFrom);
		if (!markerTouched) continue;

		const mappedFrom = tr.changes.mapPos(line.from, 1);
		const mappedTo = tr.changes.mapPos(line.to, -1);
		const lineWasDeleted = mappedTo <= mappedFrom;

		let lineIsStillList = false;
		if (!lineWasDeleted) {
			try {
				lineIsStillList = LIST_ITEM_PREFIX_RE.test(newDoc.lineAt(mappedFrom).text);
			} catch {
				lineIsStillList = false;
			}
		}

		if (!lineWasDeleted && lineIsStillList) continue;

		const continuationIndent = computeContinuationIndentFromStartLine(line.text);
		if (continuationIndent) {
			const endLineNumber = findSubtreeEndLineNumber(
				oldDoc,
				lineNumber,
				prefix.indentCols,
				tabSize,
				fenceMapOld
			);
			ranges.push(
				...computeSystemLineDeletions(
					oldDoc,
					lineNumber,
					endLineNumber,
					continuationIndent,
					tabSize,
					fenceMapOld
				)
			);

			if (deleteSubtree) {
				const subtree = computeSubtreeDeleteRange(oldDoc, lineNumber, prefix.indentCols, tabSize, fenceMapOld);
				if (subtree.to > subtree.from) ranges.push(subtree);
			}
		}
	}

	return mergeRanges(ranges);
}

export function createEnhancedListDeleteSubtreeExtension(plugin: BlockLinkPlus) {
	return EditorState.transactionFilter.of((tr: Transaction): Transaction | readonly TransactionSpec[] => {
		if (!tr.docChanged) return tr;
		if (tr.effects.some((e) => e.is(deleteSubtreeEffect))) return tr;

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

		const tabSize = MARKDOWN_TAB_WIDTH;
		const deletionsOld = computeCleanupDeletionsOldDoc(
			tr,
			plugin.settings.enhancedListDeleteSubtreeOnListItemDelete === true,
			tabSize
		);
		if (deletionsOld.length === 0) return tr;

		const deletionsNew = mergeRanges(
			deletionsOld
				.map((r) => ({
					from: tr.changes.mapPos(r.from, 1),
					to: tr.changes.mapPos(r.to, -1),
				}))
				.filter((r) => r.to > r.from)
		);

		if (deletionsNew.length === 0) return tr;

		return [
			tr,
			{
				sequential: true,
				effects: [deleteSubtreeEffect.of()],
				changes: deletionsNew.map((r) => ({ from: r.from, to: r.to, insert: "" })),
			},
		];
	});
}
