import {
	backspaceAtStart,
	deleteBlock,
	indentBlock,
	insertAfter,
	mergeWithNext,
	mergeWithPrevious,
	outdentBlock,
	splitAtSelection,
	type OutlinerEngineContext,
} from "../engine";

import type { ParsedOutlinerFile } from "../protocol";

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
