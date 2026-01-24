import { markdownPostProcessor } from "../MarkdownPost";
import { App } from "obsidian";

describe("markdownPostProcessor", () => {
	test("does not remove rendered text content", () => {
		const el = document.createElement("div");
		el.innerHTML = "<p>Hello world 123</p><p>Second line</p>";

		const app = new App();
		const file = (app.vault as any)._addFile("test.md", "");
		(app.metadataCache as any)._setFileCache(file, {
			frontmatter: {
				blp_enhanced_list: true,
				position: {
					start: { line: 0, col: 0, offset: 0 },
					end: { line: 0, col: 0, offset: 0 },
				},
			},
		});

		const plugin = {
			app,
			settings: {
				time_section_plain_style: false,
				time_section_title_pattern: "\\\\d{1,2}:\\\\d{1,2}",
				enhancedListEnabledFolders: [],
				enhancedListEnabledFiles: [],
			},
		} as any;

		markdownPostProcessor(el, { sourcePath: file.path } as any, plugin);

		expect(el.textContent).toContain("Hello world 123");
		expect(el.textContent).toContain("Second line");
	});

	test("removes enhanced list system line text", () => {
		const el = document.createElement("div");
		el.innerHTML = "<p>Foo [date:: 2026-01-09T10:20:30] ^abc</p>";

		const app = new App();
		const file = (app.vault as any)._addFile("test.md", "");
		(app.metadataCache as any)._setFileCache(file, {
			frontmatter: {
				blp_enhanced_list: true,
				position: {
					start: { line: 0, col: 0, offset: 0 },
					end: { line: 0, col: 0, offset: 0 },
				},
			},
		});

		const plugin = {
			app,
			settings: {
				time_section_plain_style: false,
				time_section_title_pattern: "\\\\d{1,2}:\\\\d{1,2}",
				enhancedListEnabledFolders: [],
				enhancedListEnabledFiles: [],
			},
		} as any;

		markdownPostProcessor(el, { sourcePath: file.path } as any, plugin);

		expect(el.textContent).toContain("Foo");
		expect(el.textContent).not.toContain("[date::");
	});
});
