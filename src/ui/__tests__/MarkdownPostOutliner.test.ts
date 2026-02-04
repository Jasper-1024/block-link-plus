import { App } from "obsidian";
import { fileOutlinerMarkdownPostProcessor } from "../MarkdownPostOutliner";

describe("fileOutlinerMarkdownPostProcessor", () => {
	test("does not remove rendered text content", () => {
		const el = document.createElement("div");
		el.innerHTML = "<p>Hello world 123</p><p>Second line</p>";

		const app = new App();
		const file = (app.vault as any)._addFile("test.md", "");

		const plugin = {
			app,
			settings: {
				fileOutlinerEnabledFolders: [],
				fileOutlinerEnabledFiles: [],
				fileOutlinerHideSystemLine: true,
			},
		} as any;

		fileOutlinerMarkdownPostProcessor(el, { sourcePath: file.path } as any, plugin);

		expect(el.textContent).toContain("Hello world 123");
		expect(el.textContent).toContain("Second line");
	});

	test("hides outliner v2 system tail line tokens when blp_sys marker is present", () => {
		const el = document.createElement("div");
		el.innerHTML =
			"<ul><li>Foo<br>[date:: 2026-01-09T10:20:30] [blp_sys:: 1] [blp_ver:: 2] ^abc</li></ul>";

		const app = new App();
		const file = (app.vault as any)._addFile("test.md", "");

		const plugin = {
			app,
			settings: {
				fileOutlinerEnabledFolders: [],
				fileOutlinerEnabledFiles: [],
				fileOutlinerHideSystemLine: true,
			},
		} as any;

		fileOutlinerMarkdownPostProcessor(el, { sourcePath: file.path } as any, plugin);

		expect(el.textContent).toContain("Foo");

		const hiddenMarker = Array.from(
			el.querySelectorAll('span[data-blp-outliner-system-line-hidden="token"]')
		).find((n) => (n.textContent ?? "").includes("[blp_sys::"));

		expect(hiddenMarker).toBeTruthy();
	});

	test("does not hide system tail line when setting is off", () => {
		const el = document.createElement("div");
		el.innerHTML =
			"<ul><li>Foo<br>[date:: 2026-01-09T10:20:30] [blp_sys:: 1] [blp_ver:: 2] ^abc</li></ul>";

		const app = new App();
		const file = (app.vault as any)._addFile("test.md", "");

		const plugin = {
			app,
			settings: {
				fileOutlinerEnabledFolders: [],
				fileOutlinerEnabledFiles: [],
				fileOutlinerHideSystemLine: false,
			},
		} as any;

		fileOutlinerMarkdownPostProcessor(el, { sourcePath: file.path } as any, plugin);

		expect(el.querySelector('span[data-blp-outliner-system-line-hidden="token"]')).toBeNull();
	});
});

