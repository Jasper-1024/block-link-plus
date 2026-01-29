import { App } from "obsidian";
import { parseEnhancedListBlocksFromContent } from "../block-index";

describe("enhanced-list-blocks/block-index", () => {
	test("parses system-line blocks and builds parent chain", () => {
		const app = new App();
		const content = [
			"- parent",
			"  [date:: 2026-01-01T00:00:00] ^p1",
			"  - child",
			"    [date:: 2026-01-01T00:00:00] ^c1",
			"- sibling",
			"  [date:: 2026-01-01T00:00:00] ^s1",
		].join("\n");
		const file = (app.vault as any)._addFile("test.md", content);

		const blocks = parseEnhancedListBlocksFromContent(content, file);
		expect(blocks.map((b) => b.id)).toEqual(["p1", "c1", "s1"]);

		const parent = blocks[0];
		expect(parent.text).toBe("parent");
		expect(parent.parents).toEqual([]);

		const child = blocks[1];
		expect(child.text).toBe("child");
		expect(child.parents).toEqual(["parent"]);

		const sibling = blocks[2];
		expect(sibling.text).toBe("sibling");
		expect(sibling.parents).toEqual([]);
	});

	test("supports split system line pairs ([date:: ...] + ^id)", () => {
		const app = new App();
		const content = ["- a", "  [date:: 2026-01-01T00:00:00]", "  ^z9y8"].join("\n");
		const file = (app.vault as any)._addFile("test.md", content);

		const blocks = parseEnhancedListBlocksFromContent(content, file);
		expect(blocks.length).toBe(1);
		expect(blocks[0].id).toBe("z9y8");
	});

	test("skips list items without system line ids", () => {
		const app = new App();
		const content = ["- a", "  - child"].join("\n");
		const file = (app.vault as any)._addFile("test.md", content);

		const blocks = parseEnhancedListBlocksFromContent(content, file);
		expect(blocks.length).toBe(0);
	});

	test("ignores list-like lines inside fenced code blocks", () => {
		const app = new App();
		const content = [
			"- real",
			"  [date:: 2026-01-01T00:00:00] ^r1",
			"```txt",
			"- fake",
			"  [date:: 2026-01-01T00:00:00] ^f1",
			"```",
			"- after",
			"  [date:: 2026-01-01T00:00:00] ^a1",
		].join("\n");
		const file = (app.vault as any)._addFile("test.md", content);

		const blocks = parseEnhancedListBlocksFromContent(content, file);
		expect(blocks.map((b) => b.id)).toEqual(["r1", "a1"]);
	});
});
