import { EditorState } from "@codemirror/state";
import { MarkdownView } from "obsidian";

import { InlineEditEngine } from "../InlineEditEngine";

function createEditor(text: string) {
	const state = EditorState.create({ doc: text });
	const editor: any = {
		cm: {
			state: {
				doc: state.doc,
				selection: state.selection,
			},
			posAtDOM: jest.fn(() => 0),
		},
		offsetToPos: (offset: number) => {
			const line = state.doc.lineAt(offset);
			return { line: line.number - 1, ch: offset - line.from };
		},
		searchCursor: jest.fn(),
		addHighlights: jest.fn(),
		removeHighlights: jest.fn(),
		scrollIntoView: jest.fn(),
		setSelection: jest.fn(),
		focus: jest.fn(),
	};

	const nativeCursor = {
		getIndexAndCount: jest.fn((): [number, number] => [0, 0]),
		current: jest.fn(() => null),
		findPrevious: jest.fn(() => null),
		findNext: jest.fn(() => null),
		findAll: jest.fn(() => []),
		replace: jest.fn(),
		replaceAll: jest.fn(),
	};
	editor.searchCursor.mockReturnValue(nativeCursor);

	return { editor, doc: state.doc, nativeCursor };
}

function createPlugin(view: MarkdownView) {
	return {
		settings: {
			inlineEditEnabled: true,
			inlineEditFile: false,
			inlineEditHeading: true,
			inlineEditBlock: true,
		},
		app: {
			commands: {
				executeCommand: jest.fn((command: any) => command.editorCallback?.(view.editor, view)),
			},
			workspace: {
				activeLeaf: { view },
				containerEl: document.body,
				getActiveFile: jest.fn(() => null),
				on: jest.fn(),
				onLayoutReady: jest.fn(),
				getLeavesOfType: jest.fn(() => [{ view }]),
			},
			vault: { on: jest.fn() },
			metadataCache: { on: jest.fn() },
		},
		registerEvent: jest.fn(),
		registerDomEvent: jest.fn(),
		registerMarkdownPostProcessor: jest.fn(),
	} as any;
}

afterEach(() => {
	document.body.replaceChildren();
	jest.restoreAllMocks();
});

