import { EditorState, Transaction } from "@codemirror/state";
import { InlineEditEngine } from "../InlineEditEngine";
import { frontmatterFacet, selectiveLinesFacet } from "shared/utils/codemirror/selectiveEditor";

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

function createPlugin(settings: Partial<any> = {}) {
	return {
		settings: {
			inlineEditEnabled: true,
			inlineEditFile: false,
			inlineEditHeading: true,
			inlineEditBlock: true,
			...settings,
		},
		app: {
			commands: {
				executeCommand: jest.fn((command: any) => command.editorCallback?.()),
			},
			metadataCache: {
				getFirstLinkpathDest: jest.fn(),
			},
			workspace: {
				activeLeaf: { view: null },
				getActiveViewOfType: jest.fn(),
				getLeavesOfType: jest.fn(() => []),
			},
		},
	} as any;
}

function createEmbedShell(livePreview: boolean, src = "target#^block") {
	const rootEl = document.createElement("div");
	rootEl.className = livePreview ? "markdown-source-view is-live-preview" : "blp-file-outliner-view";

	const embedEl = document.createElement("div");
	embedEl.className = "internal-embed markdown-embed inline-embed is-loaded";
	embedEl.setAttribute("src", src);

	const contentEl = document.createElement("div");
	contentEl.className = "markdown-embed-content";
	embedEl.appendChild(contentEl);
	rootEl.appendChild(embedEl);
	document.body.appendChild(rootEl);

	return { rootEl, embedEl };
}

function createFakeCm() {
	const contentDOM = document.createElement("div");
	const cm: any = {
		contentDOM,
		requestMeasure: jest.fn(),
		state: EditorState.create({ doc: "one\ntwo\nthree\nfour\nfive\nsix" }),
	};
	cm.dispatch = jest.fn((spec: any) => {
		cm.state = cm.state.update(spec).state;
	});
	return cm as any;
}

