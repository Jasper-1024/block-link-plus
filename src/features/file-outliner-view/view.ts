import { Component, MarkdownRenderer, Menu, TextFileView, WorkspaceLeaf } from "obsidian";
import { DateTime } from "luxon";

import { EditorState, Prec } from "@codemirror/state";
import { EditorView, keymap } from "@codemirror/view";
import { basicSetup } from "@codemirror/basic-setup";

import i18n from "shared/i18n";

import type BlockLinkPlus from "../../main";
import { fileOutlinerMarkdownPostProcessor } from "../../ui/MarkdownPostOutliner";
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
	type OutlinerMoveWhere,
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
import { sanitizeOutlinerBlockMarkdownForDisplay } from "./block-markdown";
import { isPlainTextPasteShortcut, toggleTaskMarkerPrefix } from "./editor-shortcuts";
import { normalizeInternalMarkdownEmbeds } from "./embed-dom";

type PendingFocus = {
	id: string;
	cursorStart: number;
	cursorEnd: number;
};

type OutlinerDndDrop = {
	targetId: string;
	where: OutlinerMoveWhere;
};

type OutlinerDndPreStart = {
	sourceId: string;
	pointerId: number;
	startX: number;
	startY: number;
};

type OutlinerDndState = {
	sourceId: string;
	pointerId: number;
	drop: OutlinerDndDrop | null;
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

	private blockElById = new Map<string, HTMLElement>();
	private blockContentElById = new Map<string, HTMLElement>();
	private childrenContainerElById = new Map<string, HTMLElement>();
	private childrenElById = new Map<string, HTMLElement>();
	private displayElById = new Map<string, HTMLElement>();

	private displayRenderSeqById = new Map<string, number>();
	private displayRenderComponentById = new Map<string, Component>();

	private editorHostEl: HTMLElement | null = null;
	private editorView: EditorView | null = null;
	private suppressEditorSync = false;
	private editingId: string | null = null;
	private pendingFocus: PendingFocus | null = null;
	private pendingScrollToId: string | null = null;
	private pendingBlurTimer: number | null = null;

	private lastPlainPasteShortcutAt = 0;

	private collapsedIds = new Set<string>();
	private zoomStack: string[] = [];

	private dndPreStart: OutlinerDndPreStart | null = null;
	private dndState: OutlinerDndState | null = null;
	private dndIndicatorEl: HTMLElement | null = null;
	private dndDropTargetId: string | null = null;
	private dndLastEndAt = 0;

	private readonly indentSize = 2;

	constructor(leaf: WorkspaceLeaf, plugin: BlockLinkPlus) {
		super(leaf);
		this.plugin = plugin;
		this.contentEl.addClass("blp-file-outliner-view");
		this.syncFeatureToggles();
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
		} catch {
			// ignore
		}
	}

	/**
	 * Called after plugin settings are saved to apply feature toggles to already-open leaves.
	 */
	public onFileOutlinerSettingsChanged(): void {
		this.syncFeatureToggles();

		// If a toggle is turned off mid-session, leave the view in a sane state.
		if (this.plugin.settings.fileOutlinerDragAndDropEnabled === false) {
			this.dndPreStart = null;
			if (this.dndState) this.stopDragging({ apply: false });
		}

		if (this.plugin.settings.fileOutlinerZoomEnabled === false && this.zoomStack.length > 0) {
			try {
				if (this.editingId) this.exitEditMode(this.editingId);
			} catch {
				// ignore
			}
			this.zoomStack = [];
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
		this.blockElById.clear();
		this.blockContentElById.clear();
		this.childrenContainerElById.clear();
		this.childrenElById.clear();
		this.displayElById.clear();
		this.displayRenderSeqById.clear();
		for (const component of this.displayRenderComponentById.values()) {
			try {
				this.removeChild(component);
			} catch {
				// ignore
			}
		}
		this.displayRenderComponentById.clear();
		this.dirtyBlockIds.clear();

		this.editingId = null;
		this.pendingFocus = null;
		this.pendingScrollToId = null;
		if (this.pendingBlurTimer) {
			window.clearTimeout(this.pendingBlurTimer);
			this.pendingBlurTimer = null;
		}

		try {
			this.editorView?.destroy();
		} catch {
			// ignore
		}
		this.editorView = null;
		this.editorHostEl = null;
		this.rootEl = null;
		this.zoomHeaderEl = null;
		this.topLevelBlocksEl = null;
		this.collapsedIds.clear();
		this.zoomStack = [];

		this.dndPreStart = null;
		this.dndState = null;
		this.dndDropTargetId = null;
		this.dndLastEndAt = 0;
		try {
			document.body.classList.remove("blp-outliner-dragging");
		} catch {
			// ignore
		}
		try {
			this.dndIndicatorEl?.remove();
		} catch {
			// ignore
		}
		this.dndIndicatorEl = null;

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
		this.rebuildIndex();
		this.render({ forceRebuild: true });

		if (didChange) {
			// Persist normalization invariants (tail lines, ids, etc).
			this.requestSave();
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

		try {
			if (this.editingId) this.exitEditMode(this.editingId);
		} catch {
			// ignore
		}

		try {
			await this.save();
		} catch {
			// ignore
		}

		const leaf = opts.newLeaf ? this.app.workspace.getLeaf(opts.newLeaf) : this.leaf;
		await leaf.setViewState({
			type: "markdown",
			state: { file: file.path, mode: "source" },
			active: true,
		});
		try {
			this.app.workspace.setActiveLeaf(leaf, { focus: true });
		} catch {
			// ignore
		}
	}

	private ensureRoot(): void {
		if (this.rootEl && this.zoomHeaderEl && this.topLevelBlocksEl && this.editorHostEl && this.editorView) return;

		this.contentEl.empty();

		const root = this.contentEl.createDiv({ cls: "blp-file-outliner-root" });
		this.rootEl = root;

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

		// When focus leaves the editor, we typically exit edit mode (with a small debounce,
		// since structural ops may transiently reparent the editor host).
		this.editorView.contentDOM.addEventListener("focusout", () => this.onEditorBlur());
	}

	private createEditorState(doc: string, sel: { cursorStart: number; cursorEnd: number }): EditorState {
		const clamp = (n: number) => Math.max(0, Math.min(doc.length, Math.floor(n)));
		const anchor = clamp(sel.cursorStart);
		const head = clamp(sel.cursorEnd);

		return EditorState.create({
			doc,
			selection: { anchor, head },
			extensions: [
				basicSetup,
				EditorView.lineWrapping,
				EditorView.theme({
					"&": {
						font: "inherit",
					},
					".cm-scroller": {
						font: "inherit",
						lineHeight: "inherit",
					},
				}),
				Prec.high(
					keymap.of([
						{
							key: "Mod-Enter",
							run: () => this.onEditorToggleTask(),
						},
						{
							key: "Shift-Enter",
							run: (view) => {
								const r = view.state.selection.main;
								const from = Math.min(r.from, r.to);
								const to = Math.max(r.from, r.to);
								view.dispatch({
									changes: { from, to, insert: "\n" },
									selection: { anchor: from + 1 },
								});
								return true;
							},
						},
						{
							key: "Enter",
							run: () => this.onEditorEnter(),
						},
						{
							key: "Tab",
							run: () => this.onEditorTab(false),
						},
						{
							key: "Shift-Tab",
							run: () => this.onEditorTab(true),
						},
						{
							key: "Backspace",
							run: () => this.onEditorBackspace(),
						},
						{
							key: "Delete",
							run: () => this.onEditorDelete(),
						},
					])
				),
				EditorView.updateListener.of((update) => {
					if (!update.docChanged) return;
					this.onEditorDocChanged(update.state.doc.toString());
				}),
				EditorView.domEventHandlers({
					keydown: (evt) => {
						if (isPlainTextPasteShortcut(evt)) this.lastPlainPasteShortcutAt = Date.now();
						return false;
					},
					paste: (evt) => this.onEditorPaste(evt),
				}),
			],
		});
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
			try {
				if (this.editorHostEl && this.rootEl) {
					this.rootEl.appendChild(this.editorHostEl);
				}
			} catch {
				// ignore
			}

			// Clear DOM caches but keep the view root/editor.
			for (const el of this.blockElById.values()) el.remove();
			this.blockElById.clear();
			this.blockContentElById.clear();
			this.childrenContainerElById.clear();
			this.childrenElById.clear();
			this.displayElById.clear();
			this.displayRenderSeqById.clear();
			for (const component of this.displayRenderComponentById.values()) {
				try {
					this.removeChild(component);
				} catch {
					// ignore
				}
			}
			this.displayRenderComponentById.clear();
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
	}

	private getZoomRootId(): string | null {
		return this.zoomStack.length > 0 ? this.zoomStack[this.zoomStack.length - 1] ?? null : null;
	}

	private pruneZoomStack(): void {
		while (this.zoomStack.length > 0) {
			const id = this.zoomStack[this.zoomStack.length - 1];
			if (id && this.blockById.has(id)) return;
			this.zoomStack.pop();
		}
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

		const el = this.blockElById.get(id);
		if (el) el.classList.toggle("is-blp-outliner-collapsed", collapsed);

		const childrenContainer = this.childrenContainerElById.get(id);
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
		const end = String(this.blockById.get(id)?.text ?? "").length;
		this.pendingFocus = { id, cursorStart: end, cursorEnd: end };
		this.render({ forceRebuild: true });
	}

	private zoomOut(): void {
		if (this.zoomStack.length === 0) return;

		if (this.editingId) this.exitEditMode(this.editingId);

		const popped = this.zoomStack.pop();
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

		const caretId = `^${id}`;

		menu.addItem((item) => {
			item.setTitle("Copy block reference").onClick(() => {
				Clipboard.copyToClipboard(this.app, this.plugin.settings, this.file!, caretId, false, undefined, false);
			});
		});
		menu.addItem((item) => {
			item.setTitle("Copy block embed").onClick(() => {
				Clipboard.copyToClipboard(this.app, this.plugin.settings, this.file!, caretId, true, undefined, false);
			});
		});
		menu.addItem((item) => {
			item.setTitle("Copy block URL").onClick(() => {
				Clipboard.copyToClipboard(this.app, this.plugin.settings, this.file!, caretId, false, undefined, true);
			});
		});

		menu.addSeparator();

		menu.addItem((item) => {
			item.setTitle("Copy").onClick(() => {
				void this.copyBlockSubtree(id);
			});
		});

		menu.addItem((item) => {
			item.setTitle("Cut").onClick(() => {
				void (async () => {
					await this.copyBlockSubtree(id);
					if (this.editingId) this.exitEditMode(this.editingId);
					const ctx = this.getEngineContext();
					this.applyEngineResult(deleteBlock(this.outlinerFile!, id, ctx));
				})();
			});
		});

		menu.addItem((item) => {
			item.setTitle("Delete").onClick(() => {
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
				.setTitle("Collapse")
				.setDisabled(!hasChildren || isCollapsed)
				.onClick(() => this.setCollapsed(id, true));
		});
		menu.addItem((item) => {
			item
				.setTitle("Expand")
				.setDisabled(!hasChildren || !isCollapsed)
				.onClick(() => this.setCollapsed(id, false));
		});

		menu.showAtMouseEvent(evt);
	}

	private onBulletPointerDown(id: string, evt: PointerEvent): void {
		if (evt.button !== 0) return;
		if (!this.outlinerFile) return;
		if (this.plugin.settings.fileOutlinerDragAndDropEnabled === false) return;
		if (this.dndState) return;

		this.dndPreStart = { sourceId: id, pointerId: evt.pointerId, startX: evt.clientX, startY: evt.clientY };
		try {
			(evt.currentTarget as HTMLElement | null)?.setPointerCapture?.(evt.pointerId);
		} catch {
			// ignore
		}
	}

	private onBulletPointerMove(evt: PointerEvent): void {
		const pre = this.dndPreStart;
		if (pre && evt.pointerId === pre.pointerId) {
			if (this.plugin.settings.fileOutlinerDragAndDropEnabled === false) return;
			const dx = evt.clientX - pre.startX;
			const dy = evt.clientY - pre.startY;
			if (Math.hypot(dx, dy) >= 4) {
				this.startDragging(pre);
			}
		}

		const state = this.dndState;
		if (!state) return;
		if (evt.pointerId !== state.pointerId) return;

		if (this.plugin.settings.fileOutlinerDragAndDropEnabled === false) {
			this.stopDragging({ apply: false });
			return;
		}

		evt.preventDefault();

		const drop = this.computeDropVariant(evt.clientX, evt.clientY, state.sourceId);
		state.drop = drop;
		this.renderDropIndicator(drop);
	}

	private onBulletPointerUp(evt: PointerEvent): void {
		const pre = this.dndPreStart;
		if (pre && evt.pointerId === pre.pointerId) {
			this.dndPreStart = null;
		}

		try {
			(evt.currentTarget as HTMLElement | null)?.releasePointerCapture?.(evt.pointerId);
		} catch {
			// ignore
		}

		const state = this.dndState;
		if (!state) return;
		if (evt.pointerId !== state.pointerId) return;

		this.stopDragging({ apply: true });
	}

	private onBulletPointerCancel(evt: PointerEvent): void {
		const pre = this.dndPreStart;
		if (pre && evt.pointerId === pre.pointerId) {
			this.dndPreStart = null;
		}

		try {
			(evt.currentTarget as HTMLElement | null)?.releasePointerCapture?.(evt.pointerId);
		} catch {
			// ignore
		}

		const state = this.dndState;
		if (!state) return;
		if (evt.pointerId !== state.pointerId) return;

		this.stopDragging({ apply: false });
	}

	private startDragging(pre: OutlinerDndPreStart): void {
		this.dndPreStart = null;
		if (!this.outlinerFile) return;
		if (this.plugin.settings.fileOutlinerDragAndDropEnabled === false) return;

		// Ensure latest editor value is committed before we perform structural moves.
		if (this.editingId) {
			try {
				this.exitEditMode(this.editingId);
			} catch {
				// ignore
			}
		}

		this.dndState = { sourceId: pre.sourceId, pointerId: pre.pointerId, drop: null };
		try {
			document.body.classList.add("blp-outliner-dragging");
		} catch {
			// ignore
		}
		this.blockElById.get(pre.sourceId)?.classList.add("is-blp-outliner-dnd-source");

		this.ensureDropIndicator();
	}

	private stopDragging(opts: { apply: boolean }): void {
		const state = this.dndState;
		this.dndState = null;
		this.dndPreStart = null;

		if (!state) return;

		this.dndLastEndAt = Date.now();

		try {
			document.body.classList.remove("blp-outliner-dragging");
		} catch {
			// ignore
		}

		this.blockElById.get(state.sourceId)?.classList.remove("is-blp-outliner-dnd-source");
		if (this.dndDropTargetId) {
			this.blockElById.get(this.dndDropTargetId)?.classList.remove("is-blp-outliner-dnd-target");
		}
		this.dndDropTargetId = null;
		this.renderDropIndicator(null);

		const drop = state.drop;
		if (!opts.apply || !drop || !this.outlinerFile) return;

		// If we move a block into a collapsed subtree, expand so the result is visible.
		if (drop.where === "inside") {
			this.collapsedIds.delete(drop.targetId);
		}

		this.applyEngineResult(moveBlockSubtree(this.outlinerFile, state.sourceId, drop.targetId, drop.where), { focus: false });
	}

	private isSelfOrDescendant(rootId: string, id: string): boolean {
		let cur: string | null = id;
		for (let i = 0; i < 200 && cur; i++) {
			if (cur === rootId) return true;
			cur = this.parentById.get(cur) ?? null;
		}
		return false;
	}

	private computeDropVariant(x: number, y: number, sourceId: string): OutlinerDndDrop | null {
		const hit = document.elementFromPoint(x, y) as HTMLElement | null;
		if (!hit) return null;
		if (!this.contentEl.contains(hit)) return null;

		const blockEl = hit.closest(".ls-block") as HTMLElement | null;
		if (!blockEl) return null;

		const targetId = blockEl.dataset.blpOutlinerId;
		if (!targetId) return null;
		if (this.isSelfOrDescendant(sourceId, targetId)) return null;

		const rowEl = blockEl.querySelector(":scope > .block-main-container") as HTMLElement | null;
		const rowRect = rowEl?.getBoundingClientRect() ?? blockEl.getBoundingClientRect();

		const contentWrap = blockEl.querySelector(":scope > .block-main-container > .block-content-wrapper") as HTMLElement | null;
		const contentRect = contentWrap?.getBoundingClientRect() ?? rowRect;

		const childrenContainer = blockEl.querySelector(":scope > .block-children-container") as HTMLElement | null;
		const childrenOffsetPx = childrenContainer ? Number.parseFloat(getComputedStyle(childrenContainer).marginLeft) || 0 : 0;

		const baseWhere: OutlinerMoveWhere = y < rowRect.top + rowRect.height / 2 ? "before" : "after";

		let where: OutlinerMoveWhere = baseWhere;
		if (baseWhere === "after" && childrenOffsetPx > 0) {
			// Similar to Logseq: dragging horizontally (toward the content) indents as a child.
			const insideThreshold = Math.max(12, Math.min(24, childrenOffsetPx * 0.6));
			if (x > contentRect.left + insideThreshold) where = "inside";
		}

		return { targetId, where };
	}

	private ensureDropIndicator(): void {
		if (this.dndIndicatorEl && this.rootEl?.contains(this.dndIndicatorEl)) return;
		this.ensureRoot();
		if (!this.rootEl) return;

		const el = document.createElement("div");
		el.className = "blp-outliner-dnd-indicator";
		el.style.display = "none";
		this.rootEl.appendChild(el);
		this.dndIndicatorEl = el;
	}

	private renderDropIndicator(drop: OutlinerDndDrop | null): void {
		const indicator = this.dndIndicatorEl;
		const root = this.rootEl;
		if (!indicator || !root) return;

		// Clear previous target highlight.
		if (!drop && this.dndDropTargetId) {
			this.blockElById.get(this.dndDropTargetId)?.classList.remove("is-blp-outliner-dnd-target");
			this.dndDropTargetId = null;
		}

		if (!drop) {
			indicator.style.display = "none";
			return;
		}

		const targetEl = this.blockElById.get(drop.targetId);
		if (!targetEl) {
			indicator.style.display = "none";
			return;
		}

		if (this.dndDropTargetId !== drop.targetId) {
			if (this.dndDropTargetId) {
				this.blockElById.get(this.dndDropTargetId)?.classList.remove("is-blp-outliner-dnd-target");
			}
			this.dndDropTargetId = drop.targetId;
			targetEl.classList.add("is-blp-outliner-dnd-target");
		}

		const rootRect = root.getBoundingClientRect();
		const targetRect = targetEl.getBoundingClientRect();

		const contentWrap = targetEl.querySelector(":scope > .block-main-container > .block-content-wrapper") as HTMLElement | null;
		const contentRect = contentWrap?.getBoundingClientRect() ?? targetRect;

		const childrenContainer = targetEl.querySelector(":scope > .block-children-container") as HTMLElement | null;
		const childrenOffsetPx = childrenContainer ? Number.parseFloat(getComputedStyle(childrenContainer).marginLeft) || 0 : 0;

		const lineLeft = drop.where === "inside" ? contentRect.left + childrenOffsetPx : contentRect.left;
		const lineTop = drop.where === "before" ? targetRect.top : targetRect.bottom;

		const left = Math.max(0, lineLeft - rootRect.left);
		const top = Math.max(0, lineTop - rootRect.top);
		const width = Math.max(16, rootRect.right - lineLeft - 12);

		indicator.style.display = "";
		indicator.style.left = `${Math.round(left)}px`;
		indicator.style.top = `${Math.round(top)}px`;
		indicator.style.width = `${Math.round(width)}px`;
	}

	private syncBlockList(container: HTMLElement, blocks: OutlinerBlock[]): void {
		for (const block of blocks) {
			const el = this.ensureBlockElement(block.id);
			// Match Logseq DOM conventions so we can reuse its proven CSS selector strategy.
			const hasChildren = (block.children?.length ?? 0) > 0;
			el.setAttribute("haschild", hasChildren ? "true" : "false");
			el.setAttribute("level", String((block.depth ?? 0) + 1));

			const collapsed = hasChildren && this.collapsedIds.has(block.id);
			if (!hasChildren) this.collapsedIds.delete(block.id);
			el.classList.toggle("is-blp-outliner-collapsed", collapsed);
			const childrenContainer = this.childrenContainerElById.get(block.id);
			if (childrenContainer) childrenContainer.style.display = collapsed ? "none" : "";

			container.appendChild(el);

			// Ensure the display is rendered at least once for new blocks.
			const display = this.displayElById.get(block.id);
			if (display && display.childNodes.length === 0 && this.editingId !== block.id) {
				this.renderBlockDisplay(block.id);
			}

			const children = this.childrenElById.get(block.id);
			if (children) this.syncBlockList(children, block.children ?? []);
		}
	}

	private ensureBlockElement(id: string): HTMLElement {
		const existing = this.blockElById.get(id);
		if (existing) return existing;

		const blockEl = document.createElement("div");
		blockEl.className = "ls-block";
		blockEl.dataset.blpOutlinerId = id;

		const main = document.createElement("div");
		main.className = "block-main-container items-baseline";
		blockEl.appendChild(main);

		const controlWrap = document.createElement("div");
		controlWrap.className = "block-control-wrap items-center";
		main.appendChild(controlWrap);

		const foldToggle = document.createElement("button");
		foldToggle.type = "button";
		foldToggle.className = "blp-outliner-fold-toggle";
		foldToggle.addEventListener("click", (evt) => {
			evt.preventDefault();
			evt.stopPropagation();
			this.toggleCollapsed(id);
		});
		controlWrap.appendChild(foldToggle);

		const bulletContainer = document.createElement("span");
		bulletContainer.className = "bullet-container";
		controlWrap.appendChild(bulletContainer);

		const bullet = document.createElement("span");
		bullet.className = "bullet";
		bulletContainer.appendChild(bullet);

		const contentWrap = document.createElement("div");
		contentWrap.className = "block-content-wrapper";
		main.appendChild(contentWrap);

		const content = document.createElement("div");
		content.className = "block-content";
		contentWrap.appendChild(content);
		this.blockContentElById.set(id, content);

		const display = document.createElement("div");
		display.className = "blp-file-outliner-display";
		content.appendChild(display);
		this.displayElById.set(id, display);

		const onActivate = (evt: MouseEvent) => {
			// Let normal navigation/controls work (links, buttons, checkboxes, etc).
			const target = evt.target as HTMLElement | null;
			if (target?.closest("a, button, input, textarea")) return;
			// Embedded blocks (InlineEditEngine, native embeds) must remain interactive.
			if (target?.closest(".internal-embed, .markdown-embed, .markdown-embed-link")) return;
			const b = this.blockById.get(id);
			const end = b?.text?.length ?? 0;
			this.enterEditMode(id, { cursorStart: end, cursorEnd: end, scroll: true });
		};

		display.addEventListener("click", onActivate);
		bulletContainer.addEventListener("click", (evt) => {
			evt.preventDefault();
			evt.stopPropagation();
			// Suppress click actions immediately after a drag gesture.
			if (Date.now() - this.dndLastEndAt < 250) return;
			if (this.plugin.settings.fileOutlinerZoomEnabled === false) {
				onActivate(evt);
				return;
			}
			this.zoomInto(id);
		});
		bulletContainer.addEventListener("pointerdown", (evt) => this.onBulletPointerDown(id, evt));
		bulletContainer.addEventListener("pointermove", (evt) => this.onBulletPointerMove(evt));
		bulletContainer.addEventListener("pointerup", (evt) => this.onBulletPointerUp(evt));
		bulletContainer.addEventListener("pointercancel", (evt) => this.onBulletPointerCancel(evt));
		bulletContainer.addEventListener("contextmenu", (evt) => {
			evt.preventDefault();
			evt.stopPropagation();
			this.openBulletMenu(id, evt);
		});

		const childrenContainer = document.createElement("div");
		childrenContainer.className = "block-children-container flex";
		blockEl.appendChild(childrenContainer);
		this.childrenContainerElById.set(id, childrenContainer);

		const leftBorder = document.createElement("div");
		leftBorder.className = "block-children-left-border";
		childrenContainer.appendChild(leftBorder);

		const children = document.createElement("div");
		children.className = "block-children w-full";
		childrenContainer.appendChild(children);
		this.childrenElById.set(id, children);

		const insertHint = document.createElement("div");
		insertHint.className = "blp-outliner-insert-hint";
		insertHint.addEventListener("click", (evt) => {
			evt.preventDefault();
			evt.stopPropagation();
			this.insertAfterBlock(id);
		});

		const insertIcon = document.createElement("div");
		insertIcon.className = "blp-outliner-insert-icon";
		insertIcon.textContent = "+";
		insertHint.appendChild(insertIcon);

		blockEl.appendChild(insertHint);

		this.blockElById.set(id, blockEl);
		return blockEl;
	}

	private pruneDom(): void {
		// Remove block elements for ids that are no longer in the model.
		for (const [id, el] of Array.from(this.blockElById.entries())) {
			if (this.blockById.has(id)) continue;

			// If we just deleted the active block, force exit edit mode.
			if (this.editingId === id) {
				this.editingId = null;
				try {
					this.editorHostEl?.remove();
				} catch {
					// ignore
				}

				if (this.editorHostEl && this.rootEl) {
					this.rootEl.appendChild(this.editorHostEl);
					this.editorHostEl.style.display = "none";
				}
			}

			el.remove();
			this.blockElById.delete(id);
			this.blockContentElById.delete(id);
			this.childrenContainerElById.delete(id);
			this.childrenElById.delete(id);
			this.displayElById.delete(id);
			this.displayRenderSeqById.delete(id);
			this.collapsedIds.delete(id);
			const component = this.displayRenderComponentById.get(id);
			if (component) {
				try {
					this.removeChild(component);
				} catch {
					// ignore
				}
				this.displayRenderComponentById.delete(id);
			}
		}
	}

	private renderBlockDisplay(id: string): void {
		const b = this.blockById.get(id);
		if (!b) return;
		if (!this.displayElById.get(id)) return;

		const seq = (this.displayRenderSeqById.get(id) ?? 0) + 1;
		this.displayRenderSeqById.set(id, seq);

		const md = sanitizeOutlinerBlockMarkdownForDisplay(b.text ?? "");
		const sourcePath = this.file?.path ?? "";
		const tmp = document.createElement("div");
		tmp.classList.add("markdown-rendered");
		const component = this.addChild(new Component());

		void MarkdownRenderer.render(this.app, md.sanitized, tmp, sourcePath, component)
			.then(() => {
				// If another render happened since we started, discard this one.
				if (this.displayRenderSeqById.get(id) !== seq) {
					try {
						this.removeChild(component);
					} catch {
						// ignore
					}
					return;
				}

				const display = this.displayElById.get(id);
				if (!display) {
					try {
						this.removeChild(component);
					} catch {
						// ignore
					}
					this.displayRenderSeqById.delete(id);
					return;
				}

				// Avoid preview-only affordances inside the v2 outliner UI.
				try {
					tmp.querySelectorAll("button.copy-code-button").forEach((btn) => btn.remove());
				} catch {
					// ignore
				}

				// MarkdownRenderer embeds inside this view can miss `.markdown-embed-content`, which breaks
				// reading-range (`^id-id`) rendering and other post-processing that expects native embed DOM.
				try {
					normalizeInternalMarkdownEmbeds(tmp);
				} catch {
					// ignore
				}

				// Hide outliner v2 system tail lines inside embeds rendered by MarkdownRenderer.
				// Call the post-processor before insertion so it doesn't early-return for `.blp-file-outliner-view`.
				if (this.plugin.settings.fileOutlinerHideSystemLine !== false) {
					try {
						const hasMarker =
							Boolean(
								tmp.querySelector(
									'.dataview.inline-field-key[data-dv-key="blp_sys"], .dataview.inline-field-key[data-dv-norm-key="blp_sys"]'
								)
							) || (tmp.textContent ?? "").includes("blp_sys::");
						if (hasMarker) {
							fileOutlinerMarkdownPostProcessor(tmp, { sourcePath } as any, this.plugin);
						}
					} catch {
						// ignore
					}
				}

				const prev = this.displayRenderComponentById.get(id);

				if (md.issues.length > 0) {
					try {
						const banner = document.createElement("div");
						banner.className = "blp-outliner-block-warning";

						const icon = document.createElement("span");
						icon.className = "blp-outliner-block-warning-icon";
						icon.textContent = "!";
						banner.appendChild(icon);

						const text = document.createElement("span");
						text.className = "blp-outliner-block-warning-text";
						text.textContent = String(
							(i18n.notices as any)?.fileOutlinerUnsupportedBlockMarkdown ??
								"Block contains list/heading syntax. Rendered as plain text to preserve outliner structure."
						);
						banner.appendChild(text);

						tmp.prepend(banner);
					} catch {
						// ignore
					}
				}

				display.replaceChildren(tmp);
				this.displayRenderComponentById.set(id, component);

				if (prev) {
					try {
						this.removeChild(prev);
					} catch {
						// ignore
					}
				}
			})
			.catch(() => {
				try {
					this.removeChild(component);
				} catch {
					// ignore
				}
			});
	}

	private enterEditMode(
		id: string,
		opts: { cursorStart: number; cursorEnd: number; scroll: boolean; reuseExisting?: boolean }
	): void {
		this.ensureRoot();
		if (!this.editorHostEl || !this.editorView) return;
		if (!this.outlinerFile) return;

		const block = this.blockById.get(id);
		const host = this.blockContentElById.get(id);
		const display = this.displayElById.get(id);

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
		for (const [prevId, prevEl] of this.blockElById) {
			if (prevId !== id) prevEl.classList.remove("is-blp-outliner-active");
		}
		this.blockElById.get(id)?.classList.add("is-blp-outliner-active");

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
		const display = this.displayElById.get(id);
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
		this.blockElById.get(id)?.classList.remove("is-blp-outliner-active");
		editorHost.style.display = "none";
		if (this.rootEl) {
			this.rootEl.appendChild(editorHost);
		}
		display.style.display = "";
		this.renderBlockDisplay(id);

		this.requestSave();
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
			this.renderBlockDisplay(id);
		}

		this.requestSave();
	}

	private onEditorDocChanged(nextText: string): void {
		if (this.suppressEditorSync) return;

		const id = this.editingId;
		if (!id) return;

		const b = this.blockById.get(id);
		if (!b) return;

		b.text = nextText;
		this.dirtyBlockIds.add(id);
		this.requestSave();
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
