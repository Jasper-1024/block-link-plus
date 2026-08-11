import { readFileSync } from "fs";
import path from "path";

const cssPath = path.resolve(__dirname, "../../../css/Editor/InlineEdit/InlineEditEngine.css");

describe("InlineEditEngine layout CSS", () => {
	test("hides only the active embed's own native preview", () => {
		const css = readFileSync(cssPath, "utf8");
		const hideRule = css.match(/^\s*([^{}]+)\{/m);

		expect(hideRule).not.toBeNull();

		const selector = hideRule?.[1]?.trim();
		expect(selector).toBeTruthy();

		const outerEmbed = document.createElement("div");
		outerEmbed.className = "internal-embed markdown-embed blp-inline-edit-active";

		const outerContent = document.createElement("div");
		outerContent.className = "markdown-embed-content";
		const outerPreview = document.createElement("div");
		outerPreview.className = "markdown-preview-view";
		outerContent.appendChild(outerPreview);

		const host = document.createElement("div");
		host.className = "blp-inline-edit-host";
		const editor = document.createElement("div");
		editor.className = "cm-editor";

		const nestedEmbed = document.createElement("div");
		nestedEmbed.className = "internal-embed markdown-embed";
		const nestedContent = document.createElement("div");
		nestedContent.className = "markdown-embed-content";
		const nestedPreview = document.createElement("div");
		nestedPreview.className = "markdown-preview-view";

		nestedContent.appendChild(nestedPreview);
		nestedEmbed.appendChild(nestedContent);
		editor.appendChild(nestedEmbed);
		host.appendChild(editor);
		outerContent.appendChild(host);
		outerEmbed.appendChild(outerContent);
		document.body.appendChild(outerEmbed);

		expect(outerPreview.matches(selector as string)).toBe(true);
		expect(nestedPreview.matches(selector as string)).toBe(false);
	});

	test("does not force extra bottom padding inside the embedded editor content", () => {
		const css = readFileSync(cssPath, "utf8");
		const match = css.match(/\.blp-inline-edit-root\s+\.cm-content\s*\{([^}]+)\}/);

		expect(match).not.toBeNull();

		const declarations = match?.[1] ?? "";
		const paddingBottom = declarations.match(/padding-bottom\s*:\s*([^;!]+)(?:!\s*important)?\s*;/)?.[1]?.trim();

		expect(paddingBottom === undefined || paddingBottom === "0" || paddingBottom === "0px").toBe(true);
		expect(declarations).not.toMatch(/padding-bottom\s*:\s*18px\b/);
	});
});
