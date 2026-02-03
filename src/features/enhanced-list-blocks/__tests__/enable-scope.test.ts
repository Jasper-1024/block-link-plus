import { App } from "obsidian";
import { getEnhancedListEnabledMarkdownFiles, isEnhancedListEnabledFile } from "../enable-scope";

function makePlugin(overrides: Partial<any> = {}) {
	const app = new App();
	const plugin = {
		app,
		settings: {
			enhancedListEnabledFolders: [],
			enhancedListEnabledFiles: [],
		},
		...overrides,
	} as any;

	return { app, plugin };
}

describe("enhanced-list-blocks/enable-scope", () => {
	test("returns false for non-markdown files", () => {
		const { app, plugin } = makePlugin({
			settings: { enhancedListEnabledFolders: ["/"], enhancedListEnabledFiles: [] },
		});
		const file = (app.vault as any)._addFile("Daily/foo.txt", "");

		expect(isEnhancedListEnabledFile(plugin, file)).toBe(false);
	});

	test("folder '/' enables all markdown files", () => {
		const { app, plugin } = makePlugin({
			settings: { enhancedListEnabledFolders: ["/"], enhancedListEnabledFiles: [] },
		});
		const file = (app.vault as any)._addFile("Daily/2026-01-09.md", "");

		expect(isEnhancedListEnabledFile(plugin, file)).toBe(true);
	});

	test("matches enabled files with path normalization", () => {
		const { app, plugin } = makePlugin({
			settings: { enhancedListEnabledFolders: [], enhancedListEnabledFiles: ["Daily\\2026-01-09.md"] },
		});
		const file = (app.vault as any)._addFile("Daily/2026-01-09.md", "");

		expect(isEnhancedListEnabledFile(plugin, file)).toBe(true);
	});

	test("matches enabled folders recursively (and trims slashes)", () => {
		const { app, plugin } = makePlugin({
			settings: { enhancedListEnabledFolders: ["//Daily/"], enhancedListEnabledFiles: [] },
		});
		const file = (app.vault as any)._addFile("Daily/2026-01-09.md", "");

		expect(isEnhancedListEnabledFile(plugin, file)).toBe(true);
	});

	test("supports frontmatter opt-in (boolean, string, number)", () => {
		const { app, plugin } = makePlugin();
		const fileBool = (app.vault as any)._addFile("Daily/a.md", "");
		const fileString = (app.vault as any)._addFile("Daily/b.md", "");
		const fileNum = (app.vault as any)._addFile("Daily/c.md", "");

		(app.metadataCache as any)._setFileCache(fileBool, {
			frontmatter: { blp_enhanced_list: true, position: { start: {}, end: {} } },
		});
		(app.metadataCache as any)._setFileCache(fileString, {
			frontmatter: { blp_enhanced_list: "true", position: { start: {}, end: {} } },
		});
		(app.metadataCache as any)._setFileCache(fileNum, {
			frontmatter: { blp_enhanced_list: 1, position: { start: {}, end: {} } },
		});

		expect(isEnhancedListEnabledFile(plugin, fileBool)).toBe(true);
		expect(isEnhancedListEnabledFile(plugin, fileString)).toBe(true);
		expect(isEnhancedListEnabledFile(plugin, fileNum)).toBe(true);
	});

	test("supports frontmatter opt-out (overrides enabled folder/file scope)", () => {
		const { app, plugin } = makePlugin({
			settings: {
				enhancedListEnabledFolders: ["Daily"],
				enhancedListEnabledFiles: ["Inbox/force-on.md"],
			},
		});

		const inFolder = (app.vault as any)._addFile("Daily/in-folder.md", "");
		const inEnabledFiles = (app.vault as any)._addFile("Inbox/force-on.md", "");
		const outOfScope = (app.vault as any)._addFile("Inbox/out-of-scope.md", "");

		(app.metadataCache as any)._setFileCache(inFolder, {
			frontmatter: { blp_enhanced_list: false, position: { start: {}, end: {} } },
		});
		(app.metadataCache as any)._setFileCache(inEnabledFiles, {
			frontmatter: { blp_enhanced_list: "false", position: { start: {}, end: {} } },
		});
		(app.metadataCache as any)._setFileCache(outOfScope, {
			frontmatter: { blp_enhanced_list: 0, position: { start: {}, end: {} } },
		});

		expect(isEnhancedListEnabledFile(plugin, inFolder)).toBe(false);
		expect(isEnhancedListEnabledFile(plugin, inEnabledFiles)).toBe(false);
		expect(isEnhancedListEnabledFile(plugin, outOfScope)).toBe(false);
	});

	test("getEnhancedListEnabledMarkdownFiles returns only enabled markdown files", () => {
		const { app, plugin } = makePlugin({
			settings: { enhancedListEnabledFolders: ["Daily"], enhancedListEnabledFiles: [] },
		});

		const mdEnabled = (app.vault as any)._addFile("Daily/2026-01-09.md", "");
		(app.vault as any)._addFile("Inbox/todo.md", "");
		(app.vault as any)._addFile("Daily/image.png", "");

		const result = getEnhancedListEnabledMarkdownFiles(plugin);

		expect(result.map((f: any) => f.path)).toEqual([mdEnabled.path]);
	});
});

