import { Component, Menu, TextFileView, WorkspaceLeaf } from "obsidian";
import { DateTime } from "luxon";

import { EditorSelection } from "@codemirror/state";
import { EditorView } from "@codemirror/view";

import type BlockLinkPlus from "../../main";
import { generateRandomId } from "../../utils";
import * as Clipboard from "../clipboard-handler";
import {
	backspaceAtStart,
	deleteBlock,
	indentBlock,
	insertAfter,
	mergeWithNext,
	moveBlockSubtree,
	outdentBlock,
	pasteSplitLines,
	splitAtSelection,
	type OutlinerEngineContext,
	type OutlinerSelection,
} from "./engine";
import {
	normalizeOutlinerFile,
	serializeOutlinerBlocksForClipboard,
	serializeOutlinerFile,
	type OutlinerBlock,
	type ParsedOutlinerFile,
} from "./protocol";

import { FILE_OUTLINER_VIEW_TYPE } from "./constants";
import { getFileOutlinerPaneMenuLabels } from "./pane-menu-labels";
import { OutlinerDisplayController } from "./display-controller";
import { OutlinerSuggestEditor, triggerEditorSuggest } from "./editor-suggest-bridge";
import { getFileOutlinerContextMenuLabels } from "./labels";
import { OutlinerDndController, type OutlinerDndDrop } from "./dnd-controller";
import { getTaskMarkerFromBlockText, toggleTaskMarkerPrefix, toggleTaskStatusMarkerPrefix } from "./task-marker";
import { OutlinerDomController } from "./dom-controller";
import { createOutlinerEditorState } from "./editor-state";
import { handleOutlinerRootClickCapture } from "./root-click-router";
import {
	computeVisibleBlockNav,
	cursorPosAtFirstLine,
	cursorPosAtLastLine,
	findAdjacentVisibleBlockId,
	type ArrowNavDirection,
	type VisibleBlockNav,
} from "./arrow-navigation";

type PendingFocus = {
	id: string;
	cursorStart: number;
	cursorEnd: number;
};

function formatSystemDate(dt: DateTime): string {
	return dt.toFormat("yyyy-MM-dd'T'HH:mm:ss");
}

function extractCaretIdFromSubpath(raw: unknown): string | null {
	const s = String(raw ?? "");
	const m = s.match(/\^([a-zA-Z0-9_-]+)/);
	return m?.[1] ?? null;
}

export class FileOutlinerView extends TextFileView {
	private readonly plugin: BlockLinkPlus;
	private outlinerFile: ParsedOutlinerFile | null = null;

	private blockById = new Map<string, OutlinerBlock>();
	private parentById = new Map<string, string | null>();

	private dirtyBlockIds = new Set<string>();

	private rootEl: HTMLElement | null = null;
	private zoomHeaderEl: HTMLElement | null = null;
	private topLevelBlocksEl: HTMLElement | null = null;

	private readonly dom: OutlinerDomController;
	private readonly display: OutlinerDisplayController;

	private editorHostEl: HTMLElement | null = null;
	private editorView: EditorView | null = null;
	private suggestEditor: OutlinerSuggestEditor | null = null;
	private suppressEditorSync = false;
	private editingId: string | null = null;
	private pendingFocus: PendingFocus | null = null;
	private pendingScrollToId: string | null = null;
	private pendingBlurTimer: number | null = null;

	private lastPlainPasteShortcutAt = 0;

	private collapsedIds = new Set<string>();
	private zoomStack: string[] = [];

	private visibleNavCache: VisibleBlockNav | null = null;

	private arrowNavGoalCh: number | null = null;
	private arrowNavDispatching = false;
	private preserveArrowNavGoalOnce = false;

	private readonly dnd: OutlinerDndController;

	private readonly indentSize = 2;

	constructor(leaf: WorkspaceLeaf, plugin: BlockLinkPlus) {
		super(leaf);
		this.plugin = plugin;
		this.dom = new OutlinerDomController({
			isZoomEnabled: () => this.plugin.settings.fileOutlinerZoomEnabled !== false,
			getBlockTextLength: (id) => String(this.blockById.get(id)?.text ?? "").length,
			enterEditMode: (id, opts) => this.enterEditMode(id, opts),
			zoomInto: (id) => this.zoomInto(id),
			toggleCollapsed: (id) => this.toggleCollapsed(id),
			openBulletMenu: (id, evt) => this.openBulletMenu(id, evt),
			insertAfterBlock: (id) => this.insertAfterBlock(id),
			getDnd: () => this.dnd,
			debugLog: (scope, err) => this.debugLog(scope, err),
		});
		this.display = new OutlinerDisplayController({
			app: this.app,
			plugin: this.plugin,
			contentEl: this.contentEl,
			getSourcePath: () => this.file?.path ?? "",
			getEditingId: () => this.editingId,
			getBlock: (id) => this.blockById.get(id) ?? null,
			getDisplayEl: (id) => this.dom.getDisplayEl(id),
			getRowElEntries: () => this.dom.getRowElEntries(),
			addChildComponent: () => this.addChild(new Component()),
			removeChildComponent: (component) => this.removeChild(component),
			toggleTaskStatusForBlock: (id) => this.toggleTaskStatusForBlock(id),
			debugLog: (scope, err) => this.debugLog(scope, err),
			tryOrLog: (scope, fn) => this.tryOrLog(scope, fn),
		});
		this.dnd = new OutlinerDndController({
			isEnabled: () => this.plugin.settings.fileOutlinerDragAndDropEnabled !== false,
			hasOutlinerFile: () => Boolean(this.outlinerFile),
			getEditingId: () => this.editingId,
			exitEditMode: (id) => this.exitEditMode(id),
			getContentEl: () => this.contentEl,
			ensureRoot: () => this.ensureRoot(),
			getRootEl: () => this.rootEl,
			getBlockEl: (id) => this.dom.getBlockEl(id),
			isSelfOrDescendant: (rootId, id) => this.isSelfOrDescendant(rootId, id),
			applyDrop: (sourceId: string, drop: OutlinerDndDrop) => {
				if (!this.outlinerFile) return;

				// If we move a block into a collapsed subtree, expand so the result is visible.
				if (drop.where === "inside") {
					this.collapsedIds.delete(drop.targetId);
					this.visibleNavCache = null;
				}

				this.applyEngineResult(moveBlockSubtree(this.outlinerFile, sourceId, drop.targetId, drop.where), {
					focus: false,
				});
			},
			debugLog: (scope, err) => this.debugLog(scope, err),
		});
		this.contentEl.addClass("blp-file-outliner-view");
		this.syncFeatureToggles();
		this.registerDomEvent(this.contentEl, "scroll", () => this.display.scheduleVisibleBlockRefresh());
	}

