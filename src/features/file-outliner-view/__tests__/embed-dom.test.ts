import { normalizeInternalMarkdownEmbeds } from "../embed-dom";

describe("file-outliner-view/embed-dom", () => {
	test("adds `.markdown-embed-content` when missing and wraps preview content", () => {
		const root = document.createElement("div");
		root.innerHTML = `
			<span class="internal-embed markdown-embed inline-embed">
				<div class="markdown-embed-title"></div>
				<div class="markdown-preview-view"><div class="markdown-preview-sizer">x</div></div>
			</span>
		`;

		const embed = root.querySelector(".internal-embed.markdown-embed") as HTMLElement;
		expect(embed).toBeTruthy();
		expect(embed.querySelector(":scope > .markdown-embed-content")).toBeNull();

		const res = normalizeInternalMarkdownEmbeds(root);
		expect(res.normalized).toBe(1);

		const content = embed.querySelector(":scope > .markdown-embed-content") as HTMLElement;
		expect(content).toBeTruthy();
		expect(content.querySelector(":scope > .markdown-preview-view")).toBeTruthy();
		expect(embed.querySelector(":scope > .markdown-preview-view")).toBeNull();
	});

	test("is idempotent when the wrapper already exists", () => {
		const root = document.createElement("div");
		// Single-line HTML avoids introducing whitespace text nodes as direct children.
		root.innerHTML =
			'<div class="internal-embed markdown-embed"><div class="markdown-embed-title"></div><div class="markdown-embed-content"><div class="markdown-preview-view"><div class="markdown-preview-sizer">x</div></div></div></div>';

		const res1 = normalizeInternalMarkdownEmbeds(root);
		const res2 = normalizeInternalMarkdownEmbeds(root);

		expect(res1.normalized).toBe(0);
		expect(res2.normalized).toBe(0);
		expect(root.querySelectorAll(".markdown-embed-content").length).toBe(1);
	});

	test("preserves title/link as direct children and moves other nodes into wrapper", () => {
		const root = document.createElement("div");
		root.innerHTML = `
			<div class="internal-embed markdown-embed">
				<div class="markdown-embed-title"></div>
				<div class="markdown-embed-link"></div>
				<div class="markdown-preview-view">pv</div>
			</div>
		`;

		const embed = root.querySelector(".internal-embed.markdown-embed") as HTMLElement;
		const res = normalizeInternalMarkdownEmbeds(root);
		expect(res.normalized).toBe(1);

		const directKids = Array.from(embed.children).map((c) => (c as HTMLElement).className);
		expect(directKids).toEqual(["markdown-embed-title", "markdown-embed-link", "markdown-embed-content"]);

		const content = embed.querySelector(":scope > .markdown-embed-content") as HTMLElement;
		expect(content.textContent).toContain("pv");
	});
});
