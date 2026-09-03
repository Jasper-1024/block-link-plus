import { getLineRangeFromRef } from "shared/utils/obsidian";

import { InlineEditEngine } from "../InlineEditEngine";

jest.mock("shared/utils/obsidian", () => ({
	getLineRangeFromRef: jest.fn(),
}));

function createPlugin() {
	return {
		settings: {
			inlineEditEnabled: true,
			inlineEditFile: false,
			inlineEditHeading: true,
			inlineEditBlock: false,
		},
		app: {
			metadataCache: {
				getFirstLinkpathDest: jest.fn(),
			},
		},
	} as any;
}

describe("InlineEditEngine heading embeds", () => {
	test("keeps a heading-only section searchable as a read-only participant", () => {
		const getLineRange = getLineRangeFromRef as jest.MockedFunction<typeof getLineRangeFromRef>;
		getLineRange.mockReturnValue([3, 3]);

		const plugin = createPlugin();
		const file = { path: "source.md" };
		plugin.app.metadataCache.getFirstLinkpathDest.mockReturnValue(file);
		const engine = new InlineEditEngine(plugin);
		const embedEl = document.createElement("div");
		embedEl.setAttribute("src", "source#Only heading");

		const result = (engine as any).parseInlineEmbed(embedEl, { sourcePath: "host.md" }, true);

		expect(result).toEqual({
			kind: "heading",
			file,
			subpath: "#Only heading",
			visibleRange: [3, 3],
			editableRange: [3, 3],
			readOnly: true,
		});
	});

	test("does not opt File Outliner into heading-only inline editing", () => {
		const getLineRange = getLineRangeFromRef as jest.MockedFunction<typeof getLineRangeFromRef>;
		getLineRange.mockReturnValue([3, 3]);

		const plugin = createPlugin();
		const file = { path: "source.md" };
		plugin.app.metadataCache.getFirstLinkpathDest.mockReturnValue(file);
		const engine = new InlineEditEngine(plugin);
		const embedEl = document.createElement("div");
		embedEl.setAttribute("src", "source#Only heading");

		expect((engine as any).parseInlineEmbed(embedEl, { sourcePath: "host.md" })).toBeNull();
	});
});
