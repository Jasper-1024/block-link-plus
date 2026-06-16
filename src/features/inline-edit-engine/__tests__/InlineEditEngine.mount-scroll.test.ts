import { InlineEditEngine } from "../InlineEditEngine";

beforeAll(() => {
	(HTMLElement.prototype as any).addClass = function addClass(className: string) {
		this.classList.add(className);
	};
	(HTMLElement.prototype as any).removeClass = function removeClass(className: string) {
		this.classList.remove(className);
	};
	(HTMLElement.prototype as any).detach = function detach() {
		this.remove();
	};
});

function createPlugin() {
	return {
		settings: {
			inlineEditEnabled: true,
			inlineEditFile: false,
			inlineEditHeading: true,
			inlineEditBlock: true,
		},
		app: {
			metadataCache: {
				getFirstLinkpathDest: jest.fn(),
			},
		},
	} as any;
}

function createEmbedShell(livePreview: boolean) {
	const rootEl = document.createElement("div");
	rootEl.className = livePreview ? "markdown-source-view is-live-preview" : "blp-file-outliner-view";

	const embedEl = document.createElement("div");
	embedEl.className = "internal-embed markdown-embed inline-embed is-loaded";

	const contentEl = document.createElement("div");
	contentEl.className = "markdown-embed-content";
	embedEl.appendChild(contentEl);
	rootEl.appendChild(embedEl);
	document.body.appendChild(rootEl);

	return { rootEl, embedEl };
}

function createFakeCm() {
	const contentDOM = document.createElement("div");
	const cm = {
		contentDOM,
		requestMeasure: jest.fn(),
		dispatch: jest.fn(),
		state: {
			doc: { length: 0, lines: 6 },
			field: jest.fn(() => null),
		},
	};
	return cm as any;
}

function installMountMocks(engine: InlineEditEngine) {
	const viewContainerEl = document.createElement("div");
	viewContainerEl.className = "markdown-source-view";
	const editor = {
		setCursor: jest.fn(),
		scrollIntoView: jest.fn(),
		focus: jest.fn(),
	};
	const embed = {
		containerEl: document.createElement("div"),
		file: { path: "target.md" },
		sourcePath: "host.md",
		component: {},
		leaf: {},
		view: {
			containerEl: viewContainerEl,
			editor,
		},
	};
	const cm = createFakeCm();
	const hostRequestMeasure = jest.fn();

	jest.spyOn((engine as any).leaves, "isNestedWithinEmbed").mockReturnValue(false);
	jest.spyOn((engine as any).leaves, "isLegacyDoubleBangEmbed").mockReturnValue(false);
	jest.spyOn((engine as any).leaves, "createEmbedLeaf").mockResolvedValue(embed as any);
	jest.spyOn((engine as any).leaves, "reparent").mockImplementation((hostEl: HTMLElement, containerEl: HTMLElement) => {
		hostEl.replaceChildren(containerEl);
	});
	jest.spyOn((engine as any).leaves, "detach").mockImplementation(jest.fn());
	jest.spyOn(engine as any, "parseInlineEmbed").mockReturnValue({
		kind: "block",
		file: { path: "target.md" },
		subpath: "#^block",
		visibleRange: [1, 4],
		editableRange: [2, 4],
	});
	jest.spyOn(engine as any, "waitForEditorView").mockResolvedValue(cm);
	jest.spyOn(engine as any, "ensureEmbedEditorExtensions").mockImplementation(jest.fn());
	jest.spyOn(engine as any, "resolveEmbedLineRanges").mockReturnValue({
		visibleRange: [1, 4],
		editableRange: [2, 4],
	});
	jest.spyOn(engine as any, "attachHostRemeasure").mockReturnValue(jest.fn());

	return {
		cm,
		editor,
		hostView: { editor: { cm: { requestMeasure: hostRequestMeasure } } } as any,
		hostRequestMeasure,
	};
}

afterEach(() => {
	document.body.replaceChildren();
	jest.restoreAllMocks();
});

describe("InlineEditEngine mount scroll side effects", () => {
	test("passive Live Preview mount skips embedded editor cursor and reveal calls", async () => {
		const engine = new InlineEditEngine(createPlugin());
		const { embedEl } = createEmbedShell(true);
		const { cm, editor, hostView, hostRequestMeasure } = installMountMocks(engine);

		await (engine as any).mountInlineEmbedCore(embedEl, { sourcePath: "host.md" }, {
			requireLivePreview: true,
			hostView,
			origin: "live-preview",
		});

		expect(editor.setCursor).not.toHaveBeenCalled();
		expect(editor.scrollIntoView).not.toHaveBeenCalled();
		expect(cm.requestMeasure).toHaveBeenCalledTimes(1);
		expect(cm.dispatch).toHaveBeenCalledWith(
			expect.objectContaining({
				filter: false,
				annotations: expect.any(Array),
			})
		);
		expect(hostRequestMeasure).toHaveBeenCalledTimes(1);
	});

	test("non-passive outliner mount keeps existing embedded editor cursor and reveal behavior", async () => {
		const engine = new InlineEditEngine(createPlugin());
		const { embedEl } = createEmbedShell(false);
		const { editor } = installMountMocks(engine);

		await (engine as any).mountInlineEmbedCore(embedEl, { sourcePath: "host.md" }, {
			requireLivePreview: false,
			origin: "outliner",
		});

		expect(editor.setCursor).toHaveBeenCalledWith({ line: 1, ch: 0 });
		expect(editor.scrollIntoView).toHaveBeenCalledWith(
			{ from: { line: 1, ch: 0 }, to: { line: 1, ch: 0 } },
			true
		);
	});

	test("user interaction after passive mount focuses the embedded editor without reveal calls", async () => {
		const engine = new InlineEditEngine(createPlugin());
		const { embedEl } = createEmbedShell(true);
		const { editor, hostView } = installMountMocks(engine);

		await (engine as any).mountInlineEmbedCore(embedEl, { sourcePath: "host.md" }, {
			requireLivePreview: true,
			hostView,
			origin: "live-preview",
		});

		const hostEl = embedEl.querySelector<HTMLElement>(".blp-inline-edit-host");
		expect(hostEl).not.toBeNull();

		hostEl?.dispatchEvent(new MouseEvent("mousedown", { bubbles: true }));

		expect(editor.focus).toHaveBeenCalledTimes(1);
		expect(editor.setCursor).not.toHaveBeenCalled();
		expect(editor.scrollIntoView).not.toHaveBeenCalled();
	});
});