	public toggleActiveTaskStatus(): boolean {
		if (!this.editingId) return false;
		return this.onEditorToggleTask();
	}

	public toggleActiveTaskMarker(): boolean {
		if (!this.editingId) return false;
		return this.onEditorToggleTaskMarker();
	}

	private debugLog(scope: string, err: unknown): void {
		if (this.plugin.settings.fileOutlinerDebugLogging !== true) return;
		try {
			console.error(`[BLP Outliner] ${scope}`, err);
		} catch {
			// ignore
		}
	}

	private tryOrLog(scope: string, fn: () => void): void {
		try {
			fn();
		} catch (err) {
			this.debugLog(scope, err);
		}
	}

	/**
	 * Keep purely-visual feature flags as root CSS classes so behavior and styling can be gated
	 * without touching the core protocol/engine.
	 */
	private syncFeatureToggles(): void {
		try {
			this.contentEl.classList.toggle(
				"blp-outliner-dnd-enabled",
				this.plugin.settings.fileOutlinerDragAndDropEnabled !== false
			);
			this.contentEl.classList.toggle(
				"blp-outliner-emphasis-line-enabled",
				this.plugin.settings.fileOutlinerEmphasisLineEnabled !== false
			);
		} catch (err) {
			this.debugLog("syncFeatureToggles", err);
		}
	}

	/**
	 * Called after plugin settings are saved to apply feature toggles to already-open leaves.
	 */
	public onFileOutlinerSettingsChanged(): void {
		this.syncFeatureToggles();

		// If a toggle is turned off mid-session, leave the view in a sane state.
		this.dnd.onSettingsChanged();

		if (this.plugin.settings.fileOutlinerZoomEnabled === false && this.zoomStack.length > 0) {
			try {
				if (this.editingId) this.exitEditMode(this.editingId);
			} catch (err) {
				this.debugLog("onSettingsChanged/exitEditMode", err);
			}
			this.zoomStack = [];
			this.visibleNavCache = null;
			this.render({ forceRebuild: true });
		}
	}

	getViewType(): string {
		return FILE_OUTLINER_VIEW_TYPE;
	}

	getDisplayText(): string {
		return this.file?.basename ?? "Outliner";
	}

	getIcon(): string {
		return "list";
	}

	onPaneMenu(menu: Menu, source: "more-options" | "tab-header" | string): void {
		super.onPaneMenu(menu, source);

		// "More options" is the top-right pane menu button.
		if (source !== "more-options") return;
		if (!this.file) return;

		const labels = getFileOutlinerPaneMenuLabels();
		menu.addSeparator();
		menu.addItem((item) => {
			item
				.setTitle(labels.openAsMarkdown)
				.setIcon("file-text")
				.onClick(() => void this.openSourceMarkdownView({ newLeaf: false }));
		});
		menu.addItem((item) => {
			item
				.setTitle(labels.openAsMarkdownNewTab)
				.setIcon("copy")
				.onClick(() => void this.openSourceMarkdownView({ newLeaf: "tab" }));
		});
	}

	clear(): void {
		this.outlinerFile = null;
		this.blockById.clear();
		this.parentById.clear();
		this.dom.clearBlocks();
		this.display.reset();
		this.dirtyBlockIds.clear();

		this.editingId = null;
		this.pendingFocus = null;
		this.pendingScrollToId = null;
		if (this.pendingBlurTimer) {
			window.clearTimeout(this.pendingBlurTimer);
			this.pendingBlurTimer = null;
		}

		this.tryOrLog("clear/editor.destroy", () => this.editorView?.destroy());
		this.editorView = null;
		this.editorHostEl = null;
		this.rootEl = null;
		this.zoomHeaderEl = null;
		this.topLevelBlocksEl = null;
		this.collapsedIds.clear();
		this.zoomStack = [];
		this.visibleNavCache = null;

		this.dnd.clear();

		this.contentEl.empty();
	}

	setEphemeralState(state: any): void {
		super.setEphemeralState(state);
		const id = extractCaretIdFromSubpath(state?.subpath);
		if (!id) return;

		this.pendingScrollToId = id;
		this.scrollToBlockId(id);
	}

	setViewData(data: string, clear: boolean): void {
		if (clear) this.clear();

		const idPrefix = this.plugin.settings.enable_prefix ? this.plugin.settings.id_prefix : "";
		const { file, content, didChange } = normalizeOutlinerFile(data, {
			idPrefix,
			idLength: this.plugin.settings.id_length,
			indentSize: this.indentSize,
			now: DateTime.now(),
		});

		this.data = content;
		this.outlinerFile = file;
		this.visibleNavCache = null;
		this.rebuildIndex();
		this.render({ forceRebuild: true });

		if (didChange) {
			// Persist normalization invariants (tail lines, ids, etc).
			this.markDirtyAndRequestSave();
		}
	}

	getViewData(): string {
		if (!this.outlinerFile) return this.data ?? "";

		// Apply updated timestamp to blocks changed since the last save.
		if (this.dirtyBlockIds.size > 0) {
			const now = formatSystemDate(DateTime.now());
			for (const id of Array.from(this.dirtyBlockIds)) {
				const b = this.blockById.get(id);
				if (b) b.system.updated = now;
			}
			this.dirtyBlockIds.clear();
		}

		const content = serializeOutlinerFile(this.outlinerFile, { indentSize: this.indentSize });
		this.data = content;
		return content;
	}

