import { removeOneIndentUnit } from "./list-subtree";

export type LineRange = { startLine: number; endLine: number };

export function computeSwapWithSiblingRegion(
	lines: string[],
	current: LineRange,
	sibling: LineRange,
	direction: "up" | "down"
): { replaceFromLine: number; replaceToLine: number; newRegion: string[]; newStartLine: number } | null {
	const currentStart = current.startLine;
	const currentEnd = current.endLine;
	const siblingStart = sibling.startLine;
	const siblingEnd = sibling.endLine;

	if (direction === "up") {
		if (siblingStart > currentStart) return null;

		const prevBlock = lines.slice(siblingStart, siblingEnd + 1);
		const between = lines.slice(siblingEnd + 1, currentStart);
		const currentBlock = lines.slice(currentStart, currentEnd + 1);
		const newRegion = [...currentBlock, ...between, ...prevBlock];

		return {
			replaceFromLine: siblingStart,
			replaceToLine: currentEnd,
			newRegion,
			newStartLine: siblingStart,
		};
	}

	// down
	if (siblingStart < currentStart) return null;
	const nextBlock = lines.slice(siblingStart, siblingEnd + 1);
	const between = lines.slice(currentEnd + 1, siblingStart);
	const currentBlock = lines.slice(currentStart, currentEnd + 1);
	const newRegion = [...nextBlock, ...between, ...currentBlock];

	return {
		replaceFromLine: currentStart,
		replaceToLine: siblingEnd,
		newRegion,
		newStartLine: currentStart + nextBlock.length + between.length,
	};
}

export function indentSubtreeLines(lines: string[], range: LineRange, unit: string): string[] {
	const { startLine, endLine } = range;
	const subtree = lines.slice(startLine, endLine + 1);
	return subtree.map((l) => (l.length ? unit + l : l));
}

export function outdentAndMoveSubtreeLines(
	lines: string[],
	range: LineRange,
	insertionLineOriginal: number,
	unit: string
): { nextLines: string[]; newStartLine: number } | null {
	const { startLine, endLine } = range;
	const subtree = lines.slice(startLine, endLine + 1);
	const updated = subtree.map((l) => removeOneIndentUnit(l, unit));

	const count = subtree.length;

	// No-op if insertion point is inside the subtree.
	if (startLine <= insertionLineOriginal && insertionLineOriginal <= endLine + 1) return null;

	const nextLines = [...lines];
	nextLines.splice(startLine, count);

	let insertionLine = insertionLineOriginal;
	if (insertionLine > startLine) insertionLine -= count;
	insertionLine = Math.max(0, Math.min(nextLines.length, insertionLine));

	nextLines.splice(insertionLine, 0, ...updated);
	return { nextLines, newStartLine: insertionLine };
}

