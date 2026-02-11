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

	test("hides system tail inline-fields when dataview omits blp_sys (fallback via blp_ver)", () => {
		const el = document.createElement("div");
		el.innerHTML = [
			"<ul>",
			'<li dir="auto">',
			"child",
			'<span class="dataview inline-field"><span class="dataview inline-field-key" data-dv-key="date" data-dv-norm-key="date">date</span><span class="dataview inline-field-value">2026-02-06</span></span>',
			'<span class="dataview inline-field"><span class="dataview inline-field-key" data-dv-key="updated" data-dv-norm-key="updated">updated</span><span class="dataview inline-field-value">2026-02-06</span></span>',
			" blp_sys1 ",
			'<span class="dataview inline-field"><span class="dataview inline-field-key" data-dv-key="blp_ver" data-dv-norm-key="blp_ver">blp_ver</span><span class="dataview inline-field-value">2</span></span>',
			"</li>",
			"</ul>",
		].join("");

		const app = new App();
		const file = (app.vault as any)._addFile("test.md", "");

		const plugin = {
			app,
			settings: {
				fileOutlinerEnabledFolders: [],
				fileOutlinerEnabledFiles: [file.path],
				fileOutlinerHideSystemLine: true,
			},
		} as any;

		fileOutlinerMarkdownPostProcessor(el, { sourcePath: file.path } as any, plugin);

		const hiddenInlineFields = Array.from(el.querySelectorAll<HTMLElement>(".dataview.inline-field")).filter(
			(n) => n.style.display === "none"
		);

		expect(hiddenInlineFields.length).toBeGreaterThan(0);
		expect(hiddenInlineFields.some((n) => (n.textContent ?? "").includes("blp_ver"))).toBe(true);

		const hiddenRawToken = Array.from(
			el.querySelectorAll<HTMLElement>('span[data-blp-outliner-system-line-hidden="token"]')
		).find((n) => /blp_sys/i.test(n.textContent ?? ""));

		expect(hiddenRawToken).toBeTruthy();
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