	private markDirtyAndRequestSave(opts?: { dirtyIds?: Iterable<string> }): void {
		if (opts?.dirtyIds) {
			for (const id of opts.dirtyIds) this.dirtyBlockIds.add(id);
		}

		// Delegate persistence scheduling to Obsidian's TextFileView debounce.
		this.requestSave();
	}

	private async flushSave(): Promise<void> {
		// Delegate persistence semantics (including pending debounced saves) to TextFileView.
		await this.save();
	}

	private rebuildIndex(): void {
		this.blockById.clear();
		this.parentById.clear();
		const walk = (list: OutlinerBlock[], parentId: string | null) => {
			for (const b of list) {
				this.blockById.set(b.id, b);
				this.parentById.set(b.id, parentId);
				walk(b.children, b.id);
			}
		};
		walk(this.outlinerFile?.blocks ?? [], null);
	}

	private generateUniqueId(): string {
		const prefix = this.plugin.settings.enable_prefix ? this.plugin.settings.id_prefix : "";
		const length = this.plugin.settings.id_length;

		for (let i = 0; i < 50; i++) {
			const id = generateRandomId(prefix, length);
			if (this.blockById.has(id)) continue;
			return id;
		}

		// Extremely unlikely fallback: keep trying with a longer random suffix.
		while (true) {
			const id = Math.random().toString(36).slice(2, 10);
			if (this.blockById.has(id)) continue;
			return id;
		}
	}

	private async openSourceMarkdownView(opts: { newLeaf: "tab" | "split" | false }): Promise<void> {
		const file = this.file;
		if (!file) return;

		this.tryOrLog("openSourceMarkdownView/exitEditMode", () => {
			if (this.editingId) this.exitEditMode(this.editingId);
		});

		try {
			await this.flushSave();
		} catch (err) {
			this.debugLog("openSourceMarkdownView/flushSave", err);
		}

		const leaf = opts.newLeaf ? this.app.workspace.getLeaf(opts.newLeaf) : this.leaf;
		await leaf.setViewState({
			type: "markdown",
			state: { file: file.path, mode: "source" },
			active: true,
		});
		this.tryOrLog("openSourceMarkdownView/setActiveLeaf", () =>
			this.app.workspace.setActiveLeaf(leaf, { focus: true })
		);
	}

	private ensureRoot(): void {
		if (this.rootEl && this.zoomHeaderEl && this.topLevelBlocksEl && this.editorHostEl && this.editorView) return;

		this.contentEl.empty();

		const root = this.contentEl.createDiv({ cls: "blp-file-outliner-root" });
		this.rootEl = root;
		// Capture-phase click router for MarkdownRenderer output (internal links, embed inline edit).
		const clickHost = {
			app: this.app,
			plugin: this.plugin,
			getDefaultSourcePath: () => this.file?.path ?? "",
			debugLog: (scope: string, err: unknown) => this.debugLog(scope, err),
		};
		root.addEventListener(
			"click",
			(evt) => handleOutlinerRootClickCapture(evt as MouseEvent, clickHost),
			true
		);

		const header = root.createDiv({ cls: "blp-file-outliner-zoom-header" });
		header.style.display = "none";
		this.zoomHeaderEl = header;

		const blocks = root.createDiv({ cls: "blp-file-outliner-blocks" });
		this.topLevelBlocksEl = blocks;

		const host = document.createElement("div");
		host.className = "blp-file-outliner-editor";
		host.style.display = "none";
		root.appendChild(host);
		this.editorHostEl = host;

		this.editorView = new EditorView({
			parent: host,
			state: this.createEditorState("", { cursorStart: 0, cursorEnd: 0 }),
		});
		this.suggestEditor = new OutlinerSuggestEditor(this.editorView, {
			logicalHasFocus: () => {
				if (!this.editingId) return false;
				try {
					if (this.leaf !== this.app.workspace.activeLeaf) return false;
				} catch (err) {
					this.debugLog("suggest/logicalHasFocus/activeLeaf", err);
				}
				if (!this.editorHostEl || this.editorHostEl.style.display === "none") return false;
				return true;
			},
		});

		// When focus leaves the editor, we typically exit edit mode (with a small debounce,
		// since structural ops may transiently reparent the editor host).
	this.editorView.contentDOM.addEventListener("focusout", () => this.onEditorBlur());
}

	private createEditorState(doc: string, sel: { cursorStart: number; cursorEnd: number }) {
		return createOutlinerEditorState(doc, sel, {
			isSyncSuppressed: () => this.suppressEditorSync,
			isArrowNavDispatching: () => this.arrowNavDispatching,
			shouldPreserveArrowNavGoalOnce: () => this.preserveArrowNavGoalOnce,
			onResetArrowNavGoalColumn: () => this.resetArrowNavGoalColumn(),
			onPlainTextPasteShortcut: () => {
				this.lastPlainPasteShortcutAt = Date.now();
			},
			onDocChanged: (nextText) => this.onEditorDocChanged(nextText),
			onMaybeTriggerSuggest: () => this.maybeTriggerEditorSuggest(),
			onPaste: (evt) => this.onEditorPaste(evt),
			onToggleTask: () => this.onEditorToggleTask(),
			onToggleTaskMarker: () => this.onEditorToggleTaskMarker(),
			onArrowNavigate: (dir, editor) => this.onEditorArrowNavigate(dir, editor),
			onEnter: () => this.onEditorEnter(),
			onTab: (shift) => this.onEditorTab(shift),
			onBackspace: () => this.onEditorBackspace(),
			onDelete: () => this.onEditorDelete(),
		});
	}

	private maybeTriggerEditorSuggest(): void {
		const id = this.editingId;
		const file = this.file;
		const editor = this.suggestEditor;
		if (!id) return;
		if (!file) return;
		if (!editor) return;
		if (!editor.hasFocus()) return;

		const mgr = (this.app.workspace as any)?.editorSuggest;
		triggerEditorSuggest(mgr, editor, file);
	}

