import type { ListItemCache } from "obsidian";

export type ResolvedListSubtree = {
	item: ListItemCache;
	startLine: number;
	endLine: number;
};

function getLeadingWhitespace(text: string): string {
	return text.match(/^\s*/)?.[0] ?? "";
}

export function resolveListSubtreeForLine(
	listItems: ListItemCache[] | null | undefined,
	line: number
): ResolvedListSubtree | null {
	if (!listItems || listItems.length === 0) return null;

	let best: ResolvedListSubtree | null = null;
	let bestSpan = Number.POSITIVE_INFINITY;

	for (const item of listItems) {
		const startLine = item.position.start.line;
		const endLine = item.position.end.line;
		if (startLine <= line && line <= endLine) {
			const span = endLine - startLine;
			if (span < bestSpan) {
				best = { item, startLine, endLine };
				bestSpan = span;
			}
		}
	}

	return best;
}

export function getSortedSiblingItems(listItems: ListItemCache[], item: ListItemCache): ListItemCache[] {
	return listItems
		.filter((i) => i.parent === item.parent)
		.sort((a, b) => a.position.start.line - b.position.start.line);
}

export function findSibling(
	listItems: ListItemCache[],
	item: ListItemCache,
	direction: "prev" | "next"
): ListItemCache | null {
	const siblings = getSortedSiblingItems(listItems, item);
	const idx = siblings.findIndex((i) => i.position.start.line === item.position.start.line);
	if (idx < 0) return null;
	if (direction === "prev") return siblings[idx - 1] ?? null;
	return siblings[idx + 1] ?? null;
}

export function inferListIndentUnit(lines: string[], listItems: ListItemCache[]): string {
	const byStartLine = new Map<number, ListItemCache>();
	for (const item of listItems) {
		byStartLine.set(item.position.start.line, item);
	}

	const counts = new Map<string, number>();
	for (const item of listItems) {
		if (item.parent < 0) continue;
		const parent = byStartLine.get(item.parent);
		if (!parent) continue;

		const itemIndent = getLeadingWhitespace(lines[item.position.start.line] ?? "");
		const parentIndent = getLeadingWhitespace(lines[parent.position.start.line] ?? "");
		if (!itemIndent.startsWith(parentIndent)) continue;
		const unit = itemIndent.slice(parentIndent.length);
		if (!unit) continue;

		counts.set(unit, (counts.get(unit) ?? 0) + 1);
	}

	let bestUnit: string | null = null;
	let bestCount = -1;
	for (const [unit, count] of counts.entries()) {
		if (count > bestCount) {
			bestUnit = unit;
			bestCount = count;
		}
	}

	if (bestUnit) return bestUnit;

	// Fallback heuristics
	const hasTabIndent = listItems.some((i) => (lines[i.position.start.line] ?? "").startsWith("\t"));
	return hasTabIndent ? "\t" : "  ";
}

export function removeOneIndentUnit(line: string, unit: string): string {
	if (!line) return line;
	if (line.startsWith(unit)) return line.slice(unit.length);

	// Best-effort fallback: if unit is spaces but line starts with some whitespace, remove 1 char.
	if (unit.trim().length === 0 && line.startsWith(" ")) return line.slice(1);
	if (unit === "\t" && line.startsWith(" ")) return line.slice(1);
	return line;
}

