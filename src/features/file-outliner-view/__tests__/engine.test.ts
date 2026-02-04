import {
	backspaceAtStart,
	indentBlock,
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
});