	private closeEditorSuggests(): void {
		const mgr = (this.app.workspace as any)?.editorSuggest;
		const suggests: any[] = Array.isArray(mgr?.suggests) ? mgr.suggests : [];
		for (const s of suggests) {
			if (!s?.isOpen) continue;
			this.tryOrLog("closeEditorSuggests/close", () => s.close?.());
		}
	}

	private render(opts?: { forceRebuild?: boolean }): void {
		const file = this.outlinerFile;
		this.ensureRoot();
		const root = this.topLevelBlocksEl;
		this.pruneZoomStack();
		if (!file || !root) return;

		this.renderZoomHeader();

		// 1) Sync block DOM structure to the current file model.
		if (opts?.forceRebuild) {
			// Keep the editor host alive when we drop/recreate block DOM nodes.
			this.tryOrLog("render/forceRebuild/keepEditorHost", () => {
				if (this.editorHostEl && this.rootEl) {
					this.rootEl.appendChild(this.editorHostEl);
				}
			});

			// Clear DOM caches but keep the view root/editor.
			this.dom.clearBlocks();
			this.display.reset();
		}

		this.syncBlockList(root, this.getRenderBlocks(file));
		this.pruneDom();

		// 2) Restore focus/selection.
		if (this.pendingFocus) {
			const { id, cursorStart, cursorEnd } = this.pendingFocus;
			this.pendingFocus = null;
			this.enterEditMode(id, { cursorStart, cursorEnd, scroll: true });
		} else if (this.editingId) {
			this.enterEditMode(this.editingId, { cursorStart: 0, cursorEnd: 0, scroll: false, reuseExisting: true });
		}

		// 3) Handle deep-link scroll.
		if (this.pendingScrollToId) {
			this.scrollToBlockId(this.pendingScrollToId);
		}

		// 4) Lazy-render: refresh which blocks are in/near viewport, then drain render queue.
		try {
			this.display.refreshVisibleBlocksFromDom();
		} catch (err) {
			this.debugLog("render/refreshVisibleBlocksFromDom", err);
		}
		this.display.scheduleDisplayRenderDrain();
	}

	private getZoomRootId(): string | null {
		return this.zoomStack.length > 0 ? this.zoomStack[this.zoomStack.length - 1] ?? null : null;
	}

	private pruneZoomStack(): void {
		let changed = false;
		while (this.zoomStack.length > 0) {
			const id = this.zoomStack[this.zoomStack.length - 1];
			if (id && this.blockById.has(id)) break;
			this.zoomStack.pop();
			changed = true;
		}

		if (changed) this.visibleNavCache = null;
	}

	private getRenderBlocks(file: ParsedOutlinerFile): OutlinerBlock[] {
		const rootId = this.getZoomRootId();
		if (!rootId) return file.blocks ?? [];

		const root = this.blockById.get(rootId);
		return root ? [root] : file.blocks ?? [];
	}

	private renderZoomHeader(): void {
		const header = this.zoomHeaderEl;
		if (!header) return;

		const rootId = this.getZoomRootId();
		if (!rootId) {
			header.style.display = "none";
			header.replaceChildren();
			return;
		}

		header.style.display = "";
		header.replaceChildren();

		const back = document.createElement("button");
		back.type = "button";
		back.className = "blp-outliner-zoom-back";
		back.textContent = "Back";
		back.addEventListener("click", (evt) => {
			evt.preventDefault();
			evt.stopPropagation();
			this.zoomOut();
		});
		header.appendChild(back);

		const crumbs = document.createElement("div");
		crumbs.className = "blp-outliner-zoom-breadcrumbs";
		header.appendChild(crumbs);

		const addSep = () => {
			const sep = document.createElement("span");
			sep.className = "blp-outliner-zoom-sep";
			sep.textContent = ">";
			crumbs.appendChild(sep);
		};

		const addCrumb = (opts: { text: string; onClick?: () => void; isCurrent?: boolean }) => {
			const btn = document.createElement("button");
			btn.type = "button";
			btn.className = "blp-outliner-zoom-crumb";
			if (opts.isCurrent) btn.classList.add("is-blp-outliner-zoom-current");
			btn.textContent = opts.text;

			if (opts.onClick) {
				btn.addEventListener("click", (evt) => {
					evt.preventDefault();
					evt.stopPropagation();
					opts.onClick?.();
				});
			} else {
				btn.disabled = true;
			}

			crumbs.appendChild(btn);
		};

		const fileCrumbText = this.file?.basename ?? this.file?.path ?? "File";
		addCrumb({
			text: fileCrumbText,
			onClick: () => {
				const focusId = this.getZoomRootId();
				if (this.editingId) this.exitEditMode(this.editingId);
				this.zoomStack = [];
				this.visibleNavCache = null;
				if (focusId && this.blockById.has(focusId)) {
					const end = String(this.blockById.get(focusId)?.text ?? "").length;
					this.pendingFocus = { id: focusId, cursorStart: end, cursorEnd: end };
					this.pendingScrollToId = focusId;
				}
				this.render({ forceRebuild: true });
			},
		});

		for (let i = 0; i < this.zoomStack.length; i++) {
			const id = this.zoomStack[i];
			if (!id) continue;
			addSep();

			const block = this.blockById.get(id);
			const title = String(block?.text ?? id).split("\n")[0] ?? id;
			const isCurrent = i === this.zoomStack.length - 1;

			addCrumb({
				text: title,
				isCurrent,
				onClick: isCurrent
					? undefined
					: () => {
							if (this.editingId) this.exitEditMode(this.editingId);
							this.zoomStack = this.zoomStack.slice(0, i + 1);
							this.visibleNavCache = null;
							const focusId = this.getZoomRootId();
							if (focusId && this.blockById.has(focusId)) {
								const end = String(this.blockById.get(focusId)?.text ?? "").length;
								this.pendingFocus = { id: focusId, cursorStart: end, cursorEnd: end };
								this.pendingScrollToId = focusId;
							}
							this.render({ forceRebuild: true });
						},
			});
		}
	}

