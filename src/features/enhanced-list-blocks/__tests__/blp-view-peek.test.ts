jest.mock("../block-peek", () => {
	const actual = jest.requireActual("../block-peek");
	return {
		...actual,
		openEnhancedListBlockPeek: jest.fn(),
	};
});

import { App } from "obsidian";
import { attachEnhancedListBlockPeekToRenderedBlpViewOutput } from "../blp-view";
import { openEnhancedListBlockPeek } from "../block-peek";

describe("enhanced-list-blocks/blp-view peek integration", () => {
	test("adds a peek button to rendered block embeds and wires click handler", () => {
		const app = new App();
		const vault: any = app.vault as any;
		const target = vault._addFile("A.md", "- A");

		(app.metadataCache as any).getFirstLinkpathDest = jest.fn(() => target);

		const plugin = { app } as any;

		const el = document.createElement("div");
		const embed = document.createElement("div");
		embed.className = "internal-embed markdown-embed";
		embed.setAttribute("src", "A#^a1");
		el.appendChild(embed);

		attachEnhancedListBlockPeekToRenderedBlpViewOutput(plugin, el, { sourcePath: "B.md" });

		const btn = embed.querySelector(".blp-block-peek-btn") as HTMLElement | null;
		expect(btn).toBeTruthy();

		btn?.dispatchEvent(new MouseEvent("click", { bubbles: true, cancelable: true }));

		expect(openEnhancedListBlockPeek).toHaveBeenCalledTimes(1);
		expect(openEnhancedListBlockPeek).toHaveBeenCalledWith(plugin, { file: target, blockId: "a1" });
	});

	test("does not duplicate peek button when called multiple times", () => {
		const app = new App();
		const vault: any = app.vault as any;
		const target = vault._addFile("A.md", "- A");

		(app.metadataCache as any).getFirstLinkpathDest = jest.fn(() => target);

		const plugin = { app } as any;

		const el = document.createElement("div");
		const embed = document.createElement("div");
		embed.className = "internal-embed markdown-embed";
		embed.setAttribute("src", "A#^a1");
		el.appendChild(embed);

		attachEnhancedListBlockPeekToRenderedBlpViewOutput(plugin, el, { sourcePath: "B.md" });
		attachEnhancedListBlockPeekToRenderedBlpViewOutput(plugin, el, { sourcePath: "B.md" });

		expect(embed.querySelectorAll(".blp-block-peek-btn").length).toBe(1);
	});
});

