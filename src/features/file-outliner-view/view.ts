import { Component, MarkdownRenderer, TextFileView, WorkspaceLeaf } from "obsidian";
import { DateTime } from "luxon";

import { EditorState, Prec } from "@codemirror/state";
import { EditorView, keymap } from "@codemirror/view";
import { basicSetup } from "@codemirror/basic-setup";

import type BlockLinkPlus from "../../main";
import { generateRandomId } from "../../utils";
import {
	backspaceAtStart,
	indentBlock,
	mergeWithNext,
	outdentBlock,
	pasteSplitLines,
	splitAtSelection,
	type OutlinerEngineContext,
	type OutlinerSelection,
} from "./engine";
import {
	normalizeOutlinerFile,
	serializeOutlinerFile,
	type OutlinerBlock,
	type ParsedOutlinerFile,
} from "./protocol";

export const FILE_OUTLINER_VIEW_TYPE = "blp-file-outliner-view";

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

	private dirtyBlockIds = new Set<string>();

	private rootEl: HTMLElement | null = null;
	private topLevelBlocksEl: HTMLElement | null = null;

	private blockElById = new Map<string, HTMLElement>();
	private blockContentElById = new Map<string, HTMLElement>();
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

	private readonly indentSize = 2;

	constructor(leaf: WorkspaceLeaf, plugin: BlockLinkPlus) {
		super(leaf);
		this.plugin = plugin;
		this.contentEl.addClass("blp-file-outliner-view");
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

	clear(): void {
		this.outlinerFile = null;
		this.blockById.clear();
		this.blockElById.clear();
		this.blockContentElById.clear();
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
		this.topLevelBlocksEl = null;
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
		const walk = (list: OutlinerBlock[]) => {
			for (const b of list) {
				this.blockById.set(b.id, b);
				walk(b.children);
			}
		};
		walk(this.outlinerFile?.blocks ?? []);
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

	private ensureRoot(): void {
		if (this.rootEl && this.topLevelBlocksEl && this.editorHostEl && this.editorView) return;

		this.contentEl.empty();

		const root = this.contentEl.createDiv({ cls: "blp-file-outliner-root" });
		this.rootEl = root;
		this.topLevelBlocksEl = root;

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
					paste: (evt) => this.onEditorPaste(evt),
				}),
			],
		});
	}

	private render(opts?: { forceRebuild?: boolean }): void {
		const file = this.outlinerFile;
		this.ensureRoot();
		const root = this.topLevelBlocksEl;
		if (!file || !root) return;

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

		this.syncBlockList(root, file.blocks ?? []);
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

	private syncBlockList(container: HTMLElement, blocks: OutlinerBlock[]): void {
		for (const block of blocks) {
			const el = this.ensureBlockElement(block.id);
			// Match Logseq DOM conventions so we can reuse its proven CSS selector strategy.
			el.setAttribute("haschild", (block.children?.length ?? 0) > 0 ? "true" : "false");
			el.setAttribute("level", String((block.depth ?? 0) + 1));
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
			const b = this.blockById.get(id);
			const end = b?.text?.length ?? 0;
			this.enterEditMode(id, { cursorStart: end, cursorEnd: end, scroll: true });
		};

		display.addEventListener("click", onActivate);
		bulletContainer.addEventListener("click", onActivate);

		const childrenContainer = document.createElement("div");
		childrenContainer.className = "block-children-container flex";
		blockEl.appendChild(childrenContainer);

		const leftBorder = document.createElement("div");
		leftBorder.className = "block-children-left-border";
		childrenContainer.appendChild(leftBorder);

		const children = document.createElement("div");
		children.className = "block-children w-full";
		childrenContainer.appendChild(children);
		this.childrenElById.set(id, children);

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
			this.childrenElById.delete(id);
			this.displayElById.delete(id);
			this.displayRenderSeqById.delete(id);
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

		const sourcePath = this.file?.path ?? "";
		const tmp = document.createElement("div");
		tmp.classList.add("markdown-rendered");
		const component = this.addChild(new Component());

		void MarkdownRenderer.render(this.app, b.text ?? "", tmp, sourcePath, component)
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

				const prev = this.displayRenderComponentById.get(id);
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

	private applyEngineResult(result: {
		didChange: boolean;
		file: ParsedOutlinerFile;
		selection: OutlinerSelection;
		dirtyIds: Set<string>;
	}): void {
		if (!result.didChange) return;

		this.ensureRoot();

		this.outlinerFile = result.file;
		this.rebuildIndex();

		for (const id of Array.from(result.dirtyIds)) {
			this.dirtyBlockIds.add(id);
		}

		this.pendingFocus = {
			id: result.selection.id,
			cursorStart: result.selection.start,
			cursorEnd: result.selection.end,
		};

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

	private onEditorPaste(evt: ClipboardEvent): boolean {
		if (!this.outlinerFile) return false;
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