	private isDescendantOrSelf(descendantId: string, ancestorId: string): boolean {
		let cur: string | null = descendantId;
		while (cur) {
			if (cur === ancestorId) return true;
			cur = this.parentById.get(cur) ?? null;
		}
		return false;
	}

	private setCollapsed(id: string, collapsed: boolean): void {
		const block = this.blockById.get(id);
		const hasChildren = (block?.children?.length ?? 0) > 0;
		if (!hasChildren) {
			this.collapsedIds.delete(id);
			collapsed = false;
		}

		if (collapsed) this.collapsedIds.add(id);
		else this.collapsedIds.delete(id);
		this.visibleNavCache = null;

		const el = this.dom.getBlockEl(id);
		if (el) el.classList.toggle("is-blp-outliner-collapsed", collapsed);

		const childrenContainer = this.dom.getChildrenContainerEl(id);
		if (childrenContainer) childrenContainer.style.display = collapsed ? "none" : "";

		// If we just hid the active editor, exit edit mode to keep focus predictable.
		if (collapsed && this.editingId && this.isDescendantOrSelf(this.editingId, id) && this.editingId !== id) {
			this.exitEditMode(this.editingId);
		}
	}

	private toggleCollapsed(id: string): void {
		this.setCollapsed(id, !this.collapsedIds.has(id));
	}

	private zoomInto(id: string): void {
		const current = this.getZoomRootId();
		if (current === id) return;
		if (!this.blockById.has(id)) return;

		if (this.editingId) this.exitEditMode(this.editingId);

		// Zoom stack is a path (root -> ... -> id), not a navigation history.
		// This makes breadcrumbs stable even when the user zooms directly into a deep child.
		const nextStack: string[] = [];
		const visited = new Set<string>();
		let cur: string | null = id;
		while (cur && !visited.has(cur)) {
			visited.add(cur);
			nextStack.push(cur);
			cur = this.parentById.get(cur) ?? null;
		}
		nextStack.reverse();
		this.zoomStack = nextStack;
		this.visibleNavCache = null;
		const end = String(this.blockById.get(id)?.text ?? "").length;
		this.pendingFocus = { id, cursorStart: end, cursorEnd: end };
		this.render({ forceRebuild: true });
	}

	private zoomOut(): void {
		if (this.zoomStack.length === 0) return;

		if (this.editingId) this.exitEditMode(this.editingId);

		const popped = this.zoomStack.pop();
		this.visibleNavCache = null;
		const focusId = this.getZoomRootId() ?? popped ?? null;
		if (focusId) {
			const end = String(this.blockById.get(focusId)?.text ?? "").length;
			this.pendingFocus = { id: focusId, cursorStart: end, cursorEnd: end };
			this.pendingScrollToId = focusId;
		}

		this.render({ forceRebuild: true });
	}

	private insertAfterBlock(id: string): void {
		if (!this.outlinerFile) return;
		const ctx = this.getEngineContext();
		this.applyEngineResult(insertAfter(this.outlinerFile, id, ctx));
	}

	private toggleTaskStatusForBlock(id: string): void {
		const b = this.blockById.get(id);
		if (!b) return;

		const doc = String(b.text ?? "");
		const nl = doc.indexOf("\n");
		const firstLineEnd = nl >= 0 ? nl : doc.length;
		const firstLine = doc.slice(0, firstLineEnd);

		const nextFirstLine = toggleTaskStatusMarkerPrefix(firstLine);
		if (nextFirstLine === firstLine) return;

		b.text = `${nextFirstLine}${doc.slice(firstLineEnd)}`;
		this.markDirtyAndRequestSave({ dirtyIds: [id] });
		this.display.renderBlockDisplay(id);
	}

	private toggleTaskMarkerForBlock(id: string): void {
		const b = this.blockById.get(id);
		if (!b) return;

		const doc = String(b.text ?? "");
		const nl = doc.indexOf("\n");
		const firstLineEnd = nl >= 0 ? nl : doc.length;
		const firstLine = doc.slice(0, firstLineEnd);

		const nextFirstLine = toggleTaskMarkerPrefix(firstLine);
		if (nextFirstLine === firstLine) return;

		b.text = `${nextFirstLine}${doc.slice(firstLineEnd)}`;
		this.markDirtyAndRequestSave({ dirtyIds: [id] });
		this.display.renderBlockDisplay(id);
	}

	private async copyBlockSubtree(id: string): Promise<void> {
		const b = this.blockById.get(id);
		if (!b) return;

		const text = serializeOutlinerBlocksForClipboard([b], { indentSize: this.indentSize });
		await navigator.clipboard.writeText(text);
	}

