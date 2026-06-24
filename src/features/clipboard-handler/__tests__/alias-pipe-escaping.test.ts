import { copyToClipboard, escapeUnescapedAliasPipes } from "../index";
import { DEFAULT_SETTINGS } from "../../../types";

function installClipboardMock() {
	const writeText = jest.fn().mockResolvedValue(undefined);
	Object.defineProperty(navigator, "clipboard", {
		value: { writeText },
		configurable: true,
	});
	return writeText as jest.Mock;
}

function createApp() {
	return {
		fileManager: {
			generateMarkdownLink: jest.fn((file: any, _sourcePath: string, subpath: string, alias: string) => {
				return `[[${file.path}${subpath}${alias ? `|${alias}` : ""}]]`;
			}),
		},
		vault: {
			getName: jest.fn(() => "vault"),
		},
	} as any;
}

function createSettings(overrides: Partial<typeof DEFAULT_SETTINGS> = {}) {
	return {
		...DEFAULT_SETTINGS,
		...overrides,
		enable_block_notification: false,
		enable_embed_notification: false,
		enable_url_notification: false,
	};
}

describe("clipboard alias pipe escaping", () => {
	test("escapes unescaped pipe characters by default", () => {
		const writeText = installClipboardMock();
		const app = createApp();
		const file = { path: "Daily.md" } as any;

		copyToClipboard(app, createSettings(), file, "abc123", false, "alpha|beta");

		expect(app.fileManager.generateMarkdownLink).toHaveBeenCalledWith(file, "", "#abc123", "alpha\\|beta");
		expect(writeText).toHaveBeenCalledWith("[[Daily.md#abc123|alpha\\|beta]]");
	});

	test("leaves alias pipe characters unchanged when the setting is disabled", () => {
		const writeText = installClipboardMock();
		const app = createApp();
		const file = { path: "Daily.md" } as any;

		copyToClipboard(app, createSettings({ escape_alias_pipe: false }), file, "abc123", false, "alpha|beta");

		expect(app.fileManager.generateMarkdownLink).toHaveBeenCalledWith(file, "", "#abc123", "alpha|beta");
		expect(writeText).toHaveBeenCalledWith("[[Daily.md#abc123|alpha|beta]]");
	});

	test("does not double escape already escaped pipe characters", () => {
		expect(escapeUnescapedAliasPipes("alpha\\|beta|gamma")).toBe("alpha\\|beta\\|gamma");
	});

	test("escapes alias arrays independently for multiline link copies", () => {
		const writeText = installClipboardMock();
		const app = createApp();
		const file = { path: "Daily.md" } as any;

		copyToClipboard(app, createSettings(), file, ["a111", "b222"], false, ["one|two", "three\\|four"]);

		expect(app.fileManager.generateMarkdownLink).toHaveBeenNthCalledWith(1, file, "", "#a111", "one\\|two");
		expect(app.fileManager.generateMarkdownLink).toHaveBeenNthCalledWith(2, file, "", "#b222", "three\\|four");
		expect(writeText).toHaveBeenCalledWith("[[Daily.md#a111|one\\|two]]\n[[Daily.md#b222|three\\|four]]");
	});

	test("does not apply alias escaping to Obsidian URI output", () => {
		const writeText = installClipboardMock();
		const app = createApp();
		const file = { path: "Daily.md" } as any;

		copyToClipboard(app, createSettings(), file, "abc123", false, "alpha|beta", true);

		expect(app.fileManager.generateMarkdownLink).not.toHaveBeenCalled();
		expect(writeText).toHaveBeenCalledWith("obsidian://open?vault=vault&file=Daily.md%23abc123");
	});
});
