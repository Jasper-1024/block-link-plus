import { MarkdownRenderer, TextFileView, WorkspaceLeaf } from "obsidian";
import { DateTime } from "luxon";

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

function autoGrow(textarea: HTMLTextAreaElement): void {
	textarea.style.height = "auto";
	textarea.style.height = `${textarea.scrollHeight}px`;
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

	private editorEl: HTMLTextAreaElement | null = null;
	private editingId: string | null = null;
	private pendingFocus: PendingFocus | null = null;
	private pendingScrollToId: string | null = null;

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
		this.dirtyBlockIds.clear();

		this.editingId = null;
		this.pendingFocus = null;
		this.pendingScrollToId = null;

		this.editorEl = null;
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
		if (this.rootEl && this.topLevelBlocksEl && this.editorEl) return;

		this.contentEl.empty();

		const root = this.contentEl.createDiv({ cls: "blp-file-outliner-root" });
		this.rootEl = root;
		this.topLevelBlocksEl = root;

		const textarea = document.createElement("textarea");
		textarea.className = "blp-file-outliner-editor";
		textarea.spellcheck = true;
		textarea.rows = 1;
		textarea.style.display = "none";

		textarea.addEventListener("input", () => this.onEditorInput());
		textarea.addEventListener("keydown", (evt) => this.onEditorKeyDown(evt));
		textarea.addEventListener("paste", (evt) => this.onEditorPaste(evt));
		textarea.addEventListener("blur", () => this.onEditorBlur());

		this.editorEl = textarea;
	}

	private render(opts?: { forceRebuild?: boolean }): void {
		const file = this.outlinerFile;
		this.ensureRoot();
		const root = this.topLevelBlocksEl;
		if (!file || !root) return;

		// 1) Sync block DOM structure to the current file model.
		if (opts?.forceRebuild) {
			// Clear DOM caches but keep the view root/editor.
			for (const el of this.blockElById.values()) el.remove();
			this.blockElById.clear();
			this.blockContentElById.clear();
			this.childrenElById.clear();
			this.displayElById.clear();
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
			el.classList.toggle("has-children", (block.children?.length ?? 0) > 0);
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
		main.className = "block-main-container";
		blockEl.appendChild(main);

		const controlWrap = document.createElement("div");
		controlWrap.className = "block-control-wrap";
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
		childrenContainer.className = "block-children-container";
		blockEl.appendChild(childrenContainer);

		const children = document.createElement("div");
		children.className = "block-children";
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
					this.editorEl?.remove();
				} catch {
					// ignore
				}
			}

			el.remove();
			this.blockElById.delete(id);
			this.blockContentElById.delete(id);
			this.childrenElById.delete(id);
			this.displayElById.delete(id);
		}
	}

	private renderBlockDisplay(id: string): void {
		const b = this.blockById.get(id);
		const display = this.displayElById.get(id);
		if (!b || !display) return;

		display.replaceChildren();
		const sourcePath = this.file?.path ?? "";
		void MarkdownRenderer.render(this.app, b.text ?? "", display, sourcePath, this);
	}

	private enterEditMode(
		id: string,
		opts: { cursorStart: number; cursorEnd: number; scroll: boolean; reuseExisting?: boolean }
	): void {
		this.ensureRoot();
		if (!this.editorEl) return;
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
		for (const [prevId, prevEl] of this.blockElById) {
			if (prevId !== id) prevEl.classList.remove("is-blp-outliner-active");
		}
		this.blockElById.get(id)?.classList.add("is-blp-outliner-active");

		display.style.display = "none";
		host.appendChild(this.editorEl);
		this.editorEl.style.display = "";
		this.editorEl.value = block.text ?? "";
		autoGrow(this.editorEl);

		this.editorEl.focus();
		try {
			this.editorEl.setSelectionRange(opts.cursorStart, opts.cursorEnd);
		} catch {
			// Ignore selection errors (e.g. mobile quirks).
		}

		if (opts.scroll) {
			this.editorEl.scrollIntoView({ block: "nearest" });
		}
	}

	private exitEditMode(id: string): void {
		const editor = this.editorEl;
		const display = this.displayElById.get(id);
		const b = this.blockById.get(id);
		if (!editor || !display || !b) return;

		// Commit latest editor value.
		const nextText = editor.value;
		if (b.text !== nextText) {
			b.text = nextText;
			this.dirtyBlockIds.add(id);
		}

		this.editingId = null;
		this.blockElById.get(id)?.classList.remove("is-blp-outliner-active");
		editor.style.display = "none";
		display.style.display = "";
		this.renderBlockDisplay(id);

		this.requestSave();
	}

	private getActiveSelection(): OutlinerSelection | null {
		if (!this.outlinerFile) return null;
		if (!this.editorEl) return null;
		const id = this.editingId;
		if (!id) return null;
		const block = this.blockById.get(id);
		if (!block) return null;

		const value = this.editorEl.value ?? "";
		// Keep model in sync with the editor before structural ops.
		block.text = value;

		const start = this.editorEl.selectionStart ?? 0;
		const end = this.editorEl.selectionEnd ?? 0;
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

	private onEditorInput(): void {
		const id = this.editingId;
		const editor = this.editorEl;
		if (!id || !editor) return;

		const b = this.blockById.get(id);
		if (!b) return;

		b.text = editor.value;
		autoGrow(editor);
		this.dirtyBlockIds.add(id);
		this.requestSave();
	}

	private onEditorBlur(): void {
		const id = this.editingId;
		if (!id) return;
		this.exitEditMode(id);
	}

	private onEditorKeyDown(evt: KeyboardEvent): void {
		// Avoid stealing IME accept/confirm keystrokes.
		if ((evt as any).isComposing) return;
		if (!this.outlinerFile) return;

		// Don't override modified keybinds (users may have custom shortcuts).
		if (evt.metaKey || evt.ctrlKey || evt.altKey) return;

		const sel = this.getActiveSelection();
		if (!sel) return;

		const ctx = this.getEngineContext();
		const value = this.editorEl?.value ?? "";

		if (evt.key === "Enter" && !evt.shiftKey) {
			evt.preventDefault();
			evt.stopPropagation();
			this.applyEngineResult(splitAtSelection(this.outlinerFile, sel, ctx));
			return;
		}

		if (evt.key === "Tab") {
			evt.preventDefault();
			evt.stopPropagation();
			this.applyEngineResult(evt.shiftKey ? outdentBlock(this.outlinerFile, sel) : indentBlock(this.outlinerFile, sel));
			return;
		}

		if (evt.key === "Backspace") {
			if (sel.start === 0 && sel.end === 0) {
				evt.preventDefault();
				evt.stopPropagation();
				this.applyEngineResult(
					backspaceAtStart(this.outlinerFile, sel, { backspaceWithChildren: ctx.backspaceWithChildren })
				);
			}
			return;
		}

		if (evt.key === "Delete") {
			if (sel.start === value.length && sel.end === value.length) {
				evt.preventDefault();
				evt.stopPropagation();
				this.applyEngineResult(mergeWithNext(this.outlinerFile, sel));
			}
		}
	}

	private onEditorPaste(evt: ClipboardEvent): void {
		if (!this.outlinerFile) return;
		if (this.plugin.settings.fileOutlinerPasteMultiline !== "split") return;

		const raw = evt.clipboardData?.getData("text/plain") ?? "";
		if (!raw.includes("\n") && !raw.includes("\r")) return;

		const sel = this.getActiveSelection();
		if (!sel) return;

		evt.preventDefault();
		evt.stopPropagation();

		const ctx = this.getEngineContext();
		this.applyEngineResult(pasteSplitLines(this.outlinerFile, sel, raw, { now: ctx.now, generateId: ctx.generateId }));
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