	private openBulletMenu(id: string, evt: MouseEvent): void {
		if (!this.outlinerFile) return;
		if (!this.file) return;

		const block = this.blockById.get(id);
		if (!block) return;

		const menu = new Menu();
		const labels = getFileOutlinerContextMenuLabels();

		const caretId = `^${id}`;

		menu.addItem((item) => {
			item.setTitle(labels.copyBlockReference).onClick(() => {
				Clipboard.copyToClipboard(this.app, this.plugin.settings, this.file!, caretId, false, undefined, false);
			});
		});
		menu.addItem((item) => {
			item.setTitle(labels.copyBlockEmbed).onClick(() => {
				Clipboard.copyToClipboard(this.app, this.plugin.settings, this.file!, caretId, true, undefined, false);
			});
		});
		menu.addItem((item) => {
			item.setTitle(labels.copyBlockUrl).onClick(() => {
				Clipboard.copyToClipboard(this.app, this.plugin.settings, this.file!, caretId, false, undefined, true);
			});
		});

		menu.addSeparator();

		const isTask = Boolean(getTaskMarkerFromBlockText(block.text ?? ""));
		menu.addItem((item) => {
			item.setTitle(isTask ? labels.convertToNormalBlock : labels.convertToTask).onClick(() => {
				if (this.editingId === id) {
					this.onEditorToggleTaskMarker();
					return;
				}
				this.toggleTaskMarkerForBlock(id);
			});
		});

		menu.addSeparator();

		menu.addItem((item) => {
			item.setTitle(labels.copy).onClick(() => {
				void this.copyBlockSubtree(id);
			});
		});

		menu.addItem((item) => {
			item.setTitle(labels.cut).onClick(() => {
				void (async () => {
					await this.copyBlockSubtree(id);
					if (this.editingId) this.exitEditMode(this.editingId);
					const ctx = this.getEngineContext();
					this.applyEngineResult(deleteBlock(this.outlinerFile!, id, ctx));
				})();
			});
		});

		menu.addItem((item) => {
			item.setTitle(labels.delete).onClick(() => {
				if (this.editingId) this.exitEditMode(this.editingId);
				const ctx = this.getEngineContext();
				this.applyEngineResult(deleteBlock(this.outlinerFile!, id, ctx));
			});
		});

		menu.addSeparator();

		const hasChildren = (block.children?.length ?? 0) > 0;
		const isCollapsed = this.collapsedIds.has(id);

		menu.addItem((item) => {
			item
				.setTitle(labels.collapse)
				.setDisabled(!hasChildren || isCollapsed)
				.onClick(() => this.setCollapsed(id, true));
		});
		menu.addItem((item) => {
			item
				.setTitle(labels.expand)
				.setDisabled(!hasChildren || !isCollapsed)
				.onClick(() => this.setCollapsed(id, false));
		});

		menu.showAtMouseEvent(evt);
	}

	private isSelfOrDescendant(rootId: string, id: string): boolean {
		let cur: string | null = id;
		for (let i = 0; i < 200 && cur; i++) {
			if (cur === rootId) return true;
			cur = this.parentById.get(cur) ?? null;
		}
		return false;
	}

	private syncBlockList(container: HTMLElement, blocks: OutlinerBlock[]): void {
		for (const block of blocks) {
			const el = this.dom.ensureBlockElement(block.id);
			// Match Logseq DOM conventions so we can reuse its proven CSS selector strategy.
			const hasChildren = (block.children?.length ?? 0) > 0;
			el.setAttribute("haschild", hasChildren ? "true" : "false");
			el.setAttribute("level", String((block.depth ?? 0) + 1));

			const collapsed = hasChildren && this.collapsedIds.has(block.id);
			if (!hasChildren) this.collapsedIds.delete(block.id);
			el.classList.toggle("is-blp-outliner-collapsed", collapsed);
			const childrenContainer = this.dom.getChildrenContainerEl(block.id);
			if (childrenContainer) childrenContainer.style.display = collapsed ? "none" : "";

			container.appendChild(el);

			// Ensure the display is rendered at least once for new blocks.
			this.display.ensurePlaceholderAndScheduleFirstRender(block.id);

			const children = this.dom.getChildrenEl(block.id);
			if (children) this.syncBlockList(children, block.children ?? []);
		}
	}

	private pruneDom(): void {
		// Remove block elements for ids that are no longer in the model.
		for (const [id] of Array.from(this.dom.getBlockElEntries())) {
			if (this.blockById.has(id)) continue;

			this.display.removeBlock(id);

			// If we just deleted the active block, force exit edit mode.
			if (this.editingId === id) {
				this.editingId = null;
				this.tryOrLog("pruneDom/removeEditorHost", () => this.editorHostEl?.remove());

				if (this.editorHostEl && this.rootEl) {
					this.rootEl.appendChild(this.editorHostEl);
					this.editorHostEl.style.display = "none";
				}
			}

			this.dom.removeBlock(id);
			this.collapsedIds.delete(id);
		}
	}

	private enterEditMode(
		id: string,
		opts: { cursorStart: number; cursorEnd: number; scroll: boolean; reuseExisting?: boolean }
	): void {
		this.ensureRoot();
		if (!this.editorHostEl || !this.editorView) return;
		if (!this.outlinerFile) return;

		if (this.editingId !== id && !this.preserveArrowNavGoalOnce) {
			this.resetArrowNavGoalColumn();
		}

		const block = this.blockById.get(id);
		const host = this.dom.getBlockContentEl(id);
		const display = this.dom.getDisplayEl(id);

		if (!block || !host || !display) {
			if (!opts.reuseExisting) this.render({ forceRebuild: true });
			return;
		}

		if (this.editingId && this.editingId !== id) {
			this.exitEditMode(this.editingId);
		}

		this.editingId = id;
		if (this.pendingBlurTimer) {
			window.clearTimeout(this.pendingBlurTimer);
			this.pendingBlurTimer = null;
		}
		for (const [prevId, prevEl] of this.dom.getBlockElEntries()) {
			if (prevId !== id) prevEl.classList.remove("is-blp-outliner-active");
		}
		this.dom.getBlockEl(id)?.classList.add("is-blp-outliner-active");

		display.style.display = "none";
		host.appendChild(this.editorHostEl);
		this.editorHostEl.style.display = "";

		if (!opts.reuseExisting) {
			this.suppressEditorSync = true;
			try {
				this.editorView.setState(this.createEditorState(block.text ?? "", opts));
			} finally {
				this.suppressEditorSync = false;
			}
		}

		this.editorView.focus();

		if (opts.scroll) {
			this.editorHostEl.scrollIntoView({ block: "nearest" });
		}
	}

