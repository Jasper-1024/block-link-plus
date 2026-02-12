import type { OutlinerBlock } from "./protocol";

export type ArrowNavDirection = "up" | "down";

export function computeVisibleBlockOrder(renderBlocks: OutlinerBlock[], collapsedIds: ReadonlySet<string>): string[] {
	const out: string[] = [];

	const walk = (blocks: OutlinerBlock[]) => {
		for (const b of blocks) {
			if (!b?.id) continue;
			out.push(b.id);
			if (collapsedIds.has(b.id)) continue;
			if (Array.isArray(b.children) && b.children.length > 0) walk(b.children);
		}
	};

	walk(renderBlocks ?? []);
	return out;
}

export function findAdjacentVisibleBlockId(
	visibleOrder: readonly string[],
	currentId: string,
	dir: ArrowNavDirection
): string | null {
	const idx = visibleOrder.indexOf(currentId);
	if (idx < 0) return null;
	if (dir === "up") return idx > 0 ? visibleOrder[idx - 1] ?? null : null;
	return idx + 1 < visibleOrder.length ? visibleOrder[idx + 1] ?? null : null;
}

function clamp(n: number, min: number, max: number): number {
	return Math.max(min, Math.min(max, n));
}

export function cursorPosAtFirstLine(text: string, goalCh: number): number {
	const s = String(text ?? "");
	const nl = s.indexOf("\n");
	const first = nl >= 0 ? s.slice(0, nl) : s;
	return clamp(Math.floor(goalCh), 0, first.length);
}

export function cursorPosAtLastLine(text: string, goalCh: number): number {
	const s = String(text ?? "");
	const lastNl = s.lastIndexOf("\n");
	if (lastNl < 0) return clamp(Math.floor(goalCh), 0, s.length);
	const last = s.slice(lastNl + 1);
	const ch = clamp(Math.floor(goalCh), 0, last.length);
	return lastNl + 1 + ch;
}

