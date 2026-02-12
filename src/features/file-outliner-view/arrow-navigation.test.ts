import {
	computeVisibleBlockOrder,
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
	test("computeVisibleBlockOrder respects collapsedIds", () => {
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

		const expanded = computeVisibleBlockOrder([p, a], new Set());
		expect(expanded).toEqual(["p", "c1", "d", "c2", "a"]);

		const c1Collapsed = computeVisibleBlockOrder([p, a], new Set(["c1"]));
		expect(c1Collapsed).toEqual(["p", "c1", "c2", "a"]);

		const pCollapsed = computeVisibleBlockOrder([p, a], new Set(["p"]));
		expect(pCollapsed).toEqual(["p", "a"]);
	});

	test("findAdjacentVisibleBlockId returns prev/next in visible order", () => {
		const order = ["p", "c1", "c2", "a"] as const;
		expect(findAdjacentVisibleBlockId(order, "p", "up")).toBeNull();
		expect(findAdjacentVisibleBlockId(order, "p", "down")).toBe("c1");
		expect(findAdjacentVisibleBlockId(order, "c2", "up")).toBe("c1");
		expect(findAdjacentVisibleBlockId(order, "c2", "down")).toBe("a");
		expect(findAdjacentVisibleBlockId(order, "a", "down")).toBeNull();
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

