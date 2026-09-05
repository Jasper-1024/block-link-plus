import type { OutlinerBlock, ParsedOutlinerFile } from "./protocol";

export function resolveOutlinerBlockIdForSourceLine(
	file: ParsedOutlinerFile | null | undefined,
	zeroBasedLine: number
): string | null {
	if (!file || !Number.isFinite(zeroBasedLine) || zeroBasedLine < 0) return null;

	const sourceMappedId = resolveFromSourceRanges(file.blocks ?? [], zeroBasedLine);
	if (sourceMappedId) return sourceMappedId;

	let line = file.frontmatter ? file.frontmatter.split("\n").length : 0;

	const walk = (blocks: OutlinerBlock[]): string | null => {
		for (const block of blocks) {
			const textLines = String(block.text ?? "").split("\n");
			const blockLineCount = Math.max(1, textLines.length) + 1; // body lines plus system tail line
			if (zeroBasedLine >= line && zeroBasedLine < line + blockLineCount) return block.id || null;
			line += blockLineCount;

			const child = walk(block.children ?? []);
			if (child) return child;
		}

		return null;
	};

	return walk(file.blocks ?? []);
}

function resolveFromSourceRanges(blocks: OutlinerBlock[], zeroBasedLine: number): string | null {
	let match: string | null = null;

	const walk = (list: OutlinerBlock[]) => {
		for (const block of list) {
			const ranges = block._sourceLineRanges ?? [];
			for (const range of ranges) {
				if (zeroBasedLine >= range.start && zeroBasedLine <= range.end) {
					match = block.id || match;
					break;
				}
			}

			walk(block.children ?? []);
		}
	};

	walk(blocks);
	return match;
}

export function extractZeroBasedLineFromEphemeralState(state: unknown): number | null {
	if (!state || typeof state !== "object") return null;

	const rawState = state as {
		line?: unknown;
		startLoc?: { line?: unknown };
		match?: { content?: unknown; matches?: unknown };
	};
	const line = rawState.line ?? rawState.startLoc?.line;
	if (line !== undefined && line !== null) {
		return typeof line === "number" && Number.isFinite(line) ? Math.max(0, Math.floor(line)) : null;
	}

	// Global Search supplies UTF-16 offsets into its source snapshot, not line /
	// startLoc. Use that same snapshot (including frontmatter and system lines).
	const content = rawState.match?.content;
	const matches = rawState.match?.matches;
	if (typeof content !== "string" || !Array.isArray(matches) || !Array.isArray(matches[0])) return null;
	const [start, end] = matches[0];
	if (!Number.isInteger(start) || !Number.isInteger(end) || start < 0 || end < start || end > content.length) return null;
	let sourceLine = 0;
	for (let newline = content.indexOf("\n"); newline >= 0 && newline < start; newline = content.indexOf("\n", newline + 1)) {
		sourceLine++;
	}
	return sourceLine;
}
