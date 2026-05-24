import { FileOutlinerView } from "../view";

describe("file-outliner-view structural edit regression", () => {
	test("applyEngineResult marks the current editing block to bypass stale exit commit when focus moves", () => {
		const fake = {
			editingId: "a1",
			outlinerFile: null,
			visibleNavCache: { cached: true },
			blockById: new Map<string, any>(),
			dirtyBlockIds: new Set<string>(),
			pendingFocus: null,
			pendingScrollToId: null,
			pendingStructuralExitCommitBypassId: null,
			ensureRoot: jest.fn(),
			rebuildIndex() {
				this.blockById = new Map([
					["a1", { id: "a1", text: "alphaP1" }],
					["n1", { id: "n1", text: "P2" }],
				]);
			},
			render: jest.fn(),
			display: {
				renderBlockPlaceholder: jest.fn(),
				markNeedsRender: jest.fn(),
				scheduleDisplayRenderDrain: jest.fn(),
			},
			markDirtyAndRequestSave: jest.fn(),
		} as any;

		(FileOutlinerView.prototype as any).applyEngineResult.call(
			fake,
			{
				didChange: true,
				file: { frontmatter: null, blocks: [] },
				selection: { id: "n1", start: 2, end: 2 },
				dirtyIds: new Set(["a1", "n1"]),
			},
			undefined
		);

		expect(fake.pendingStructuralExitCommitBypassId).toBe("a1");
		expect(fake.pendingFocus).toEqual({ id: "n1", cursorStart: 2, cursorEnd: 2, scroll: false });
		expect(Array.from(fake.dirtyBlockIds).sort()).toEqual(["a1", "n1"]);
	});

	test("exitEditMode does not overwrite structural result with stale editor text when bypass is set", () => {
		const displayEl = document.createElement("div");
		const blockEl = document.createElement("div");
		const editorHostEl = document.createElement("div");
		const rootEl = document.createElement("div");
		const block = { id: "a1", text: "alphaP1" };

		const fake = {
			editorView: {
				state: { doc: { toString: () => "alpha" } },
			},
			editorHostEl,
			rootEl,
			dom: {
				getDisplayEl: jest.fn(() => displayEl),
				getBlockEl: jest.fn(() => blockEl),
			},
			blockById: new Map([["a1", block]]),
			editingId: "a1",
			pendingBlurTimer: null,
			pendingStructuralExitCommitBypassId: "a1",
			clearPendingEditorFocusRestore: jest.fn(),
			updateActiveEditorBridge: jest.fn(),
			closeEditorSuggests: jest.fn(),
			display: { renderBlockDisplay: jest.fn() },
			markDirtyAndRequestSave: jest.fn(),
			preserveArrowNavGoalOnce: false,
			resetArrowNavGoalColumn: jest.fn(),
			dirtyBlockIds: new Set<string>(),
		} as any;

		(FileOutlinerView.prototype as any).exitEditMode.call(fake, "a1");

		expect(block.text).toBe("alphaP1");
		expect(fake.pendingStructuralExitCommitBypassId).toBeNull();
		expect(fake.editingId).toBeNull();
		expect(fake.display.renderBlockDisplay).toHaveBeenCalledWith("a1");
		expect(Array.from(fake.dirtyBlockIds)).toEqual([]);
	});

	test("onEditorEscape closes suggests before exiting edit mode", () => {
		const fake = {
			getOpenEditorSuggests: jest.fn(() => [{ isOpen: true }]),
			closeEditorSuggests: jest.fn(),
			exitEditMode: jest.fn(),
			focusOutlinerRoot: jest.fn(),
			editingId: "a1",
		} as any;

		const handled = (FileOutlinerView.prototype as any).onEditorEscape.call(fake);

		expect(handled).toBe(true);
		expect(fake.closeEditorSuggests).toHaveBeenCalledTimes(1);
		expect(fake.exitEditMode).not.toHaveBeenCalled();
		expect(fake.focusOutlinerRoot).not.toHaveBeenCalled();
	});

	test("onEditorEscape exits edit mode and focuses root when no suggest is open", () => {
		const fake = {
			getOpenEditorSuggests: jest.fn(() => []),
			closeEditorSuggests: jest.fn(),
			exitEditMode: jest.fn(),
			focusOutlinerRoot: jest.fn(),
			editingId: "a1",
		} as any;

		const handled = (FileOutlinerView.prototype as any).onEditorEscape.call(fake);

		expect(handled).toBe(true);
		expect(fake.closeEditorSuggests).not.toHaveBeenCalled();
		expect(fake.exitEditMode).toHaveBeenCalledWith("a1");
		expect(fake.focusOutlinerRoot).toHaveBeenCalledTimes(1);
	});

	test("onEditorBlur preserves edit mode when focus stays within the outliner root", () => {
		jest.useFakeTimers();
		const rootEl = document.createElement("div");
		const contentEl = document.createElement("div");
		contentEl.appendChild(rootEl);
		Object.defineProperty(document, "activeElement", {
			configurable: true,
			get: () => rootEl,
		});

		const fake = {
			editingId: "a1",
			editorView: {},
			editorHostEl: document.createElement("div"),
			contentEl,
			rootEl,
			pendingBlurTimer: null,
			pendingEditorFocusRestore: false,
			leaf: { id: "leaf-a" },
			app: { workspace: { activeLeaf: { id: "leaf-a" } } },
			updateActiveEditorBridge: jest.fn(),
			queueEditorFocusRestore: jest.fn(),
			isEditorRefocusTarget: (FileOutlinerView.prototype as any).isEditorRefocusTarget,
		} as any;

		(FileOutlinerView.prototype as any).onEditorBlur.call(fake);
		jest.runAllTimers();

		expect(fake.pendingEditorFocusRestore).toBe(true);
		expect(fake.editingId).toBe("a1");
		expect(fake.updateActiveEditorBridge).toHaveBeenCalledTimes(1);
		expect(fake.queueEditorFocusRestore).toHaveBeenCalledTimes(0);
		jest.useRealTimers();
	});

	test("restoreEditorFocusIfNeeded focuses editor when the active leaf regains root focus", () => {
		const rootEl = document.createElement("div");
		const contentEl = document.createElement("div");
		contentEl.appendChild(rootEl);
		const editorHostEl = document.createElement("div");
		contentEl.appendChild(editorHostEl);
		const activeLeaf = { id: "leaf-a" };
		const focus = jest.fn();
		Object.defineProperty(document, "activeElement", {
			configurable: true,
			get: () => rootEl,
		});

		const fake = {
			pendingEditorFocusRestore: true,
			editingId: "a1",
			editorView: { focus },
			editorHostEl,
			rootEl,
			contentEl,
			leaf: activeLeaf,
			app: { workspace: { activeLeaf } },
			updateActiveEditorBridge: jest.fn(),
			clearPendingEditorFocusRestore: jest.fn(),
			isEditorRefocusTarget: (FileOutlinerView.prototype as any).isEditorRefocusTarget,
		} as any;

		(FileOutlinerView.prototype as any).restoreEditorFocusIfNeeded.call(fake);

		expect(fake.pendingEditorFocusRestore).toBe(false);
		expect(focus).toHaveBeenCalledTimes(1);
		expect(fake.updateActiveEditorBridge).toHaveBeenCalledTimes(1);
	});

	test("onEditorBlur queues focus restore when active element falls back to body", () => {
		jest.useFakeTimers();
		const contentEl = document.createElement("div");
		const editorHostEl = document.createElement("div");
		contentEl.appendChild(editorHostEl);
		Object.defineProperty(document, "activeElement", {
			configurable: true,
			get: () => document.body,
		});

		const activeLeaf = { id: "leaf-a" };
		const fake = {
			editingId: "a1",
			editorView: {},
			editorHostEl,
			contentEl,
			rootEl: document.createElement("div"),
			pendingBlurTimer: null,
			pendingEditorFocusRestore: false,
			leaf: activeLeaf,
			app: { workspace: { activeLeaf } },
			updateActiveEditorBridge: jest.fn(),
			queueEditorFocusRestore: jest.fn(),
			isEditorRefocusTarget: (FileOutlinerView.prototype as any).isEditorRefocusTarget,
		} as any;

		(FileOutlinerView.prototype as any).onEditorBlur.call(fake);
		jest.runAllTimers();

		expect(fake.pendingEditorFocusRestore).toBe(true);
		expect(fake.updateActiveEditorBridge).toHaveBeenCalledTimes(1);
		expect(fake.queueEditorFocusRestore).toHaveBeenCalledTimes(1);
		jest.useRealTimers();
	});

	test("restoreStructuralHistorySnapshot keeps focus but skips deep-link center scroll", () => {
		const fake = {
			ensureRoot: jest.fn(),
			clearBlockRangeSelection: jest.fn(),
			closeEditorSuggests: jest.fn(),
			editingId: null,
			outlinerFile: null,
			visibleNavCache: null,
			blockById: new Map<string, any>(),
			rebuildIndex() {
				this.blockById = new Map([["a1", { id: "a1", text: "alpha" }]]);
			},
			pendingStructuralExitCommitBypassId: null,
			pendingFocus: null,
			pendingScrollToId: "stale",
			render: jest.fn(),
			markDirtyAndRequestSave: jest.fn(),
		} as any;

		(FileOutlinerView.prototype as any).restoreStructuralHistorySnapshot.call(
			fake,
			{ frontmatter: null, blocks: [] },
			{ id: "a1", start: 3, end: 3 }
		);

		expect(fake.pendingFocus).toEqual({ id: "a1", cursorStart: 3, cursorEnd: 3, scroll: false });
		expect(fake.pendingScrollToId).toBeNull();
	});

	test("applyStructuralEngineResult records a structural history entry and clears redo", () => {
		const fake = {
			outlinerFile: {
				frontmatter: null,
				blocks: [{ id: "a1", depth: 0, text: "alpha", children: [], system: { date: "d", updated: "u", extra: {} } }],
			},
			structuralUndoStack: [],
			structuralRedoStack: [{ stale: true }],
			structuralHistoryLimit: 100,
			applyEngineResult: jest.fn(),
			pushStructuralHistoryEntry: (entry: any) =>
				(FileOutlinerView.prototype as any).pushStructuralHistoryEntry.call(fake, entry),
		} as any;

		const handled = (FileOutlinerView.prototype as any).applyStructuralEngineResult.call(
			fake,
			{
				didChange: true,
				file: {
					frontmatter: null,
					blocks: [{ id: "a1", depth: 0, text: "alphaP1", children: [], system: { date: "d", updated: "u", extra: {} } }],
				},
				selection: { id: "a1", start: 7, end: 7 },
				dirtyIds: new Set(["a1"]),
			},
			{ id: "a1", start: 5, end: 5 },
			undefined
		);

		expect(handled).toBe(true);
		expect(fake.applyEngineResult).toHaveBeenCalledTimes(1);
		expect(fake.structuralRedoStack).toEqual([]);
		expect(fake.structuralUndoStack).toHaveLength(1);
		expect(fake.structuralUndoStack[0].beforeSelection).toEqual({ id: "a1", start: 5, end: 5 });
		expect(fake.structuralUndoStack[0].afterSelection).toEqual({ id: "a1", start: 7, end: 7 });
	});

	test("tryUndoStructuralHistory replays before snapshot and moves entry to redo", () => {
		const entry = {
			beforeFile: { frontmatter: null, blocks: [] },
			beforeSelection: { id: "a1", start: 1, end: 1 },
			afterFile: { frontmatter: null, blocks: [{ id: "b1", depth: 0, text: "b", children: [], system: { date: "d", updated: "u", extra: {} } }] },
			afterSelection: { id: "b1", start: 0, end: 0 },
		};
		const fake = {
			structuralUndoStack: [entry],
			structuralRedoStack: [],
			restoreStructuralHistorySnapshot: jest.fn(),
		} as any;

		const handled = (FileOutlinerView.prototype as any).tryUndoStructuralHistory.call(fake);

		expect(handled).toBe(true);
		expect(fake.structuralUndoStack).toEqual([]);
		expect(fake.structuralRedoStack).toEqual([entry]);
		expect(fake.restoreStructuralHistorySnapshot).toHaveBeenCalledWith(entry.beforeFile, entry.beforeSelection);
	});

	test("onOutlinerRootKeyDownCapture routes Mod+Z to structural undo when not editing", () => {
		const evt = {
			key: "z",
			ctrlKey: true,
			metaKey: false,
			shiftKey: false,
			altKey: false,
			preventDefault: jest.fn(),
			stopPropagation: jest.fn(),
		};
		const fake = {
			editingId: null,
			tryUndoStructuralHistory: jest.fn(() => true),
			tryRedoStructuralHistory: jest.fn(() => false),
			blockRangeSelection: null,
			clearBlockRangeSelection: jest.fn(),
			focusOutlinerRoot: jest.fn(),
		} as any;

		(FileOutlinerView.prototype as any).onOutlinerRootKeyDownCapture.call(fake, evt);

		expect(fake.tryUndoStructuralHistory).toHaveBeenCalledTimes(1);
		expect(evt.preventDefault).toHaveBeenCalledTimes(1);
		expect(evt.stopPropagation).toHaveBeenCalledTimes(1);
	});

	test("onOutlinerRootKeyDownCapture clears block-range selection on Escape", () => {
		const evt = {
			key: "Escape",
			ctrlKey: false,
			metaKey: false,
			shiftKey: false,
			altKey: false,
			preventDefault: jest.fn(),
			stopPropagation: jest.fn(),
		};
		const fake = {
			editingId: null,
			tryUndoStructuralHistory: jest.fn(() => false),
			tryRedoStructuralHistory: jest.fn(() => false),
			blockRangeSelection: { anchorId: "a1", focusId: "c1" },
			clearBlockRangeSelection: jest.fn(),
			focusOutlinerRoot: jest.fn(),
		} as any;

		(FileOutlinerView.prototype as any).onOutlinerRootKeyDownCapture.call(fake, evt);

		expect(evt.preventDefault).toHaveBeenCalledTimes(1);
		expect(evt.stopPropagation).toHaveBeenCalledTimes(1);
		expect(fake.clearBlockRangeSelection).toHaveBeenCalledTimes(1);
		expect(fake.focusOutlinerRoot).toHaveBeenCalledTimes(1);
	});

	test("applyEngineResult can request scroll only for navigation focus", () => {
		const fake = {
			editingId: "a1",
			outlinerFile: null,
			visibleNavCache: { cached: true },
			blockById: new Map<string, any>(),
			dirtyBlockIds: new Set<string>(),
			pendingFocus: null,
			pendingScrollToId: "stale",
			pendingStructuralExitCommitBypassId: null,
			ensureRoot: jest.fn(),
			rebuildIndex() {
				this.blockById = new Map([["n1", { id: "n1", text: "P2" }]]);
			},
			render: jest.fn(),
			display: {
				renderBlockPlaceholder: jest.fn(),
				markNeedsRender: jest.fn(),
				scheduleDisplayRenderDrain: jest.fn(),
			},
			markDirtyAndRequestSave: jest.fn(),
		} as any;

		(FileOutlinerView.prototype as any).applyEngineResult.call(
			fake,
			{
				didChange: true,
				file: { frontmatter: null, blocks: [] },
				selection: { id: "n1", start: 1, end: 1 },
				dirtyIds: new Set<string>(),
			},
			{ scroll: true }
		);

		expect(fake.pendingFocus).toEqual({ id: "n1", cursorStart: 1, cursorEnd: 1, scroll: true });
		expect(fake.pendingScrollToId).toBeNull();
	});
});
