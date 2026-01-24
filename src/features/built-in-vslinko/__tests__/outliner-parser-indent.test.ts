import { Parser } from "../../../vendor/vslinko/obsidian-outliner/services/Parser";

function createReader(lines: string[]) {
	return {
		getCursor: () => ({ line: 0, ch: 0 }),
		getLine: (n: number) => lines[n] ?? "",
		lastLine: () => Math.max(0, lines.length - 1),
		listSelections: () => [{ anchor: { line: 0, ch: 0 }, head: { line: 0, ch: 0 } }],
		getAllFoldedLines: () => [],
	};
}

function createParser() {
	// Parser only needs `settings.keepCursorWithinContent` and a logger with `bind()`.
	return new Parser({ bind: () => () => {} } as any, { keepCursorWithinContent: "bullet-and-checkbox" } as any);
}

describe("vendored obsidian-outliner parser indentation tolerance", () => {
	test("parses list starting with <= 3 leading spaces and mixed tab indentation", () => {
		const lines = [" - a", "\t- b", "\t  - c"];
		const parser = createParser();
		const roots = parser.parseRange(createReader(lines) as any);

		expect(roots).toHaveLength(1);
		const root = roots[0];

		const level1 = root.getRootList().getChildren();
		expect(level1).toHaveLength(1);

		const level2 = level1[0].getChildren();
		expect(level2).toHaveLength(1);

		const level3 = level2[0].getChildren();
		expect(level3).toHaveLength(1);
	});

	test("accepts a tab-indented system line under a space-indented list item", () => {
		const lines = [
			"- a",
			"  - b",
			"\t[date:: 2026-01-22T15:22:00] ^whx7",
		];

		const parser = createParser();
		const roots = parser.parseRange(createReader(lines) as any);

		expect(roots).toHaveLength(1);
		const root = roots[0];
		const level1 = root.getRootList().getChildren();
		expect(level1).toHaveLength(1);

		const level2 = level1[0].getChildren();
		expect(level2).toHaveLength(1);

		expect(level2[0].getLines()).toHaveLength(2);
		expect(level2[0].getLines()[1]).toContain("[date::");
	});

	test("accepts a system line indented less than the list marker indent (common in legacy daily notes)", () => {
		const lines = [
			"- a",
			"  - b",
			"\t  - c",
			"\t[date:: 2026-01-22T11:24:29] ^qxf9",
		];

		const parser = createParser();
		const roots = parser.parseRange(createReader(lines) as any);

		expect(roots).toHaveLength(1);
		const root = roots[0];

		const level1 = root.getRootList().getChildren();
		expect(level1).toHaveLength(1);

		const level2 = level1[0].getChildren();
		expect(level2).toHaveLength(1);

		const level3 = level2[0].getChildren();
		expect(level3).toHaveLength(1);

		expect(level3[0].getLines()).toHaveLength(2);
		expect(level3[0].getLines()[1]).toContain("[date::");
	});
});
