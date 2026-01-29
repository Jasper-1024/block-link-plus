import { App } from "obsidian";
import {
	findActiveListItemBlockIdInContent,
	findBlockTargetFromLine,
	getBlockPeekContextFromContent,
} from "../block-peek";

describe("enhanced-list-blocks/block-peek", () => {
	test("getBlockPeekContextFromContent returns ancestors + siblings (ignores fenced list-like lines)", () => {
		const doc = [
			"- A",
			"  [date:: 2026-01-01T00:00:00] ^a1",
			"  ```js",
			"  - not a list",
			"  ```",
			"  - B",
			"    [date:: 2026-01-01T00:00:00] ^b1",
			"  - C",
			"    [date:: 2026-01-01T00:00:00] ^c1",
		].join("\n");

		const ctx = getBlockPeekContextFromContent(doc, "b1", { siblings: 1 });
		expect(ctx?.self?.text).toBe("B");
		expect(ctx?.ancestors?.map((b) => b.text)).toEqual(["A"]);
		expect(ctx?.prevSiblings?.map((b) => b.text)).toEqual([]);
		expect(ctx?.nextSiblings?.map((b) => b.text)).toEqual(["C"]);
	});

	test("findActiveListItemBlockIdInContent returns the owning list item id even when cursor is inside a fenced code block", () => {
		const doc = [
			"- A",
			"  [date:: 2026-01-01T00:00:00] ^a1",
			"  ```",
			"  - not a list",
			"  ```",
			"  - B",
			"    [date:: 2026-01-01T00:00:00] ^b1",
		].join("\n");

		// Cursor is on the `- not a list` line inside the fence (0-based line index = 3).
		expect(findActiveListItemBlockIdInContent(doc, 3)).toBe("a1");
	});

	test("findBlockTargetFromLine resolves [[file#^id]] to a TFile", () => {
		const app = new App();
		const vault: any = app.vault as any;
		vault._addFile("A.md", "- A");
		const src = vault._addFile("B.md", "- link [[A.md#^a1]]");

		(app.metadataCache as any).getFirstLinkpathDest = (linkpath: string) => vault.getAbstractFileByPath(linkpath);

		const plugin = { app } as any;

		const out = findBlockTargetFromLine(plugin, { sourceFile: src, lineText: "- link [[A.md#^a1]]" });
		expect(out?.file?.path).toBe("A.md");
		expect(out?.id).toBe("a1");
	});

});
