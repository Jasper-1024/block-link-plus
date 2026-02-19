import { InlineEditEngine } from "../InlineEditEngine";

function createEmbed(src: string) {
	const el = document.createElement("div");
	el.setAttribute("src", src);
	return el;
}

function createPlugin(settings: Partial<any>) {
	return {
		settings: {
			inlineEditEnabled: true,
			inlineEditFile: false,
			inlineEditHeading: true,
			inlineEditBlock: true,
			...settings,
		},
		app: {
			metadataCache: {
				getFirstLinkpathDest: jest.fn(),
			},
		},
	} as any;
}

describe("InlineEditEngine parseInlineEmbed (file embed)", () => {
	test("returns null when inlineEditFile is disabled", () => {
		const plugin = createPlugin({ inlineEditFile: false });
		const engine = new InlineEditEngine(plugin);
		const embedEl = createEmbed("2/sample|sample");
		const ctx: any = { sourcePath: "1/host.md" };

		const result = (engine as any).parseInlineEmbed(embedEl, ctx);

		expect(result).toBeNull();
		expect(plugin.app.metadataCache.getFirstLinkpathDest).not.toHaveBeenCalled();
	});

	test("parses ![[file]] embeds when inlineEditFile is enabled", () => {
		const plugin = createPlugin({ inlineEditFile: true });
		const file: any = { path: "2/sample.md" };
		plugin.app.metadataCache.getFirstLinkpathDest.mockReturnValue(file);

		const engine = new InlineEditEngine(plugin);
		const embedEl = createEmbed("2/sample|sample");
		const ctx: any = { sourcePath: "1/host.md" };

		const result = (engine as any).parseInlineEmbed(embedEl, ctx);

		expect(plugin.app.metadataCache.getFirstLinkpathDest).toHaveBeenCalledWith("2/sample", "1/host.md");
		expect(result).toEqual({
			kind: "file",
			file,
			subpath: "",
			visibleRange: [1, Number.MAX_SAFE_INTEGER],
			editableRange: [1, Number.MAX_SAFE_INTEGER],
		});
	});

	test("does not treat embeds with # as file embeds", () => {
		const plugin = createPlugin({ inlineEditFile: true, inlineEditHeading: false, inlineEditBlock: false });
		const engine = new InlineEditEngine(plugin);
		const embedEl = createEmbed("2/sample#heading");
		const ctx: any = { sourcePath: "1/host.md" };

		const result = (engine as any).parseInlineEmbed(embedEl, ctx);

		expect(result).toBeNull();
		expect(plugin.app.metadataCache.getFirstLinkpathDest).not.toHaveBeenCalled();
	});
});