	private exitEditMode(id: string): void {
		const editor = this.editorView;
		const editorHost = this.editorHostEl;
		const display = this.dom.getDisplayEl(id);
		const b = this.blockById.get(id);
		if (!editor || !editorHost || !display) return;
		if (this.pendingBlurTimer) {
			window.clearTimeout(this.pendingBlurTimer);
			this.pendingBlurTimer = null;
		}

		// Commit latest editor value.
		if (b) {
			const nextText = editor.state.doc.toString();
			if (b.text !== nextText) {
				b.text = nextText;
				this.dirtyBlockIds.add(id);
			}
		}

		this.editingId = null;
		this.closeEditorSuggests();
		this.dom.getBlockEl(id)?.classList.remove("is-blp-outliner-active");
		editorHost.style.display = "none";
		if (this.rootEl) {
			this.rootEl.appendChild(editorHost);
		}
		display.style.display = "";
		this.display.renderBlockDisplay(id);

		if (!this.preserveArrowNavGoalOnce) {
			this.resetArrowNavGoalColumn();
		}

		this.markDirtyAndRequestSave();
	}

	private getActiveSelection(): OutlinerSelection | null {
		if (!this.outlinerFile) return null;
		if (!this.editorView) return null;
		const id = this.editingId;
		if (!id) return null;
		const block = this.blockById.get(id);
		if (!block) return null;

		const value = this.editorView.state.doc.toString();
		// Keep model in sync with the editor before structural ops.
		block.text = value;

		const range = this.editorView.state.selection.main;
		const start = Math.min(range.from, range.to);
		const end = Math.max(range.from, range.to);
		return { id, start, end };
	}

	private getEngineContext(): OutlinerEngineContext {
		const now = formatSystemDate(DateTime.now());
		return {
			now,
			generateId: () => this.generateUniqueId(),
			childrenOnSplit: this.plugin.settings.fileOutlinerChildrenOnSplit ?? "keep",
			backspaceWithChildren: this.plugin.settings.fileOutlinerBackspaceWithChildren ?? "merge",
		};
	}

	private applyEngineResult(
		result: {
			didChange: boolean;
			file: ParsedOutlinerFile;
			selection: OutlinerSelection;
			dirtyIds: Set<string>;
		},
		opts?: { focus?: boolean }
	): void {
		if (!result.didChange) return;

		this.ensureRoot();

		this.outlinerFile = result.file;
		this.visibleNavCache = null;
		this.rebuildIndex();

		for (const id of Array.from(result.dirtyIds)) {
			this.dirtyBlockIds.add(id);
		}

		const shouldFocus = opts?.focus !== false;
		if (shouldFocus) {
			this.pendingFocus = {
				id: result.selection.id,
				cursorStart: result.selection.start,
				cursorEnd: result.selection.end,
			};
		} else {
			this.pendingFocus = null;
			this.pendingScrollToId = result.selection.id;
		}

		// Re-render and try to keep scroll/focus stable by reusing existing DOM nodes.
		this.render();
		for (const id of Array.from(result.dirtyIds)) {
			if (id === this.editingId) continue;
			// Avoid stale display: show a cheap placeholder immediately, then render markdown when visible.
			this.display.renderBlockPlaceholder(id);
			this.display.markNeedsRender(id);
		}
		this.display.scheduleDisplayRenderDrain();

		this.markDirtyAndRequestSave();
	}

	private onEditorDocChanged(nextText: string): void {
		if (this.suppressEditorSync) return;

		const id = this.editingId;
		if (!id) return;

		const b = this.blockById.get(id);
		if (!b) return;

		b.text = nextText;
		this.markDirtyAndRequestSave({ dirtyIds: [id] });
	}

	private onEditorBlur(): void {
		const id = this.editingId;
		const editor = this.editorView;
		const editorHost = this.editorHostEl;
		if (!id || !editor || !editorHost) return;

		// Blur can happen transiently when we reorder/move DOM nodes during a structural edit.
		// Defer the decision: if focus immediately returns to our editor host, keep edit mode.
		if (this.pendingBlurTimer) window.clearTimeout(this.pendingBlurTimer);
		this.pendingBlurTimer = window.setTimeout(() => {
			this.pendingBlurTimer = null;
			if (this.editingId !== id) return;
			const active = document.activeElement as HTMLElement | null;
			if (active && editorHost.contains(active)) return;
			if (active && this.contentEl.contains(active)) return;
			this.exitEditMode(id);
		}, 32);
	}

	private resetArrowNavGoalColumn(): void {
		this.arrowNavGoalCh = null;
	}

	private getVisibleBlockNav(): VisibleBlockNav {
		if (this.visibleNavCache) return this.visibleNavCache;
		if (!this.outlinerFile) return { order: [], indexById: new Map() };

		const nav = computeVisibleBlockNav(this.getRenderBlocks(this.outlinerFile), this.collapsedIds);
		this.visibleNavCache = nav;
		return nav;
	}

	private onEditorArrowNavigate(dir: ArrowNavDirection, editor: EditorView): boolean {
		if (!this.outlinerFile) return false;
		if (!this.editingId) return false;

		// When EditorSuggest is open, arrow keys should navigate the suggestion UI.
		const mgr = (this.app.workspace as any)?.editorSuggest;
		if (mgr?.currentSuggest?.isOpen) return false;

		const r = editor.state.selection.main;
		if (!r.empty) return false;

		const before = { anchor: r.anchor, head: r.head };
		const beforeLine = editor.state.doc.lineAt(before.head);
		const beforeCh = before.head - beforeLine.from;

		if (this.arrowNavGoalCh === null) this.arrowNavGoalCh = beforeCh;
		const goalCh = this.arrowNavGoalCh;

		const beforeCoords = editor.coordsAtPos(before.head);
		const moved = editor.moveVertically(r, dir === "down");

		if (beforeCoords) {
			const afterCoords = editor.coordsAtPos(moved.head);
			if (!afterCoords) {
				this.arrowNavDispatching = true;
				try {
					editor.dispatch({ selection: EditorSelection.create([moved]) });
				} finally {
					this.arrowNavDispatching = false;
				}
				return true;
			}

			const dy = afterCoords.top - beforeCoords.top;
			const movedVert = Math.abs(dy) >= 1;
			if (movedVert) {
				this.arrowNavDispatching = true;
				try {
					editor.dispatch({ selection: EditorSelection.create([moved]) });
				} finally {
					this.arrowNavDispatching = false;
				}
				return true;
			}
		} else {
			// If we can't measure the caret, fall back to applying the in-block move. Cross-block
			// navigation requires reliable visual-line boundary detection.
			this.arrowNavDispatching = true;
			try {
				editor.dispatch({ selection: EditorSelection.create([moved]) });
			} finally {
				this.arrowNavDispatching = false;
			}
			return true;
		}

		const currentId = this.editingId;
		const nav = this.getVisibleBlockNav();
		const nextId = findAdjacentVisibleBlockId(nav, currentId, dir);
		if (!nextId) return true;

		const nextBlock = this.blockById.get(nextId);
		if (!nextBlock) return true;

		const cursor =
			dir === "up" ? cursorPosAtLastLine(nextBlock.text ?? "", goalCh) : cursorPosAtFirstLine(nextBlock.text ?? "", goalCh);

		this.preserveArrowNavGoalOnce = true;
		try {
			this.enterEditMode(nextId, { cursorStart: cursor, cursorEnd: cursor, scroll: true });
		} finally {
			this.preserveArrowNavGoalOnce = false;
		}

		return true;
	}

