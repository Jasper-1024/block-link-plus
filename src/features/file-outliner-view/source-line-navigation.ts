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
	};
	const line = rawState.line ?? rawState.startLoc?.line;
	if (typeof line !== "number" || !Number.isFinite(line)) return null;

	return Math.max(0, Math.floor(line));
}
