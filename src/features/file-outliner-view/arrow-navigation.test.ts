import {
	computeVisibleBlockNav,
	cursorPosAtFirstLine,
	cursorPosAtLastLine,
	findAdjacentVisibleBlockId,
} from "./arrow-navigation";

import type { OutlinerBlock } from "./protocol";

function block(id: string, children: OutlinerBlock[] = []): OutlinerBlock {
	return {
		id,
		depth: 0,
		text: id,
		children,
		system: { date: "", updated: "", extra: {} },
	};
}

describe("file-outliner-view arrow navigation helpers", () => {
	test("computeVisibleBlockNav respects collapsedIds and builds indexById", () => {
		// p
		//   c1
		//     d
		//   c2
		// a
		const d = block("d");
		const c1 = block("c1", [d]);
		const c2 = block("c2");
		const p = block("p", [c1, c2]);
		const a = block("a");

		const expanded = computeVisibleBlockNav([p, a], new Set());
		expect(expanded.order).toEqual(["p", "c1", "d", "c2", "a"]);
		expect(expanded.indexById.get("p")).toBe(0);
		expect(expanded.indexById.get("c2")).toBe(3);
		expect(expanded.indexById.get("a")).toBe(4);

		const c1Collapsed = computeVisibleBlockNav([p, a], new Set(["c1"]));
		expect(c1Collapsed.order).toEqual(["p", "c1", "c2", "a"]);

		const pCollapsed = computeVisibleBlockNav([p, a], new Set(["p"]));
		expect(pCollapsed.order).toEqual(["p", "a"]);
	});

	test("findAdjacentVisibleBlockId returns prev/next in visible order", () => {
		const order = ["p", "c1", "c2", "a"];
		const nav = { order, indexById: new Map(order.map((id, idx) => [id, idx])) };

		expect(findAdjacentVisibleBlockId(nav, "p", "up")).toBeNull();
		expect(findAdjacentVisibleBlockId(nav, "p", "down")).toBe("c1");
		expect(findAdjacentVisibleBlockId(nav, "c2", "up")).toBe("c1");
		expect(findAdjacentVisibleBlockId(nav, "c2", "down")).toBe("a");
		expect(findAdjacentVisibleBlockId(nav, "a", "down")).toBeNull();
	});

	test("cursorPosAtFirstLine clamps to first line length", () => {
		expect(cursorPosAtFirstLine("abc\ndef", 0)).toBe(0);
		expect(cursorPosAtFirstLine("abc\ndef", 2)).toBe(2);
		expect(cursorPosAtFirstLine("abc\ndef", 99)).toBe(3);
	});

	test("cursorPosAtLastLine lands on last line and clamps", () => {
		const text = "aa\nbbb\ncccc";
		// last line starts after last '\n' (index 6) => from=7
		expect(cursorPosAtLastLine(text, 0)).toBe(7);
		expect(cursorPosAtLastLine(text, 2)).toBe(9);
		expect(cursorPosAtLastLine(text, 99)).toBe(11);
	});
});
