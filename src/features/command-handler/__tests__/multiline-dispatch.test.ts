import { MockEditor } from "../../../test-utils/MockEditor";

jest.mock("../../../utils", () => {
	const actual = jest.requireActual("../../../utils");
	return {
		...actual,
		generateRandomId: jest.fn(),
	};
});

import { generateRandomId } from "../../../utils";
import { DEFAULT_SETTINGS, MultLineHandle } from "../../../types";
import { handleCommand } from "../index";
import { BLP_BLOCK_MARKER } from "shared/block-marker";

const mockGenerateRandomId = generateRandomId as unknown as jest.MockedFunction<
	typeof generateRandomId
>;

function section(type: string, startLine: number, endLine: number, endCol: number, id?: string) {
	return {
		type,
		id,
		position: {
			start: { line: startLine, col: 0, offset: 0 },
			end: { line: endLine, col: endCol, offset: 0 },
		},
	} as any;
}

function installClipboardMock() {
	const writeText = jest.fn().mockResolvedValue(undefined);
	Object.defineProperty(navigator, "clipboard", {
		value: { writeText },
		configurable: true,
	});
	return writeText as jest.Mock;
}

function createPlugin(overrides: Partial<typeof DEFAULT_SETTINGS> = {}) {
	const settings = {
		...DEFAULT_SETTINGS,
		...overrides,
		// Avoid UI noise in tests.
		enable_block_notification: false,
		enable_embed_notification: false,
		enable_url_notification: false,
	} as any;

	const app = {
		metadataCache: {
			getFileCache: jest.fn(),
		},
		fileManager: {
			generateMarkdownLink: jest.fn((file: any, _sourcePath: string, subpath: string, alias: string) => {
				return `[[${file.path}${subpath}${alias ? `|${alias}` : ""}]]`;
			}),
		},
		vault: {
			getName: jest.fn(() => "vault"),
		},
	} as any;

	return { app, settings } as any;
}

describe("command-handler multiline dispatch", () => {
	beforeEach(() => {
		mockGenerateRandomId.mockReset();
	});

	test("MultLineHandle.heading: does not throw and copies the marker link", () => {
		const writeText = installClipboardMock();
		mockGenerateRandomId.mockReturnValueOnce("abc123");

		const editor = new MockEditor(["line 1", "line 2"].join("\n"));
		editor.setSelection({ line: 0, ch: 0 }, { line: 1, ch: 0 });

		const fileCache: any = {
			headings: [],
			sections: [section("paragraph", 0, 1, editor.getLine(1).length)],
			listItems: [],
		};

		const plugin = createPlugin({ mult_line_handle: MultLineHandle.heading });
		const file: any = { path: "sample" };
		plugin.app.metadataCache.getFileCache.mockReturnValue(fileCache);

		expect(() => handleCommand(plugin, false, editor as any, { file } as any, false)).not.toThrow();

		expect(writeText).toHaveBeenCalledTimes(1);
		expect(writeText.mock.calls[0]?.[0]).toBe(`[[sample#${BLP_BLOCK_MARKER}abc123]]`);
	});

	test("MultLineHandle.multblock: generates per-block ids (not an empty anchor)", () => {
		const writeText = installClipboardMock();
		mockGenerateRandomId.mockReturnValueOnce("a11111").mockReturnValueOnce("b22222");

		const editor = new MockEditor(["p1a", "p1b", "", "p2a", "p2b"].join("\n"));
		editor.setSelection({ line: 1, ch: 0 }, { line: 3, ch: 2 });

		const fileCache: any = {
			headings: [],
			sections: [
				section("paragraph", 0, 1, editor.getLine(1).length),
				section("paragraph", 3, 4, editor.getLine(4).length),
			],
			listItems: [],
		};

		const plugin = createPlugin({ mult_line_handle: MultLineHandle.multblock });
		const file: any = { path: "sample" };
		plugin.app.metadataCache.getFileCache.mockReturnValue(fileCache);

		expect(() => handleCommand(plugin, false, editor as any, { file } as any, false)).not.toThrow();

		expect(writeText).toHaveBeenCalledTimes(1);
		expect(writeText.mock.calls[0]?.[0]).toBe(
			"[[sample#^a11111]]\n[[sample#^b22222]]"
		);
	});
});