describe("InlineEditEngine search command routing", () => {
	test("host editor search aggregates a managed embed without transferring editor focus", () => {
		const hostContainer = document.createElement("div");
		const hostRoot = document.createElement("div");
		hostRoot.className = "markdown-source-view is-live-preview";
		hostContainer.appendChild(hostRoot);
		document.body.appendChild(hostContainer);

		const host = createEditor("![[source]]\nhost text");
		const hostToString = jest.spyOn(host.doc, "toString");
		const hostView = new (MarkdownView as any)(host.editor, { path: "host.md" }) as MarkdownView;
		(hostView as any).containerEl = hostContainer;

		const embedContainer = document.createElement("div");
		const embedViewContainer = document.createElement("div");
		embedContainer.className = "blp-inline-edit-host";
		embedContainer.appendChild(embedViewContainer);
		const outerEmbed = document.createElement("div");
		outerEmbed.className = "internal-embed markdown-embed";
		outerEmbed.setAttribute("src", "source");
		(outerEmbed as any).matchParent = jest.fn(() => null);
		outerEmbed.appendChild(embedContainer);
		hostRoot.appendChild(outerEmbed);
		const embed = createEditor("hidden needle\nvisible needle");
		(embed.editor.cm as any).__blpInlineEditResolvedVisibleRange = [2, 2];
		const embedView = new (MarkdownView as any)(embed.editor, { path: "source.md" }) as MarkdownView;
		(embedView as any).containerEl = embedViewContainer;
		const managedEmbed = {
			id: "inline-embed-1",
			kind: "block",
			containerEl: embedContainer,
			hostView,
			view: embedView,
		};

		const plugin = createPlugin(hostView);
		const engine = new InlineEditEngine(plugin);
		const setFocused = jest.spyOn(engine.focus, "setFocused");
		jest.spyOn(engine.leaves, "getActiveEmbeds").mockReturnValue([managedEmbed] as any);

		const search: any = {
			editor: host.editor,
			cursor: null,
			countEl: { textContent: "" },
			hide: jest.fn(),
			onSearchInput: jest.fn(function (this: any) {
				this.cursor = this.editor.searchCursor("needle");
				const count = this.cursor.findAll?.().length ?? 0;
				this.countEl.textContent = count > 0 ? `1 / ${count}` : "0 / 0";
			}),
			show: jest.fn(function (this: any) {
				this.cursor = this.editor.searchCursor("needle");
				const count = this.cursor.findAll?.().length ?? 0;
				this.countEl.textContent = count > 0 ? `1 / ${count}` : "0 / 0";
			}),
		};
		(hostView as any).currentMode = "source";
		(hostView as any).sourceMode = { cmEditor: { editorComponent: { search } } };
		const command = {
			id: "editor:open-search",
			editorCallback: jest.fn(() => search.show()),
		};

		engine.load();
		plugin.app.commands.executeCommand(command);

		const cursor = search.cursor;
		expect(cursor.findNext()).toEqual({
			from: { line: 1, ch: 8 },
			to: { line: 1, ch: 14 },
		});
		expect(cursor.getIndexAndCount()).toEqual([1, 1]);

		host.editor.scrollIntoView(cursor.current(), true);

		// Ctrl+F remains a passive search surface: moving to an embedded hit must
		// not activate its Inline Edit editor or steal the search input's focus.
		expect(setFocused).not.toHaveBeenCalled();
		expect(embed.editor.focus).not.toHaveBeenCalled();
		expect(embed.editor.setSelection).not.toHaveBeenCalled();
		expect(search.countEl.textContent).toBe("1 / 1");
		expect(embed.editor.scrollIntoView).toHaveBeenCalledWith(
			{ from: { line: 1, ch: 8 }, to: { line: 1, ch: 14 } },
			true
		);
		// Cursor methods reuse the prepared participant snapshot instead of
		// serializing the host and resolving every DOM anchor again.
		expect(host.editor.cm.posAtDOM).toHaveBeenCalledTimes(1);
		expect(hostToString).toHaveBeenCalledTimes(2);

		plugin.settings.inlineEditBlock = false;
		engine.focus.setFocused(null);
		engine.onSettingsChanged();
		expect(search.onSearchInput).toHaveBeenCalledTimes(1);
		expect(search.cursor).toBe(host.nativeCursor);
		expect(search.countEl.textContent).toBe("0 / 0");
		plugin.app.commands.executeCommand(command);
		expect(search.cursor).toBe(host.nativeCursor);

		engine.unload();
	});

	test("drops managed participants as soon as the host leaves Live Preview", () => {
		const hostContainer = document.createElement("div");
		const hostRoot = document.createElement("div");
		hostRoot.className = "markdown-source-view is-live-preview";
		hostContainer.appendChild(hostRoot);
		document.body.appendChild(hostContainer);

		const host = createEditor("host text");
		const hostView = new (MarkdownView as any)(host.editor, { path: "host.md" }) as MarkdownView;
		(hostView as any).containerEl = hostContainer;

		const embedContainer = document.createElement("div");
		const embedViewContainer = document.createElement("div");
		embedContainer.className = "blp-inline-edit-root";
		embedContainer.appendChild(embedViewContainer);
		hostRoot.appendChild(embedContainer);
		const embed = createEditor("visible needle");
		(embed.editor.cm as any).__blpInlineEditResolvedVisibleRange = [1, 1];
		const embedView = new (MarkdownView as any)(embed.editor, { path: "source.md" }) as MarkdownView;
		(embedView as any).containerEl = embedViewContainer;

		const managedEmbed = {
			id: "inline-embed-1",
			kind: "block",
			containerEl: embedContainer,
			hostView,
			view: embedView,
		};
		const plugin = createPlugin(hostView);
		const engine = new InlineEditEngine(plugin);
		jest.spyOn(engine.leaves, "getActiveEmbeds").mockReturnValue([managedEmbed] as any);

		const search: any = {
			editor: host.editor,
			cursor: null,
			hide: jest.fn(),
			show: jest.fn(function (this: any) {
				this.cursor = this.editor.searchCursor("needle");
			}),
		};
		(hostView as any).currentMode = { search };
		const command = {
			id: "editor:open-search",
			editorCallback: jest.fn(() => search.show()),
		};

		engine.load();
		plugin.app.commands.executeCommand(command);
		const cursor = search.cursor;
		expect(cursor.findNext()).toEqual({
			from: { line: 0, ch: 8 },
			to: { line: 0, ch: 14 },
		});

		(hostView as any).setMode("preview");

		expect(cursor.findNext()).toBeNull();
		expect(host.nativeCursor.findNext).toHaveBeenCalledTimes(1);
		engine.unload();
	});

	test("falls back to native search when a partial embed has no resolved visible range", () => {
		const hostContainer = document.createElement("div");
		const hostRoot = document.createElement("div");
		hostRoot.className = "markdown-source-view is-live-preview";
		hostContainer.appendChild(hostRoot);
		document.body.appendChild(hostContainer);

		const host = createEditor("host text");
		const hostView = new (MarkdownView as any)(host.editor, { path: "host.md" }) as MarkdownView;
		(hostView as any).containerEl = hostContainer;
		const embedContainer = document.createElement("div");
		embedContainer.className = "blp-inline-edit-host";
		const embedViewContainer = document.createElement("div");
		embedContainer.appendChild(embedViewContainer);
		hostRoot.appendChild(embedContainer);
		const embed = createEditor("hidden needle");
		const embedView = new (MarkdownView as any)(embed.editor, { path: "source.md" }) as MarkdownView;
		(embedView as any).containerEl = embedViewContainer;
		const managedEmbed = {
			id: "inline-embed-unresolved",
			kind: "block",
			containerEl: embedContainer,
			hostView,
			view: embedView,
		};

		const plugin = createPlugin(hostView);
		const engine = new InlineEditEngine(plugin);
		jest.spyOn(engine.leaves, "getActiveEmbeds").mockReturnValue([managedEmbed] as any);
		const search: any = {
			editor: host.editor,
			cursor: null,
			hide: jest.fn(),
			show: jest.fn(function (this: any) {
				this.cursor = this.editor.searchCursor("needle");
			}),
		};
		(hostView as any).currentMode = { search };

		engine.load();
		plugin.app.commands.executeCommand({
			id: "editor:open-search",
			editorCallback: () => search.show(),
		});

		expect(search.cursor).toBe(host.nativeCursor);
		engine.unload();
	});

	test("fails open when a connected owned participant is unresolved beside a valid embed", () => {
		const hostContainer = document.createElement("div");
		const hostRoot = document.createElement("div");
		hostRoot.className = "markdown-source-view is-live-preview";
		hostContainer.appendChild(hostRoot);
		document.body.appendChild(hostContainer);

		const host = createEditor("host text");
		const hostView = new (MarkdownView as any)(host.editor, { path: "host.md" }) as MarkdownView;
		(hostView as any).containerEl = hostContainer;

		const createManagedEmbed = (id: string, text: string, visibleRange?: [number, number]) => {
			const embedContainer = document.createElement("div");
			embedContainer.className = "blp-inline-edit-host";
			const embedViewContainer = document.createElement("div");
			embedContainer.appendChild(embedViewContainer);
			hostRoot.appendChild(embedContainer);
			const embed = createEditor(text);
			if (visibleRange) (embed.editor.cm as any).__blpInlineEditResolvedVisibleRange = visibleRange;
			const embedView = new (MarkdownView as any)(embed.editor, { path: `${id}.md` }) as MarkdownView;
			(embedView as any).containerEl = embedViewContainer;
			return { id, kind: "block", containerEl: embedContainer, hostView, view: embedView };
		};

		const validEmbed = createManagedEmbed("inline-embed-valid", "valid needle", [1, 1]);
		const unresolvedEmbed = createManagedEmbed("inline-embed-unresolved", "unresolved needle");
		const plugin = createPlugin(hostView);
		const engine = new InlineEditEngine(plugin);
		jest.spyOn(engine.leaves, "getActiveEmbeds").mockReturnValue([validEmbed, unresolvedEmbed] as any);
		const search: any = {
			editor: host.editor,
			cursor: null,
			show: jest.fn(function (this: any) {
				this.cursor = this.editor.searchCursor("needle");
			}),
			hide: jest.fn(),
		};
		(hostView as any).currentMode = { search };

		engine.load();
		plugin.app.commands.executeCommand({
			id: "editor:open-search",
			editorCallback: () => search.show(),
		});

		expect(search.cursor).toBe(host.nativeCursor);
		engine.unload();
	});

	test("fails open for the whole aggregate when a searchable embed has no host anchor", () => {
		const hostContainer = document.createElement("div");
		const hostRoot = document.createElement("div");
		hostRoot.className = "markdown-source-view is-live-preview";
		hostContainer.appendChild(hostRoot);
		document.body.appendChild(hostContainer);

		const host = createEditor("host text");
		const hostView = new (MarkdownView as any)(host.editor, { path: "host.md" }) as MarkdownView;
		(hostView as any).containerEl = hostContainer;

		const createManagedEmbed = (id: string, text: string) => {
			const embedContainer = document.createElement("div");
			embedContainer.className = "blp-inline-edit-host";
			const embedViewContainer = document.createElement("div");
			embedContainer.appendChild(embedViewContainer);
			hostRoot.appendChild(embedContainer);
			const embed = createEditor(text);
			(embed.editor.cm as any).__blpInlineEditResolvedVisibleRange = [1, 1];
			const embedView = new (MarkdownView as any)(embed.editor, { path: `${id}.md` }) as MarkdownView;
			(embedView as any).containerEl = embedViewContainer;
			return {
				id,
				kind: "block",
				containerEl: embedContainer,
				hostView,
				view: embedView,
			};
		};

		const validEmbed = createManagedEmbed("inline-embed-valid", "valid needle");
		const unresolvedEmbed = createManagedEmbed("inline-embed-unresolved-anchor", "unresolved needle");
		host.editor.cm.posAtDOM.mockImplementation((element: HTMLElement) =>
			element === unresolvedEmbed.containerEl ? null : 10
		);

		const plugin = createPlugin(hostView);
		const engine = new InlineEditEngine(plugin);
		jest.spyOn(engine.leaves, "getActiveEmbeds").mockReturnValue([validEmbed, unresolvedEmbed] as any);
		const search: any = {
			editor: host.editor,
			cursor: null,
			hide: jest.fn(),
			show: jest.fn(function (this: any) {
				this.cursor = this.editor.searchCursor("needle");
			}),
		};
		(hostView as any).currentMode = { search };

		engine.load();
		plugin.app.commands.executeCommand({
			id: "editor:open-search",
			editorCallback: () => search.show(),
		});

		expect(search.cursor).toBe(host.nativeCursor);
		engine.unload();
	});

	test("retries a transiently displaced managed source anchor", () => {
		const hostContainer = document.createElement("div");
		const hostRoot = document.createElement("div");
		hostRoot.className = "markdown-source-view is-live-preview";
		hostContainer.appendChild(hostRoot);
		document.body.appendChild(hostContainer);

		const token = "![[source#^block]]";
		const host = createEditor(`before\n${token}\nafter`);
		const hostView = new (MarkdownView as any)(host.editor, { path: "host.md" }) as MarkdownView;
		(hostView as any).containerEl = hostContainer;

		const outerEmbed = document.createElement("div");
		outerEmbed.className = "internal-embed markdown-embed";
		outerEmbed.setAttribute("alt", "source > ^block");
		const embedContainer = document.createElement("div");
		embedContainer.className = "blp-inline-edit-host";
		const embedViewContainer = document.createElement("div");
		embedContainer.appendChild(embedViewContainer);
		outerEmbed.appendChild(embedContainer);
		hostRoot.appendChild(outerEmbed);

		const embed = createEditor("visible needle");
		(embed.editor.cm as any).__blpInlineEditResolvedVisibleRange = [1, 1];
		const embedView = new (MarkdownView as any)(embed.editor, { path: "source.md" }) as MarkdownView;
		(embedView as any).containerEl = embedViewContainer;
		const managedEmbed = {
			id: "inline-embed-1",
			kind: "block",
			containerEl: embedContainer,
			hostView,
			view: embedView,
		};

		const tokenFrom = host.doc.toString().indexOf(token);
		host.editor.cm.posAtDOM
			.mockReturnValueOnce(host.doc.length)
			.mockReturnValueOnce(tokenFrom);
		const plugin = createPlugin(hostView);
		const engine = new InlineEditEngine(plugin);
		jest.spyOn(engine.leaves, "getActiveEmbeds").mockReturnValue([managedEmbed] as any);

		const first = (engine as any).getSearchParticipants(hostView);
		expect(first[0].ignoredRanges).toEqual([]);
		const second = (engine as any).getSearchParticipants(hostView);
		expect(second[0].ignoredRanges).toEqual([[tokenFrom, tokenFrom + token.length]]);
		const third = (engine as any).getSearchParticipants(hostView);
		expect(third).toBe(second);
		expect(host.editor.cm.posAtDOM).toHaveBeenCalledTimes(2);
	});

	test("retries source mapping when a managed embed temporarily has no outer shell", () => {
		const hostContainer = document.createElement("div");
		const hostRoot = document.createElement("div");
		hostRoot.className = "markdown-source-view is-live-preview";
		hostContainer.appendChild(hostRoot);
		document.body.appendChild(hostContainer);

		const token = "![[source#^block]]";
		const host = createEditor(token);
		const hostView = new (MarkdownView as any)(host.editor, { path: "host.md" }) as MarkdownView;
		(hostView as any).containerEl = hostContainer;

		const embedContainer = document.createElement("div");
		embedContainer.className = "blp-inline-edit-host";
		const embedViewContainer = document.createElement("div");
		embedContainer.appendChild(embedViewContainer);
		hostRoot.appendChild(embedContainer);
		const embed = createEditor("visible needle");
		(embed.editor.cm as any).__blpInlineEditResolvedVisibleRange = [1, 1];
		const embedView = new (MarkdownView as any)(embed.editor, { path: "source.md" }) as MarkdownView;
		(embedView as any).containerEl = embedViewContainer;
		const managedEmbed = {
			id: "inline-embed-1",
			kind: "block",
			containerEl: embedContainer,
			hostView,
			view: embedView,
		};

		host.editor.cm.posAtDOM.mockReturnValue(0);
		const plugin = createPlugin(hostView);
		const engine = new InlineEditEngine(plugin);
		jest.spyOn(engine.leaves, "getActiveEmbeds").mockReturnValue([managedEmbed] as any);

		const first = (engine as any).getSearchParticipants(hostView);
		expect(first[0].ignoredRanges).toEqual([]);

		const outerEmbed = document.createElement("div");
		outerEmbed.className = "internal-embed markdown-embed";
		outerEmbed.setAttribute("src", "source#^block");
		hostRoot.insertBefore(outerEmbed, embedContainer);
		outerEmbed.appendChild(embedContainer);

		const second = (engine as any).getSearchParticipants(hostView);
		expect(second[0].ignoredRanges).toEqual([[0, token.length]]);
		const third = (engine as any).getSearchParticipants(hostView);
		expect(third).toBe(second);
		expect(host.editor.cm.posAtDOM).toHaveBeenCalledTimes(2);
	});

	test("detaches Live Preview embeds when their ownership setting is disabled", () => {
		const hostContainer = document.createElement("div");
		const hostRoot = document.createElement("div");
		hostRoot.className = "markdown-source-view is-live-preview";
		hostContainer.appendChild(hostRoot);
		document.body.appendChild(hostContainer);

		const host = createEditor("host text");
		const hostView = new (MarkdownView as any)(host.editor, { path: "host.md" }) as MarkdownView;
		(hostView as any).containerEl = hostContainer;

		const embedContainer = document.createElement("div");
		const embedViewContainer = document.createElement("div");
		embedContainer.className = "blp-inline-edit-host";
		embedContainer.appendChild(embedViewContainer);
		hostRoot.appendChild(embedContainer);
		const embed = createEditor("visible needle");
		const embedView = new (MarkdownView as any)(embed.editor, { path: "source.md" }) as MarkdownView;
		(embedView as any).containerEl = embedViewContainer;

		const managedEmbed = {
			id: "inline-embed-1",
			kind: "block",
			containerEl: embedContainer,
			hostView,
			view: embedView,
		};
		const plugin = createPlugin(hostView);
		const engine = new InlineEditEngine(plugin);
		jest.spyOn(engine.leaves, "getActiveEmbeds").mockReturnValue([managedEmbed] as any);
		const detach = jest.spyOn(engine.leaves, "detach").mockImplementation(jest.fn());
		(engine as any).loaded = true;

		plugin.settings.inlineEditBlock = false;
		engine.onSettingsChanged();

		expect(detach).toHaveBeenCalledWith(managedEmbed);
		engine.unload();
	});
});
