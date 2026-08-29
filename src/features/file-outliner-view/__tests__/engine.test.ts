import { DateTime } from "luxon";

import {
	backspaceAtStart,
	deleteBlock,
	indentBlock,
	indentBlockPreservingOrder,
	insertAtRootEnd,
	insertAfter,
	moveBlockSubtree,
	moveBlockByDirection,
	mergeWithNext,
	mergeWithPrevious,
	outdentBlock,
	outdentBlockPreservingOrder,
	pasteSplitLines,
	splitAtSelection,
	type OutlinerEngineContext,
} from "../engine";

import { normalizeOutlinerFile, type ParsedOutlinerFile } from "../protocol";
import { resolveOutlinerBlockIdForSourceLine } from "../source-line-navigation";

function fileOf(blocks: ParsedOutlinerFile["blocks"]): ParsedOutlinerFile {
	return { frontmatter: null, blocks };
}

describe("file-outliner-view/engine", () => {
	test("splitAtSelection creates a new sibling and moves focus (keep children)", () => {
		const input = fileOf([
			{
				id: "aa",
				depth: 0,
				text: "hello world",
				children: [
					{
						id: "cc",
						depth: 1,
						text: "child",
						children: [],
						system: { date: "d", updated: "u", extra: {} },
					},
				],
				system: { date: "d", updated: "u", extra: {} },
			},
		]);

		const ctx: OutlinerEngineContext = {
			now: "2026-02-03T00:00:00",
			generateId: () => "bb",
			childrenOnSplit: "keep",
			backspaceWithChildren: "merge",
		};

		const out = splitAtSelection(input, { id: "aa", start: 5, end: 5 }, ctx);

		expect(out.didChange).toBe(true);
		expect(out.selection).toEqual({ id: "bb", start: 0, end: 0 });
		expect(Array.from(out.dirtyIds).sort()).toEqual(["aa", "bb"]);

		expect(out.file.blocks.map((b) => b.id)).toEqual(["aa", "bb"]);
		expect(out.file.blocks[0]?.text).toBe("hello");
		expect(out.file.blocks[1]?.text).toBe(" world");
		expect(out.file.blocks[0]?.children.map((b) => b.id)).toEqual(["cc"]);
		expect(out.file.blocks[1]?.children).toEqual([]);

		// Depths are recomputed.
		expect(out.file.blocks[0]?.depth).toBe(0);
		expect(out.file.blocks[0]?.children[0]?.depth).toBe(1);
		expect(out.file.blocks[1]?.depth).toBe(0);

		// Input is not mutated.
		expect(input.blocks.map((b) => b.id)).toEqual(["aa"]);
		expect(input.blocks[0]?.text).toBe("hello world");
		expect(input.blocks[0]?.children.map((b) => b.id)).toEqual(["cc"]);
	});

	test("splitAtSelection moves children when configured", () => {
		const input = fileOf([
			{
				id: "aa",
				depth: 0,
				text: "a",
				children: [
					{
						id: "cc",
						depth: 1,
						text: "child",
						children: [],
						system: { date: "d", updated: "u", extra: {} },
					},
				],
				system: { date: "d", updated: "u", extra: {} },
			},
		]);

		const ctx: OutlinerEngineContext = {
			now: "2026-02-03T00:00:00",
			generateId: () => "bb",
			childrenOnSplit: "move",
			backspaceWithChildren: "merge",
		};

		const out = splitAtSelection(input, { id: "aa", start: 1, end: 1 }, ctx);
		expect(out.file.blocks[0]?.children).toEqual([]);
		expect(out.file.blocks[1]?.children.map((b) => b.id)).toEqual(["cc"]);
		expect(out.file.blocks[1]?.children[0]?.depth).toBe(1);
	});

	test("indentBlock and outdentBlock move a block while preserving selection", () => {
		const input = fileOf([
			{ id: "a", depth: 0, text: "a", children: [], system: { date: "d", updated: "u", extra: {} } },
			{ id: "b", depth: 0, text: "b", children: [], system: { date: "d", updated: "u", extra: {} } },
			{ id: "c", depth: 0, text: "c", children: [], system: { date: "d", updated: "u", extra: {} } },
		]);

		const sel = { id: "b", start: 0, end: 0 };

		const indented = indentBlock(input, sel);
		expect(indented.didChange).toBe(true);
		expect(indented.selection).toEqual(sel);
		expect(Array.from(indented.dirtyIds).sort()).toEqual(["a", "b"]);

		expect(indented.file.blocks.map((b) => b.id)).toEqual(["a", "c"]);
		expect(indented.file.blocks[0]?.children.map((b) => b.id)).toEqual(["b"]);
		expect(indented.file.blocks[0]?.children[0]?.depth).toBe(1);

		const outdented = outdentBlock(indented.file, sel);
		expect(outdented.didChange).toBe(true);
		expect(outdented.file.blocks.map((b) => b.id)).toEqual(["a", "b", "c"]);
		expect(outdented.file.blocks[1]?.depth).toBe(0);
	});

	test("indentBlockPreservingOrder keeps visible order and only deepens the current block", () => {
		const input = fileOf([
			{ id: "a", depth: 0, text: "A", children: [{ id: "b", depth: 1, text: "B", children: [], system: { date: "d", updated: "u", extra: {} } }], system: { date: "d", updated: "u", extra: {} } },
			{ id: "c", depth: 0, text: "C", children: [{ id: "d", depth: 1, text: "D", children: [], system: { date: "d", updated: "u", extra: {} } }], system: { date: "d", updated: "u", extra: {} } },
		]);

		const sel = { id: "c", start: 0, end: 0 };
		const out = indentBlockPreservingOrder(input, sel);

		expect(out.didChange).toBe(true);
		expect(out.selection).toEqual(sel);
		expect(Array.from(out.dirtyIds).sort()).toEqual(["a", "c"]);
		expect(out.file.blocks.map((b) => b.id)).toEqual(["a"]);
		expect(out.file.blocks[0]?.children.map((b) => b.id)).toEqual(["b", "c", "d"]);
		expect(out.file.blocks[0]?.children[0]?.depth).toBe(1);
		expect(out.file.blocks[0]?.children[1]?.depth).toBe(1);
		expect(out.file.blocks[0]?.children[2]?.depth).toBe(1);
	});

	test("outdentBlockPreservingOrder keeps visible order and minimally repairs descendants", () => {
		const input = fileOf([
			{
				id: "a",
				depth: 0,
				text: "A",
				children: [
					{ id: "b", depth: 1, text: "B", children: [], system: { date: "d", updated: "u", extra: {} } },
					{
						id: "c",
						depth: 1,
						text: "C",
						children: [{ id: "d", depth: 2, text: "D", children: [], system: { date: "d", updated: "u", extra: {} } }],
						system: { date: "d", updated: "u", extra: {} },
					},
				],
				system: { date: "d", updated: "u", extra: {} },
			},
		]);

		const sel = { id: "c", start: 0, end: 0 };
		const out = outdentBlockPreservingOrder(input, sel);

		expect(out.didChange).toBe(true);
		expect(out.selection).toEqual(sel);
		expect(Array.from(out.dirtyIds).sort()).toEqual(["a", "c", "d"]);
		expect(out.file.blocks.map((b) => b.id)).toEqual(["a", "c"]);
		expect(out.file.blocks[0]?.children.map((b) => b.id)).toEqual(["b"]);
		expect(out.file.blocks[1]?.depth).toBe(0);
		expect(out.file.blocks[1]?.children.map((b) => b.id)).toEqual(["d"]);
		expect(out.file.blocks[1]?.children[0]?.depth).toBe(1);
	});

	test("outdentBlockPreservingOrder keeps descendant hierarchy when only the edited block needs promotion", () => {
		const input = fileOf([
			{
				id: "a",
				depth: 0,
				text: "A",
				children: [
					{
						id: "b",
						depth: 1,
						text: "B",
						children: [{ id: "c", depth: 2, text: "C", children: [], system: { date: "d", updated: "u", extra: {} } }],
						system: { date: "d", updated: "u", extra: {} },
					},
				],
				system: { date: "d", updated: "u", extra: {} },
			},
		]);

		const sel = { id: "b", start: 0, end: 0 };
		const out = outdentBlockPreservingOrder(input, sel);

		expect(out.didChange).toBe(true);
		expect(out.file.blocks.map((b) => b.id)).toEqual(["a", "b"]);
		expect(out.file.blocks[1]?.depth).toBe(0);
		expect(out.file.blocks[1]?.children.map((b) => b.id)).toEqual(["c"]);
		expect(out.file.blocks[1]?.children[0]?.depth).toBe(1);
	});

	test("moveBlockSubtree reorders siblings (after)", () => {
		const input = fileOf([
			{ id: "a", depth: 0, text: "a", children: [], system: { date: "d", updated: "u", extra: {} } },
			{ id: "b", depth: 0, text: "b", children: [], system: { date: "d", updated: "u", extra: {} } },
			{ id: "c", depth: 0, text: "c", children: [], system: { date: "d", updated: "u", extra: {} } },
		]);

		const out = moveBlockSubtree(input, "b", "c", "after");
		expect(out.didChange).toBe(true);
		expect(out.selection).toEqual({ id: "b", start: 0, end: 0 });
		expect(out.file.blocks.map((b) => b.id)).toEqual(["a", "c", "b"]);
		expect(Array.from(out.dirtyIds).sort()).toEqual(["b"]);

		// Input is not mutated.
		expect(input.blocks.map((b) => b.id)).toEqual(["a", "b", "c"]);
	});

	test("moveBlockSubtree moves a root block inside another block (append child)", () => {
		const input = fileOf([
			{
				id: "a",
				depth: 0,
				text: "a",
				children: [
					{ id: "b", depth: 1, text: "b", children: [], system: { date: "d", updated: "u", extra: {} } },
				],
				system: { date: "d", updated: "u", extra: {} },
			},
			{ id: "c", depth: 0, text: "c", children: [], system: { date: "d", updated: "u", extra: {} } },
		]);

		const out = moveBlockSubtree(input, "c", "a", "inside");
		expect(out.didChange).toBe(true);
		expect(out.file.blocks.map((b) => b.id)).toEqual(["a"]);
		expect(out.file.blocks[0]?.children.map((b) => b.id)).toEqual(["b", "c"]);
		// Depths are recomputed.
		expect(out.file.blocks[0]?.depth).toBe(0);
		expect(out.file.blocks[0]?.children[1]?.depth).toBe(1);
		expect(Array.from(out.dirtyIds).sort()).toEqual(["a", "c"]);
	});

	test("moveBlockSubtree refuses to move a block relative to its descendants", () => {
		const input = fileOf([
			{
				id: "a",
				depth: 0,
				text: "a",
				children: [
					{
						id: "b",
						depth: 1,
						text: "b",
						children: [{ id: "c", depth: 2, text: "c", children: [], system: { date: "d", updated: "u", extra: {} } }],
						system: { date: "d", updated: "u", extra: {} },
					},
				],
				system: { date: "d", updated: "u", extra: {} },
			},
		]);

		const out = moveBlockSubtree(input, "a", "c", "after");
		expect(out.didChange).toBe(false);
		expect(out.file.blocks[0]?.children[0]?.children.map((b) => b.id)).toEqual(["c"]);
	});

	test("moveBlockByDirection moves a complete same-level subtree and preserves selection/input", () => {
		const input = fileOf([
			{
				id: "a",
				depth: 0,
				text: "a",
				children: [{ id: "a1", depth: 1, text: "a1", children: [], system: { date: "d", updated: "u", extra: {} } }],
				system: { date: "d", updated: "u", extra: {} },
			},
			{
				id: "b",
				depth: 0,
				text: "b",
				children: [
					{ id: "b1", depth: 1, text: "b1", children: [], system: { date: "d", updated: "u", extra: {} } },
					{ id: "b2", depth: 1, text: "b2", children: [], system: { date: "d", updated: "u", extra: {} } },
				],
				system: { date: "d", updated: "u", extra: {} },
			},
			{
				id: "c",
				depth: 0,
				text: "c",
				children: [{ id: "c1", depth: 1, text: "c1", children: [], system: { date: "d", updated: "u", extra: {} } }],
				system: { date: "d", updated: "u", extra: {} },
			},
			{ id: "d", depth: 0, text: "d", children: [], system: { date: "d", updated: "u", extra: {} } },
		]);
		const selection = { id: "b", start: 1, end: 1 };
		const before = JSON.parse(JSON.stringify(input));

		const up = moveBlockByDirection(input, selection, "up", "same-level");
		expect(up.didChange).toBe(true);
		expect(up.selection).toEqual(selection);
		expect(up.file.blocks.map((block) => block.id)).toEqual(["b", "a", "c", "d"]);
		expect(up.file.blocks[0]?.children.map((block) => block.id)).toEqual(["b1", "b2"]);
		expect(up.file.blocks[0]?.children[0]?.depth).toBe(1);
		expect(up.file.blocks[1]?.children.map((block) => block.id)).toEqual(["a1"]);
		expect(Array.from(up.dirtyIds)).toEqual(expect.arrayContaining(["a", "b", "b1", "b2"]));
		expect(input).toEqual(before);

		const down = moveBlockByDirection(input, selection, "down", "same-level");
		expect(down.didChange).toBe(true);
		expect(down.selection).toEqual(selection);
		expect(down.file.blocks.map((block) => block.id)).toEqual(["a", "c", "b", "d"]);
		expect(down.file.blocks[2]?.children.map((block) => block.id)).toEqual(["b1", "b2"]);
		expect(down.file.blocks[2]?.children[1]?.depth).toBe(1);
	});

	test("moveBlockByDirection keeps same-level moves inside the sibling boundary and no-ops at edges", () => {
		const input = fileOf([
			{
				id: "a",
				depth: 0,
				text: "a",
				children: [
					{ id: "a1", depth: 1, text: "a1", children: [], system: { date: "d", updated: "u", extra: {} } },
					{ id: "a2", depth: 1, text: "a2", children: [], system: { date: "d", updated: "u", extra: {} } },
				],
				system: { date: "d", updated: "u", extra: {} },
			},
			{ id: "b", depth: 0, text: "b", children: [], system: { date: "d", updated: "u", extra: {} } },
		]);

		const topBoundary = moveBlockByDirection(input, { id: "a", start: 0, end: 0 }, "up", "same-level");
		expect(topBoundary.didChange).toBe(false);
		expect(topBoundary.file).toBe(input);
		expect(topBoundary.dirtyIds).toEqual(new Set());

		const bottomBoundary = moveBlockByDirection(input, { id: "b", start: 0, end: 0 }, "down", "same-level");
		expect(bottomBoundary.didChange).toBe(false);
		expect(bottomBoundary.file).toBe(input);

		const parentBoundary = moveBlockByDirection(input, { id: "a1", start: 0, end: 0 }, "up", "same-level");
		expect(parentBoundary.didChange).toBe(false);
		expect(parentBoundary.file).toBe(input);
	});

	test("moveBlockByDirection cross-level-align moves complete subtrees and aligns both directions", () => {
		const input = fileOf([
			{
				id: "r",
				depth: 0,
				text: "r",
				children: [
					{ id: "r1", depth: 1, text: "r1", children: [], system: { date: "d", updated: "u", extra: {} } },
					{
						id: "r2",
						depth: 1,
						text: "r2",
						children: [{ id: "r2c", depth: 2, text: "r2c", children: [], system: { date: "d", updated: "u", extra: {} } }],
						system: { date: "d", updated: "u", extra: {} },
					},
				],
				system: { date: "d", updated: "u", extra: {} },
			},
			{
				id: "s",
				depth: 0,
				text: "s",
				children: [{ id: "s1", depth: 1, text: "s1", children: [], system: { date: "d", updated: "u", extra: {} } }],
				system: { date: "d", updated: "u", extra: {} },
			},
			{ id: "t", depth: 0, text: "t", children: [], system: { date: "d", updated: "u", extra: {} } },
		]);
		const before = JSON.parse(JSON.stringify(input));

		const up = moveBlockByDirection(input, { id: "s", start: 2, end: 2 }, "up", "cross-level-align");
		expect(up.didChange).toBe(true);
		expect(up.selection).toEqual({ id: "s", start: 2, end: 2 });
		expect(up.file.blocks.map((block) => block.id)).toEqual(["r", "t"]);
		expect(up.file.blocks[0]?.children.map((block) => block.id)).toEqual(["r1", "r2"]);
		expect(up.file.blocks[0]?.children[1]?.children.map((block) => block.id)).toEqual(["s", "r2c"]);
		expect(up.file.blocks[0]?.children[1]?.children[0]?.depth).toBe(2);
		expect(up.file.blocks[0]?.children[1]?.children[0]?.children[0]?.id).toBe("s1");
		expect(up.file.blocks[0]?.children[1]?.children[0]?.children[0]?.depth).toBe(3);
		expect(Array.from(up.dirtyIds)).toEqual(expect.arrayContaining(["s", "s1", "r2c"]));

		const down = moveBlockByDirection(input, { id: "r2", start: 0, end: 0 }, "down", "cross-level-align");
		expect(down.didChange).toBe(true);
		expect(down.file.blocks.map((block) => block.id)).toEqual(["r", "s", "r2", "t"]);
		expect(down.file.blocks[1]?.children.map((block) => block.id)).toEqual(["s1"]);
		expect(down.file.blocks[2]?.children.map((block) => block.id)).toEqual(["r2c"]);
		expect(down.file.blocks[2]?.depth).toBe(0);
		expect(down.file.blocks[2]?.children[0]?.depth).toBe(1);
		expect(input).toEqual(before);
	});

	test("moveBlockByDirection does not split an ancestor target subtree", () => {
		const input = fileOf([
			{
				id: "parent",
				depth: 0,
				text: "parent",
				children: [{ id: "source", depth: 1, text: "source", children: [], system: { date: "d", updated: "u", extra: {} } }],
				system: { date: "d", updated: "u", extra: {} },
			},
			{ id: "next", depth: 0, text: "next", children: [], system: { date: "d", updated: "u", extra: {} } },
		]);
		const before = JSON.parse(JSON.stringify(input));

		const up = moveBlockByDirection(input, { id: "source", start: 0, end: 0 }, "up", "cross-level-align");

		expect(up.didChange).toBe(false);
		expect(up.file).toBe(input);
		expect(up.dirtyIds).toEqual(new Set());
		expect(input).toEqual(before);
	});

	test("moveBlockByDirection keeps source-line navigation aligned after frontmatter/legacy moves", () => {
		const source = [
			"---",
			"kind: outliner",
			"---",
			"- parent",
			"  - child TARGET_NEEDLE",
			"    [date:: 2026-06-12T00:00:00] [updated:: 2026-06-12T00:00:00] [blp_sys:: 1] [blp_ver:: 2] ^child",
			"  [date:: 2026-06-12T00:00:00] [updated:: 2026-06-12T00:00:00] [blp_sys:: 1] [blp_ver:: 2] ^parent",
			"- sibling",
			"  [date:: 2026-06-12T00:00:00] [updated:: 2026-06-12T00:00:00] [blp_sys:: 1] [blp_ver:: 2] ^sibling",
			"",
		].join("\n");
		const normalize = () =>
			normalizeOutlinerFile(source, {
				idPrefix: "",
				idLength: 4,
				now: DateTime.fromISO("2026-06-12T00:00:00"),
				indentSize: 2,
			}).file;

		const assertCurrentSerializedLines = (file: ParsedOutlinerFile) => {
			expect(resolveOutlinerBlockIdForSourceLine(file, 3)).toBe("sibling");
			expect(resolveOutlinerBlockIdForSourceLine(file, 5)).toBe("parent");
			expect(resolveOutlinerBlockIdForSourceLine(file, 6)).toBe("parent");
			expect(resolveOutlinerBlockIdForSourceLine(file, 7)).toBe("child");
			expect(resolveOutlinerBlockIdForSourceLine(file, 8)).toBe("child");
		};

		const movedDown = moveBlockByDirection(
			normalize(),
			{ id: "parent", start: 0, end: 0 },
			"down",
			"same-level"
		);
		const movedUp = moveBlockByDirection(
			normalize(),
			{ id: "sibling", start: 0, end: 0 },
			"up",
			"same-level"
		);

		expect(movedDown.didChange).toBe(true);
		expect(movedUp.didChange).toBe(true);
		expect(movedDown.file.blocks.map((block) => block.id)).toEqual(["sibling", "parent"]);
		expect(movedUp.file.blocks.map((block) => block.id)).toEqual(["sibling", "parent"]);
		assertCurrentSerializedLines(movedDown.file);
		assertCurrentSerializedLines(movedUp.file);
	});

	test("moveBlockSubtree invalidates parser source-line ranges in both reorder directions", () => {
		const source = [
			"---",
			"kind: outliner",
			"---",
			"- parent",
			"  - child TARGET_NEEDLE",
			"    [date:: 2026-06-12T00:00:00] [updated:: 2026-06-12T00:00:00] [blp_sys:: 1] [blp_ver:: 2] ^child",
			"  [date:: 2026-06-12T00:00:00] [updated:: 2026-06-12T00:00:00] [blp_sys:: 1] [blp_ver:: 2] ^parent",
			"- sibling",
			"  [date:: 2026-06-12T00:00:00] [updated:: 2026-06-12T00:00:00] [blp_sys:: 1] [blp_ver:: 2] ^sibling",
			"",
		].join("\n");
		const normalize = () =>
			normalizeOutlinerFile(source, {
				idPrefix: "",
				idLength: 4,
				now: DateTime.fromISO("2026-06-12T00:00:00"),
				indentSize: 2,
			}).file;
		const assertCurrentSerializedLines = (file: ParsedOutlinerFile) => {
			expect(resolveOutlinerBlockIdForSourceLine(file, 3)).toBe("sibling");
			expect(resolveOutlinerBlockIdForSourceLine(file, 5)).toBe("parent");
			expect(resolveOutlinerBlockIdForSourceLine(file, 6)).toBe("parent");
			expect(resolveOutlinerBlockIdForSourceLine(file, 7)).toBe("child");
			expect(resolveOutlinerBlockIdForSourceLine(file, 8)).toBe("child");
		};

		const movedDown = moveBlockSubtree(normalize(), "parent", "sibling", "after");
		const movedUp = moveBlockSubtree(normalize(), "sibling", "parent", "before");

		expect(movedDown.didChange).toBe(true);
		expect(movedUp.didChange).toBe(true);
		expect(movedDown.file.blocks.map((block) => block.id)).toEqual(["sibling", "parent"]);
		expect(movedUp.file.blocks.map((block) => block.id)).toEqual(["sibling", "parent"]);
		assertCurrentSerializedLines(movedDown.file);
		assertCurrentSerializedLines(movedUp.file);
	});

	test("moveBlockByDirection skips collapsed descendants and respects the Zoom root boundary", () => {
		const input = fileOf([
			{
				id: "root",
				depth: 0,
				text: "root",
				children: [
					{ id: "first", depth: 1, text: "first", children: [], system: { date: "d", updated: "u", extra: {} } },
					{
						id: "source",
						depth: 1,
						text: "source",
						children: [{ id: "hidden", depth: 2, text: "hidden", children: [], system: { date: "d", updated: "u", extra: {} } }],
						system: { date: "d", updated: "u", extra: {} },
					},
				],
				system: { date: "d", updated: "u", extra: {} },
			},
			{
				id: "target",
				depth: 0,
				text: "target",
				children: [{ id: "target-child", depth: 1, text: "target-child", children: [], system: { date: "d", updated: "u", extra: {} } }],
				system: { date: "d", updated: "u", extra: {} },
			},
		]);

		const collapsedMove = moveBlockByDirection(
			input,
			{ id: "source", start: 0, end: 0 },
			"down",
			"cross-level-align",
			{ collapsedIds: new Set(["source", "target"]) }
		);
		expect(collapsedMove.didChange).toBe(true);
		expect(collapsedMove.file.blocks.map((block) => block.id)).toEqual(["root", "target", "source"]);
		expect(collapsedMove.file.blocks[1]?.children.map((block) => block.id)).toEqual(["target-child"]);
		expect(collapsedMove.file.blocks[2]?.children.map((block) => block.id)).toEqual(["hidden"]);
		expect(Array.from(collapsedMove.dirtyIds)).toEqual(expect.arrayContaining(["source", "hidden", "target", "target-child"]));

		const zoomBoundary = moveBlockByDirection(
			input,
			{ id: "first", start: 0, end: 0 },
			"up",
			"cross-level-align",
			{ zoomRootId: "root" }
		);
		expect(zoomBoundary.didChange).toBe(false);
		expect(zoomBoundary.file).toBe(input);

		const hiddenSource = moveBlockByDirection(
			input,
			{ id: "hidden", start: 0, end: 0 },
			"down",
			"cross-level-align",
			{ collapsedIds: new Set(["source"]) }
		);
		expect(hiddenSource.didChange).toBe(false);
		expect(hiddenSource.file).toBe(input);
	});

	test("mergeWithPrevious concatenates text and moves children", () => {
		const input = fileOf([
			{
				id: "a",
				depth: 0,
				text: "a",
				children: [],
				system: { date: "d", updated: "u", extra: {} },
			},
			{
				id: "b",
				depth: 0,
				text: "b",
				children: [
					{ id: "c", depth: 1, text: "c", children: [], system: { date: "d", updated: "u", extra: {} } },
				],
				system: { date: "d", updated: "u", extra: {} },
			},
		]);

		const out = mergeWithPrevious(input, { id: "b", start: 0, end: 0 });
		expect(out.didChange).toBe(true);
		expect(out.file.blocks.map((b) => b.id)).toEqual(["a"]);
		expect(out.file.blocks[0]?.text).toBe("ab");
		expect(out.file.blocks[0]?.children.map((b) => b.id)).toEqual(["c"]);
		expect(out.selection).toEqual({ id: "a", start: 1, end: 1 });
	});

	test("mergeWithNext concatenates text and moves children", () => {
		const input = fileOf([
			{
				id: "a",
				depth: 0,
				text: "a",
				children: [],
				system: { date: "d", updated: "u", extra: {} },
			},
			{
				id: "b",
				depth: 0,
				text: "b",
				children: [
					{ id: "c", depth: 1, text: "c", children: [], system: { date: "d", updated: "u", extra: {} } },
				],
				system: { date: "d", updated: "u", extra: {} },
			},
		]);

		const out = mergeWithNext(input, { id: "a", start: 1, end: 1 });
		expect(out.didChange).toBe(true);
		expect(out.file.blocks.map((b) => b.id)).toEqual(["a"]);
		expect(out.file.blocks[0]?.text).toBe("ab");
		expect(out.file.blocks[0]?.children.map((b) => b.id)).toEqual(["c"]);
		expect(out.selection).toEqual({ id: "a", start: 1, end: 1 });
	});

	test("pasteSplitLines keeps the first pasted line in the current block and appends tail to the last block", () => {
		const input = fileOf([
			{ id: "a", depth: 0, text: "alpha", children: [], system: { date: "d", updated: "u", extra: {} } },
			{ id: "b", depth: 0, text: "beta", children: [], system: { date: "d", updated: "u", extra: {} } },
		]);

		const out = pasteSplitLines(input, { id: "a", start: 5, end: 5 }, "P1\nP2", {
			now: "2026-03-10T00:00:00",
			generateId: () => "n1",
		});

		expect(out.didChange).toBe(true);
		expect(out.selection).toEqual({ id: "n1", start: 2, end: 2 });
		expect(Array.from(out.dirtyIds).sort()).toEqual(["a", "n1"]);
		expect(out.file.blocks.map((b) => b.id)).toEqual(["a", "n1", "b"]);
		expect(out.file.blocks[0]?.text).toBe("alphaP1");
		expect(out.file.blocks[1]?.text).toBe("P2");
	});

	test("backspaceAtStart prefers outdent when block has children and setting is outdent", () => {
		const input = fileOf([
			{
				id: "a",
				depth: 0,
				text: "a",
				children: [
					{
						id: "b",
						depth: 1,
						text: "b",
						children: [
							{
								id: "c",
								depth: 2,
								text: "c",
								children: [],
								system: { date: "d", updated: "u", extra: {} },
							},
						],
						system: { date: "d", updated: "u", extra: {} },
					},
				],
				system: { date: "d", updated: "u", extra: {} },
			},
		]);

		const out = backspaceAtStart(input, { id: "b", start: 0, end: 0 }, { backspaceWithChildren: "outdent" });
		expect(out.didChange).toBe(true);
		expect(out.file.blocks.map((b) => b.id)).toEqual(["a", "b"]);
		expect(out.file.blocks[1]?.children.map((b) => b.id)).toEqual(["c"]);
		expect(out.file.blocks[1]?.depth).toBe(0);
		expect(out.file.blocks[1]?.children[0]?.depth).toBe(1);
	});

	test("insertAfter inserts an empty sibling after the target and focuses it", () => {
		const input = fileOf([
			{ id: "a", depth: 0, text: "a", children: [], system: { date: "d", updated: "u", extra: {} } },
			{ id: "b", depth: 0, text: "b", children: [], system: { date: "d", updated: "u", extra: {} } },
		]);

		const now = "2026-02-03T00:00:00";
		const out = insertAfter(input, "a", { now, generateId: () => "x" });

		expect(out.didChange).toBe(true);
		expect(out.selection).toEqual({ id: "x", start: 0, end: 0 });
		expect(Array.from(out.dirtyIds)).toEqual(["x"]);

		expect(out.file.blocks.map((b) => b.id)).toEqual(["a", "x", "b"]);
		expect(out.file.blocks[1]?.text).toBe("");
		expect(out.file.blocks[1]?.system.date).toBe(now);
		expect(out.file.blocks[1]?.system.updated).toBe(now);
		expect(out.file.blocks[1]?.depth).toBe(0);

		// Input is not mutated.
		expect(input.blocks.map((b) => b.id)).toEqual(["a", "b"]);
	});

	test("insertAfter inserts a sibling within a nested children list", () => {
		const input = fileOf([
			{
				id: "a",
				depth: 0,
				text: "a",
				children: [
					{ id: "b", depth: 1, text: "b", children: [], system: { date: "d", updated: "u", extra: {} } },
					{ id: "c", depth: 1, text: "c", children: [], system: { date: "d", updated: "u", extra: {} } },
				],
				system: { date: "d", updated: "u", extra: {} },
			},
		]);

		const out = insertAfter(input, "b", { now: "2026-02-03T00:00:00", generateId: () => "x" });
		expect(out.didChange).toBe(true);
		expect(out.file.blocks[0]?.children.map((b) => b.id)).toEqual(["b", "x", "c"]);
		expect(out.file.blocks[0]?.children[1]?.depth).toBe(1);
	});

	test("insertAtRootEnd inserts the first block into an empty file and focuses it", () => {
		const input = fileOf([]);

		const now = "2026-02-03T00:00:00";
		const out = insertAtRootEnd(input, { now, generateId: () => "x" });

		expect(out.didChange).toBe(true);
		expect(out.selection).toEqual({ id: "x", start: 0, end: 0 });
		expect(Array.from(out.dirtyIds)).toEqual(["x"]);

		expect(out.file.blocks.map((b) => b.id)).toEqual(["x"]);
		expect(out.file.blocks[0]?.text).toBe("");
		expect(out.file.blocks[0]?.system.date).toBe(now);
		expect(out.file.blocks[0]?.system.updated).toBe(now);
		expect(out.file.blocks[0]?.depth).toBe(0);

		// Input is not mutated.
		expect(input.blocks).toEqual([]);
	});

	test("insertAtRootEnd appends after existing root blocks", () => {
		const input = fileOf([
			{ id: "a", depth: 0, text: "a", children: [], system: { date: "d", updated: "u", extra: {} } },
			{ id: "b", depth: 0, text: "b", children: [], system: { date: "d", updated: "u", extra: {} } },
		]);

		const out = insertAtRootEnd(input, { now: "2026-02-03T00:00:00", generateId: () => "x" });
		expect(out.didChange).toBe(true);
		expect(out.file.blocks.map((b) => b.id)).toEqual(["a", "b", "x"]);

		// Input is not mutated.
		expect(input.blocks.map((b) => b.id)).toEqual(["a", "b"]);
	});

	test("deleteBlock removes a subtree and focuses next/prev/parent", () => {
		const input = fileOf([
			{ id: "a", depth: 0, text: "a", children: [], system: { date: "d", updated: "u", extra: {} } },
			{ id: "b", depth: 0, text: "bb", children: [], system: { date: "d", updated: "u", extra: {} } },
			{ id: "c", depth: 0, text: "c", children: [], system: { date: "d", updated: "u", extra: {} } },
		]);

		const ctx = { now: "2026-02-03T00:00:00", generateId: () => "x" };

		const delMid = deleteBlock(input, "b", ctx);
		expect(delMid.file.blocks.map((b) => b.id)).toEqual(["a", "c"]);
		expect(delMid.selection).toEqual({ id: "c", start: 0, end: 0 });

		const delLast = deleteBlock(input, "c", ctx);
		expect(delLast.file.blocks.map((b) => b.id)).toEqual(["a", "b"]);
		expect(delLast.selection).toEqual({ id: "b", start: 2, end: 2 });

		const nested = fileOf([
			{
				id: "p",
				depth: 0,
				text: "pp",
				children: [{ id: "k", depth: 1, text: "k", children: [], system: { date: "d", updated: "u", extra: {} } }],
				system: { date: "d", updated: "u", extra: {} },
			},
		]);

		const delChild = deleteBlock(nested, "k", ctx);
		expect(delChild.file.blocks[0]?.children).toEqual([]);
		expect(delChild.selection).toEqual({ id: "p", start: 2, end: 2 });
	});

	test("deleteBlock keeps the file non-empty when deleting the last remaining block", () => {
		const input = fileOf([
			{ id: "a", depth: 0, text: "a", children: [], system: { date: "d", updated: "u", extra: {} } },
		]);

		let calls = 0;
		const ctx = {
			now: "2026-02-03T00:00:00",
			generateId: () => (calls++ === 0 ? "a" : "x"),
		};

		const out = deleteBlock(input, "a", ctx);
		expect(out.didChange).toBe(true);
		expect(out.file.blocks.map((b) => b.id)).toEqual(["x"]);
		expect(out.selection).toEqual({ id: "x", start: 0, end: 0 });
		expect(Array.from(out.dirtyIds)).toEqual(["x"]);
	});
});