function installMountMocks(
	engine: InlineEditEngine,
	options: { stubParse?: boolean; stubExtensions?: boolean } = {}
) {
	const viewContainerEl = document.createElement("div");
	viewContainerEl.className = "markdown-source-view";
	const editor = {
		setCursor: jest.fn(),
		scrollIntoView: jest.fn(),
		focus: jest.fn(),
	};
	const hostRequestMeasure = jest.fn();
	const hostEditor = {
		cm: { requestMeasure: hostRequestMeasure },
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
	(editor as any).replaceRange = jest.fn((replacement: string, from: any, to: any) => {
		const fromLine = cm.state.doc.line(from.line + 1).from + from.ch;
		const toLine = cm.state.doc.line(to.line + 1).from + to.ch;
		cm.dispatch({
			filter: false,
			changes: { from: fromLine, to: toLine, insert: replacement },
			annotations: Transaction.userEvent.of("input"),
		});
	});
	(editor as any).undo = jest.fn(() => {
		cm.dispatch({
			filter: false,
			changes: { from: 0, to: 0, insert: "undo mutation" },
			annotations: Transaction.userEvent.of("undo"),
		});
	});
	(editor as any).redo = jest.fn(() => {
		cm.dispatch({
			filter: false,
			changes: { from: 0, to: 0, insert: "redo mutation" },
			annotations: Transaction.userEvent.of("redo"),
		});
	});

	jest.spyOn((engine as any).leaves, "isNestedWithinEmbed").mockReturnValue(false);
	jest.spyOn((engine as any).leaves, "isLegacyDoubleBangEmbed").mockReturnValue(false);
	const createEmbedLeaf = jest.spyOn((engine as any).leaves, "createEmbedLeaf").mockImplementation(async (args: any) => {
		Object.assign(embed, {
			containerEl: args.containerEl,
			file: args.file,
			sourcePath: args.sourcePath,
			subpath: args.subpath,
			kind: args.kind,
			readOnly: args.readOnly,
		});
		return embed as any;
	});
	jest.spyOn((engine as any).leaves, "reparent").mockImplementation((hostEl: HTMLElement, containerEl: HTMLElement) => {
		hostEl.replaceChildren(containerEl);
	});
	jest.spyOn((engine as any).leaves, "detach").mockImplementation(jest.fn());
	if (options.stubParse !== false) {
		jest.spyOn(engine as any, "parseInlineEmbed").mockReturnValue({
			kind: "block",
			file: { path: "target.md" },
			subpath: "#^block",
			visibleRange: [1, 4],
			editableRange: [2, 4],
		});
	}
	jest.spyOn(engine as any, "waitForEditorView").mockResolvedValue(cm);
	if (options.stubExtensions !== false) {
		jest.spyOn(engine as any, "ensureEmbedEditorExtensions").mockImplementation(jest.fn());
	}
	jest.spyOn(engine as any, "resolveEmbedLineRanges").mockReturnValue({
		visibleRange: [1, 4],
		editableRange: [2, 4],
	});
	jest.spyOn(engine as any, "attachHostRemeasure").mockReturnValue(jest.fn());
	(engine as any).loaded = true;

	return {
		cm,
		editor,
		hostEditor,
		hostView: { editor: hostEditor } as any,
		hostRequestMeasure,
		embed,
		createEmbedLeaf,
	};
}

afterEach(() => {
	document.body.replaceChildren();
	jest.restoreAllMocks();
});

describe("InlineEditEngine mount scroll side effects", () => {
	test("passive Live Preview file embed mount skips cursor, reveal, and synthetic focus APIs", async () => {
		const plugin = createPlugin({ inlineEditFile: true, inlineEditHeading: false, inlineEditBlock: false });
		plugin.app.metadataCache.getFirstLinkpathDest.mockReturnValue({ path: "MOC.md" });
		const engine = new InlineEditEngine(plugin);
		const { embedEl } = createEmbedShell(true, "MOC");
		const { editor, hostEditor, hostView } = installMountMocks(engine, { stubParse: false });
		const elementScrollIntoView = jest.fn();
		const originalElementScrollIntoView = (HTMLElement.prototype as any).scrollIntoView;
		const elementFocus = jest.spyOn(HTMLElement.prototype, "focus").mockImplementation(jest.fn());
		(HTMLElement.prototype as any).scrollIntoView = elementScrollIntoView;

		try {
			await (engine as any).mountInlineEmbedCore(embedEl, { sourcePath: "host.md" }, {
				requireLivePreview: true,
				hostView,
				origin: "live-preview",
			});

			expect(plugin.app.metadataCache.getFirstLinkpathDest).toHaveBeenCalledWith("MOC", "host.md");
			expect(editor.setCursor).not.toHaveBeenCalled();
			expect(editor.scrollIntoView).not.toHaveBeenCalled();
			expect(editor.focus).not.toHaveBeenCalled();
			expect(hostEditor.setCursor).not.toHaveBeenCalled();
			expect(hostEditor.scrollIntoView).not.toHaveBeenCalled();
			expect(hostEditor.focus).not.toHaveBeenCalled();
			expect(elementScrollIntoView).not.toHaveBeenCalled();
			expect(elementFocus).not.toHaveBeenCalled();
		} finally {
			(HTMLElement.prototype as any).scrollIntoView = originalElementScrollIntoView;
		}
	});

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

	test("heading-only passive mounts are searchable but read-only", async () => {
		const plugin = createPlugin();
		const engine = new InlineEditEngine(plugin);
		const { embedEl } = createEmbedShell(true);
		const { cm, editor, hostView, embed } = installMountMocks(engine);
		jest.spyOn(engine as any, "parseInlineEmbed").mockReturnValue({
			kind: "heading",
			file: { path: "target.md" },
			subpath: "#Only heading",
			visibleRange: [1, 1],
			editableRange: [1, 1],
			readOnly: true,
		});

		await (engine as any).mountInlineEmbedCore(embedEl, { sourcePath: "host.md" }, {
			requireLivePreview: true,
			hostView,
			origin: "live-preview",
		});
		expect(cm.contentDOM.contentEditable).toBe("false");
		expect(cm.state.readOnly).toBe(true);
		expect(cm.dispatch).toHaveBeenCalledWith(
			expect.objectContaining({
				filter: false,
				effects: expect.anything(),
			})
		);

		const before = cm.state.doc.toString();
		(editor as any).replaceRange?.("mutated", { line: 0, ch: 0 }, { line: 0, ch: 0 });
		(editor as any).undo?.();
		(editor as any).redo?.();

		const command = {
			id: "editor:toggle-bold",
			editorCallback: (routedEditor: any) => {
				routedEditor.replaceRange("command mutation", { line: 0, ch: 0 }, { line: 0, ch: 0 });
			},
		};
		(engine as any).installCommandRouting();
		(engine as any).focus.setFocused(embed);
		plugin.app.commands.executeCommand(command);
		expect(cm.state.doc.toString()).toBe(before);
		(engine as any).uninstallCommandRouting();
	});

	test("allows trusted source synchronization while rejecting filter-false edits", async () => {
		const engine = new InlineEditEngine(createPlugin());
		const { embedEl } = createEmbedShell(true);
		const { cm, hostView } = installMountMocks(engine);
		jest.spyOn(engine as any, "parseInlineEmbed").mockReturnValue({
			kind: "heading",
			file: { path: "target.md" },
			subpath: "#Only heading",
			visibleRange: [1, 1],
			editableRange: [1, 1],
			readOnly: true,
		});

		await (engine as any).mountInlineEmbedCore(embedEl, { sourcePath: "host.md" }, {
			requireLivePreview: true,
			hostView,
			origin: "live-preview",
		});

		const syncedDocument = "# Only heading synced\n";
		cm.dispatch({
			changes: { from: 0, to: cm.state.doc.length, insert: syncedDocument },
			annotations: Transaction.userEvent.of("set"),
		});
		expect(cm.state.doc.toString()).toBe(syncedDocument);

		const filterFalseSyncedDocument = "# Only heading filter-false synced\n";
		cm.dispatch({
			filter: false,
			changes: { from: 0, to: cm.state.doc.length, insert: filterFalseSyncedDocument },
			annotations: Transaction.userEvent.of("set"),
		});
		expect(cm.state.doc.toString()).toBe(filterFalseSyncedDocument);

		cm.dispatch({
			filter: false,
			changes: { from: 0, to: cm.state.doc.length, insert: "blocked direct edit\n" },
		});
		expect(cm.state.doc.toString()).toBe(filterFalseSyncedDocument);
	});

	test("visible-only range marker lines reject direct edits while editable lines remain editable", async () => {
		const engine = new InlineEditEngine(createPlugin());
		const { embedEl } = createEmbedShell(true);
		const { cm, editor, hostView } = installMountMocks(engine, { stubExtensions: false });
		jest.spyOn(engine as any, "parseInlineEmbed").mockReturnValue({
			kind: "range",
			file: { path: "target.md" },
			subpath: "#^range-range",
			visibleRange: [1, 4],
			editableRange: [1, 3],
		});
		(engine as any).resolveEmbedLineRanges.mockReturnValue({
			visibleRange: [1, 4],
			editableRange: [1, 3],
		});

		await (engine as any).mountInlineEmbedCore(embedEl, { sourcePath: "host.md" }, {
			requireLivePreview: true,
			hostView,
			origin: "live-preview",
		});
		expect(cm.state.field(frontmatterFacet, false)).toEqual([1, 4]);
		expect(cm.state.field(selectiveLinesFacet, false)).toEqual([1, 3]);

		const before = cm.state.doc.toString();
		(editor as any).replaceRange?.("blocked", { line: 3, ch: 0 }, { line: 3, ch: 4 });
		expect(cm.state.doc.toString()).toBe(before);

		(editor as any).replaceRange?.("allowed", { line: 1, ch: 0 }, { line: 1, ch: 3 });
		expect(cm.state.doc.toString()).not.toBe(before);
	});

	test("non-passive outliner mount keeps existing embedded editor cursor and reveal behavior", async () => {
		const engine = new InlineEditEngine(createPlugin());
		const { embedEl } = createEmbedShell(false);
		const { cm, editor } = installMountMocks(engine);

		await (engine as any).mountInlineEmbedCore(embedEl, { sourcePath: "host.md" }, {
			requireLivePreview: false,
			origin: "outliner",
		});

		expect(editor.setCursor).toHaveBeenCalledWith({ line: 1, ch: 0 });
		expect(editor.scrollIntoView).toHaveBeenCalledWith(
			{ from: { line: 1, ch: 0 }, to: { line: 1, ch: 0 } },
			true
		);
		expect(cm.dispatch).not.toHaveBeenCalledWith(expect.objectContaining({ effects: expect.anything() }));
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

	test("cancels a pending mount when its ownership setting changes", async () => {
		const plugin = createPlugin();
		const engine = new InlineEditEngine(plugin);
		const { embedEl } = createEmbedShell(true);
		const { hostView, embed, createEmbedLeaf } = installMountMocks(engine);
		let resolveCreate!: (value: unknown) => void;
		const pendingCreate = new Promise((resolve) => {
			resolveCreate = resolve;
		});
		createEmbedLeaf.mockImplementation(async (args: any) => {
			Object.assign(embed, {
				containerEl: args.containerEl,
				file: args.file,
				sourcePath: args.sourcePath,
				subpath: args.subpath,
				kind: args.kind,
				readOnly: args.readOnly,
			});
			return pendingCreate;
		});

		const mount = (engine as any).mountInlineEmbedCore(embedEl, { sourcePath: "host.md" }, {
			requireLivePreview: true,
			hostView,
			origin: "live-preview",
		});
		plugin.settings.inlineEditBlock = false;
		engine.onSettingsChanged();
		resolveCreate(embed);
		await mount;

		expect((engine as any).leaves.detach).toHaveBeenCalledWith(embed);
		expect(embedEl.querySelector(".blp-inline-edit-host")).toBeNull();
	});

	test("preserves an eligible Live Preview mount across a forced refresh", async () => {
		const plugin = createPlugin();
		const engine = new InlineEditEngine(plugin);
		const { rootEl, embedEl } = createEmbedShell(true);
		const hostContainer = document.createElement("div");
		hostContainer.appendChild(rootEl);
		(document.body as HTMLElement).appendChild(hostContainer);
		const { hostView, embed, createEmbedLeaf } = installMountMocks(engine);
		Object.assign(hostView, {
			containerEl: hostContainer,
			file: { path: "host.md" },
			getMode: () => "source",
		});

		const scheduleObserverEntry = jest
			.spyOn(engine as any, "scheduleObserverEntry")
			.mockImplementation(jest.fn());
		(engine as any).ensureLivePreviewObserver(hostView);
		(engine as any).livePreviewObservers.get(hostView).pendingEmbeds.clear();
		(engine as any).ensureLivePreviewObserver(hostView, true);
		const refreshedEntry = (engine as any).livePreviewObservers.get(hostView);
		refreshedEntry.pendingEmbeds.clear();

		let resolveCreate!: (value: unknown) => void;
		const pendingCreate = new Promise((resolve) => {
			resolveCreate = resolve;
		});
		createEmbedLeaf.mockImplementationOnce(async (args: any) => {
			Object.assign(embed, {
				containerEl: args.containerEl,
				file: args.file,
				sourcePath: args.sourcePath,
				subpath: args.subpath,
				kind: args.kind,
				readOnly: args.readOnly,
			});
			args.containerEl.classList.add("blp-inline-edit-root");
			return pendingCreate;
		});

		const mount = (engine as any).mountInlineEmbedCore(embedEl, { sourcePath: "host.md" }, {
			requireLivePreview: true,
			hostView,
			origin: "live-preview",
		});
		await Promise.resolve();

		plugin.settings.inlineEditHeading = false;
		engine.onSettingsChanged();
		(engine as any).ensureLivePreviewObserver(hostView, true);
		const currentEntry = (engine as any).livePreviewObservers.get(hostView);
		currentEntry.pendingEmbeds.clear();

		resolveCreate(embed);
		await mount;

		expect((engine as any).leaves.detach).not.toHaveBeenCalledWith(embed);
		expect(embedEl.querySelector(".blp-inline-edit-root")).not.toBeNull();
		expect(scheduleObserverEntry).toHaveBeenCalled();

		await (engine as any).processObserverEntry(currentEntry);
		expect(createEmbedLeaf).toHaveBeenCalledTimes(1);
		expect(currentEntry.pendingEmbeds.size).toBe(0);
	});

	test("does not cancel a pending File Outliner mount during a settings refresh", async () => {
		const plugin = createPlugin();
		const engine = new InlineEditEngine(plugin);
		const { embedEl } = createEmbedShell(false);
		const { editor, hostView, embed, createEmbedLeaf } = installMountMocks(engine);
		let resolveCreate!: (value: unknown) => void;
		const pendingCreate = new Promise((resolve) => {
			resolveCreate = resolve;
		});
		createEmbedLeaf.mockImplementationOnce(async (args: any) => {
			Object.assign(embed, {
				containerEl: args.containerEl,
				file: args.file,
				sourcePath: args.sourcePath,
				subpath: args.subpath,
				kind: args.kind,
				readOnly: args.readOnly,
			});
			return pendingCreate;
		});

		const mount = (engine as any).mountInlineEmbedCore(embedEl, { sourcePath: "host.md" }, {
			requireLivePreview: false,
			hostView,
			origin: "outliner",
		});
		await Promise.resolve();
		plugin.settings.inlineEditHeading = false;
		engine.onSettingsChanged();
		resolveCreate(embed);
		await mount;

		expect((engine as any).leaves.detach).not.toHaveBeenCalledWith(embed);
		expect(editor.setCursor).toHaveBeenCalled();
	});

	test("cancels a pending mount when the engine unloads", async () => {
		const plugin = createPlugin();
		const engine = new InlineEditEngine(plugin);
		const { embedEl } = createEmbedShell(true);
		const { hostView, embed, createEmbedLeaf } = installMountMocks(engine);
		let resolveCreate!: (value: unknown) => void;
		const pendingCreate = new Promise((resolve) => {
			resolveCreate = resolve;
		});
		createEmbedLeaf.mockImplementation(async (args: any) => {
			Object.assign(embed, {
				containerEl: args.containerEl,
				file: args.file,
				sourcePath: args.sourcePath,
				subpath: args.subpath,
				kind: args.kind,
				readOnly: args.readOnly,
			});
			return pendingCreate;
		});

		const mount = (engine as any).mountInlineEmbedCore(embedEl, { sourcePath: "host.md" }, {
			requireLivePreview: true,
			hostView,
			origin: "live-preview",
		});
		engine.unload();
		resolveCreate(embed);
		await mount;

		expect((engine as any).leaves.detach).toHaveBeenCalledWith(embed);
		expect(embedEl.querySelector(".blp-inline-edit-host")).toBeNull();
	});

	test("fails closed when a Live Preview read-only guard cannot be installed", async () => {
		const engine = new InlineEditEngine(createPlugin());
		const { embedEl } = createEmbedShell(true);
		const { cm, hostView, embed } = installMountMocks(engine);
		delete cm.dispatch;
		jest.spyOn(engine as any, "parseInlineEmbed").mockReturnValue({
			kind: "heading",
			file: { path: "target.md" },
			subpath: "#Only heading",
			visibleRange: [1, 1],
			editableRange: [1, 1],
			readOnly: true,
		});

		await (engine as any).mountInlineEmbedCore(embedEl, { sourcePath: "host.md" }, {
			requireLivePreview: true,
			hostView,
			origin: "live-preview",
		});

		expect((engine as any).leaves.detach).toHaveBeenCalledWith(embed);
		expect(embedEl.querySelector(".blp-inline-edit-host")).toBeNull();
	});
});
