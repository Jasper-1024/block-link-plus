import type { OutlinerBlock } from "./protocol";

export type ArrowNavDirection = "up" | "down";

export type VisibleBlockNav = {
	order: string[];
	indexById: Map<string, number>;
};

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
	nav: VisibleBlockNav,
	currentId: string,
	dir: ArrowNavDirection
): string | null {
	const idx = nav.indexById.get(currentId);
	if (idx === undefined) return null;
	if (dir === "up") return idx > 0 ? nav.order[idx - 1] ?? null : null;
	return idx + 1 < nav.order.length ? nav.order[idx + 1] ?? null : null;
}

export function computeVisibleBlockNav(renderBlocks: OutlinerBlock[], collapsedIds: ReadonlySet<string>): VisibleBlockNav {
	const order = computeVisibleBlockOrder(renderBlocks, collapsedIds);
	const indexById = new Map<string, number>();
	for (let i = 0; i < order.length; i++) {
		const id = order[i];
		if (id) indexById.set(id, i);
	}
	return { order, indexById };
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