	private onEditorEnter(): boolean {
		if (!this.outlinerFile) return false;

		const sel = this.getActiveSelection();
		if (!sel) return false;

		const ctx = this.getEngineContext();
		this.applyEngineResult(splitAtSelection(this.outlinerFile, sel, ctx));
		return true;
	}

	private onEditorTab(shift: boolean): boolean {
		if (!this.outlinerFile) return false;

		const sel = this.getActiveSelection();
		if (!sel) return false;

		this.applyEngineResult(shift ? outdentBlock(this.outlinerFile, sel) : indentBlock(this.outlinerFile, sel));
		return true;
	}

	private onEditorBackspace(): boolean {
		if (!this.outlinerFile) return false;

		const sel = this.getActiveSelection();
		if (!sel) return false;
		if (sel.start !== 0 || sel.end !== 0) return false;

		const ctx = this.getEngineContext();
		this.applyEngineResult(backspaceAtStart(this.outlinerFile, sel, { backspaceWithChildren: ctx.backspaceWithChildren }));
		return true;
	}

	private onEditorDelete(): boolean {
		if (!this.outlinerFile) return false;

		const sel = this.getActiveSelection();
		if (!sel) return false;
		if (!this.editorView) return false;

		const valueLen = this.editorView.state.doc.length;
		if (sel.start !== valueLen || sel.end !== valueLen) return false;

		this.applyEngineResult(mergeWithNext(this.outlinerFile, sel));
		return true;
	}

	private consumePlainTextPasteBypass(): boolean {
		const t = this.lastPlainPasteShortcutAt;
		this.lastPlainPasteShortcutAt = 0;
		return t !== 0 && Date.now() - t < 750;
	}

	private onEditorToggleTask(): boolean {
		const editor = this.editorView;
		if (!editor) return false;
		if (!this.editingId) return false;

		const doc = editor.state.doc.toString();
		const nl = doc.indexOf("\n");
		const firstLineEnd = nl >= 0 ? nl : doc.length;

		const firstLine = doc.slice(0, firstLineEnd);
		const nextFirstLine = toggleTaskStatusMarkerPrefix(firstLine);
		if (nextFirstLine === firstLine) return false;

		const delta = nextFirstLine.length - firstLine.length;
		const nextLen = doc.length + delta;
		const clamp = (n: number) => Math.max(0, Math.min(nextLen, Math.floor(n)));

		const r = editor.state.selection.main;
		editor.dispatch({
			changes: { from: 0, to: firstLineEnd, insert: nextFirstLine },
			selection: { anchor: clamp(r.anchor + delta), head: clamp(r.head + delta) },
		});
		return true;
	}

	private onEditorToggleTaskMarker(): boolean {
		const editor = this.editorView;
		if (!editor) return false;
		if (!this.editingId) return false;

		const doc = editor.state.doc.toString();
		const nl = doc.indexOf("\n");
		const firstLineEnd = nl >= 0 ? nl : doc.length;

		const firstLine = doc.slice(0, firstLineEnd);
		const nextFirstLine = toggleTaskMarkerPrefix(firstLine);
		if (nextFirstLine === firstLine) return false;

		const delta = nextFirstLine.length - firstLine.length;
		const nextLen = doc.length + delta;
		const clamp = (n: number) => Math.max(0, Math.min(nextLen, Math.floor(n)));

		const r = editor.state.selection.main;
		editor.dispatch({
			changes: { from: 0, to: firstLineEnd, insert: nextFirstLine },
			selection: { anchor: clamp(r.anchor + delta), head: clamp(r.head + delta) },
		});
		return true;
	}

	private onEditorPaste(evt: ClipboardEvent): boolean {
		if (!this.outlinerFile) return false;
		if (this.consumePlainTextPasteBypass()) return false;
		if (this.plugin.settings.fileOutlinerPasteMultiline !== "split") return false;

		const raw = evt.clipboardData?.getData("text/plain") ?? "";
		if (!raw.includes("\n") && !raw.includes("\r")) return false;

		const sel = this.getActiveSelection();
		if (!sel) return false;

		evt.preventDefault();
		evt.stopPropagation();

		const ctx = this.getEngineContext();
		this.applyEngineResult(pasteSplitLines(this.outlinerFile, sel, raw, { now: ctx.now, generateId: ctx.generateId }));
		return true;
	}

	private scrollToBlockId(id: string): void {
		const sel = `[data-blp-outliner-id="${(window as any).CSS?.escape ? (window as any).CSS.escape(id) : id}"]`;
		const row = this.contentEl.querySelector(sel) as HTMLElement | null;
		if (!row) return;

		row.scrollIntoView({ block: "center" });
		row.addClass("is-blp-outliner-target");
		window.setTimeout(() => row.removeClass("is-blp-outliner-target"), 1500);
		this.pendingScrollToId = null;
	}
}
