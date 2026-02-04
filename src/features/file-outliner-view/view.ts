import { MarkdownRenderer, TextFileView, WorkspaceLeaf } from "obsidian";
import { DateTime } from "luxon";

import type BlockLinkPlus from "../../main";
import { generateRandomId } from "../../utils";
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

function findBlockLocation(
	list: OutlinerBlock[],
	id: string,
	parent: OutlinerBlock | null
): { block: OutlinerBlock; parent: OutlinerBlock | null; siblings: OutlinerBlock[]; index: number } | null {
	for (let i = 0; i < list.length; i++) {
		const b = list[i];
		if (b.id === id) return { block: b, parent, siblings: list, index: i };
		const child = findBlockLocation(b.children, id, b);
		if (child) return child;
	}
	return null;
}

export class FileOutlinerView extends TextFileView {
	private readonly plugin: BlockLinkPlus;
	private outlinerFile: ParsedOutlinerFile | null = null;

	private blockById = new Map<string, OutlinerBlock>();
	private textareaById = new Map<string, HTMLTextAreaElement>();
	private displayById = new Map<string, HTMLElement>();

	private dirtyBlockIds = new Set<string>();
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
		this.textareaById.clear();
		this.displayById.clear();
		this.dirtyBlockIds.clear();
		this.editingId = null;
		this.pendingFocus = null;
		this.pendingScrollToId = null;
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
		this.render();

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

	private render(): void {
		const file = this.outlinerFile;
		this.contentEl.empty();
		this.textareaById.clear();
		this.displayById.clear();

		if (!file) return;

		const root = this.contentEl.createDiv({ cls: "blp-file-outliner-root" });
		for (const b of file.blocks) {
			this.renderBlock(root, b, 0);
		}

		if (this.pendingFocus) {
			const { id, cursorStart, cursorEnd } = this.pendingFocus;
			this.pendingFocus = null;
			this.enterEditMode(id, { cursorStart, cursorEnd, scroll: true });
		} else if (this.editingId) {
			// Best-effort: restore edit mode across re-renders.
			this.enterEditMode(this.editingId, { cursorStart: 0, cursorEnd: 0, scroll: false, reuseExisting: true });
		}

		if (this.pendingScrollToId) {
			this.scrollToBlockId(this.pendingScrollToId);
		}
	}

	private renderBlock(container: HTMLElement, block: OutlinerBlock, depth: number): void {
		const row = container.createDiv({ cls: "blp-file-outliner-block" });
		row.dataset.blpOutlinerId = block.id;
		row.style.paddingLeft = `${depth * 18}px`;

		// Display (rendered markdown).
		const display = row.createDiv({ cls: "blp-file-outliner-display" });
		this.displayById.set(block.id, display);

		const sourcePath = this.file?.path ?? "";
		void MarkdownRenderer.render(this.app, block.text, display, sourcePath, this);

		display.addEventListener("click", (evt) => {
			// Let normal navigation/controls work (links, checkboxes, etc).
			const target = evt.target as HTMLElement | null;
			if (target?.closest("a, button, input, textarea")) return;
			this.enterEditMode(block.id, { cursorStart: block.text.length, cursorEnd: block.text.length, scroll: true });
		});

		// Editor (textarea).
		const textarea = row.createEl("textarea", { cls: "blp-file-outliner-editor" });
		textarea.value = block.text;
		textarea.spellcheck = true;
		textarea.rows = 1;
		textarea.style.display = this.editingId === block.id ? "" : "none";
		this.textareaById.set(block.id, textarea);
		if (this.editingId === block.id) autoGrow(textarea);

		textarea.addEventListener("input", () => {
			block.text = textarea.value;
			autoGrow(textarea);
			this.dirtyBlockIds.add(block.id);
			this.requestSave();
		});

		textarea.addEventListener("blur", () => {
			if (this.editingId !== block.id) return;
			this.exitEditMode(block.id);
		});

		textarea.addEventListener("keydown", (evt) => this.handleKeyDown(evt, block.id));
		textarea.addEventListener("paste", (evt) => this.handlePaste(evt, block.id));

		// Children.
		if (block.children.length > 0) {
			for (const child of block.children) {
				this.renderBlock(container, child, depth + 1);
			}
		}
	}

	private handleKeyDown(evt: KeyboardEvent, id: string): void {
		if (!this.outlinerFile) return;

		const textarea = this.textareaById.get(id);
		if (!textarea) return;

		if (evt.key === "Enter" && !evt.shiftKey) {
			evt.preventDefault();
			evt.stopPropagation();
			this.splitBlockAtCursor(id, textarea.selectionStart ?? 0, textarea.selectionEnd ?? 0);
			return;
		}

		if (evt.key === "Tab") {
			evt.preventDefault();
			evt.stopPropagation();
			if (evt.shiftKey) this.outdentBlock(id);
			else this.indentBlock(id);
			return;
		}

		if (evt.key === "Backspace") {
			const start = textarea.selectionStart ?? 0;
			const end = textarea.selectionEnd ?? 0;
			if (start === 0 && end === 0) {
				evt.preventDefault();
				evt.stopPropagation();
				this.mergeWithPrevious(id);
			}
		}
	}

	private handlePaste(evt: ClipboardEvent, id: string): void {
		if (!this.outlinerFile) return;
		if (this.plugin.settings.fileOutlinerPasteMultiline !== "split") return;

		const raw = evt.clipboardData?.getData("text/plain") ?? "";
		if (!raw.includes("\n") && !raw.includes("\r")) return;

		evt.preventDefault();
		evt.stopPropagation();

		const textarea = this.textareaById.get(id);
		if (!textarea) return;

		const loc = findBlockLocation(this.outlinerFile.blocks, id, null);
		if (!loc) return;

		const text = raw.replace(/\r\n/g, "\n").replace(/\r/g, "\n");
		const lines = text.split("\n");
		if (lines.length <= 1) return;

		const currentText = textarea.value;
		const start = textarea.selectionStart ?? 0;
		const end = textarea.selectionEnd ?? 0;
		const left = Math.max(0, Math.min(currentText.length, Math.min(start, end)));
		const right = Math.max(0, Math.min(currentText.length, Math.max(start, end)));

		const before = currentText.slice(0, left);
		const after = currentText.slice(right);

		const now = formatSystemDate(DateTime.now());

		// First line stays in the current block.
		loc.block.text = before + (lines[0] ?? "");
		loc.block.system.updated = now;
		this.dirtyBlockIds.add(loc.block.id);

		// Remaining lines become new sibling blocks. The final line inherits the "after" text.
		let insertAt = loc.index + 1;
		let lastId: string | null = null;
		for (let i = 1; i < lines.length; i++) {
			const isLast = i === lines.length - 1;
			const newId = this.generateUniqueId();
			const lineText = (lines[i] ?? "") + (isLast ? after : "");

			const next: OutlinerBlock = {
				id: newId,
				depth: loc.block.depth,
				task: null,
				text: lineText,
				children: [],
				system: { date: now, updated: now, extra: {} },
			};

			loc.siblings.splice(insertAt, 0, next);
			insertAt++;

			this.blockById.set(newId, next);
			this.dirtyBlockIds.add(newId);
			lastId = newId;
		}

		const focusId = lastId ?? loc.block.id;
		const focusPos = (lines[lines.length - 1] ?? "").length;
		this.pendingFocus = { id: focusId, cursorStart: focusPos, cursorEnd: focusPos };
		this.render();
		this.requestSave();
	}

	private enterEditMode(
		id: string,
		opts: { cursorStart: number; cursorEnd: number; scroll: boolean; reuseExisting?: boolean }
	): void {
		this.editingId = id;

		const textarea = this.textareaById.get(id);
		const display = this.displayById.get(id);
		if (!textarea || !display) {
			if (!opts.reuseExisting) this.render();
			return;
		}

		display.style.display = "none";
		textarea.style.display = "";
		autoGrow(textarea);

		textarea.focus();
		try {
			textarea.setSelectionRange(opts.cursorStart, opts.cursorEnd);
		} catch {
			// Ignore selection errors (e.g. mobile quirks).
		}

		if (opts.scroll) {
			textarea.scrollIntoView({ block: "nearest" });
		}
	}

	private exitEditMode(id: string): void {
		const textarea = this.textareaById.get(id);
		const display = this.displayById.get(id);
		const b = this.blockById.get(id);
		if (!textarea || !display || !b) return;

		b.text = textarea.value;
		this.dirtyBlockIds.add(id);

		this.editingId = null;
		textarea.style.display = "none";
		display.style.display = "";

		display.empty();
		const sourcePath = this.file?.path ?? "";
		void MarkdownRenderer.render(this.app, b.text, display, sourcePath, this);

		this.requestSave();
	}

	private splitBlockAtCursor(id: string, cursorStart: number, cursorEnd: number): void {
		if (!this.outlinerFile) return;
		const loc = findBlockLocation(this.outlinerFile.blocks, id, null);
		if (!loc) return;

		const textarea = this.textareaById.get(id);
		const currentText = textarea?.value ?? loc.block.text;

		const start = Math.max(0, Math.min(currentText.length, cursorStart));
		const end = Math.max(0, Math.min(currentText.length, cursorEnd));
		const before = currentText.slice(0, Math.min(start, end));
		const after = currentText.slice(Math.max(start, end));

		const now = formatSystemDate(DateTime.now());

		loc.block.text = before;
		loc.block.system.updated = now;
		this.dirtyBlockIds.add(loc.block.id);

		const moveChildren = this.plugin.settings.fileOutlinerChildrenOnSplit === "move";
		const movedChildren = moveChildren ? loc.block.children : [];
		if (moveChildren) loc.block.children = [];

		const newId = this.generateUniqueId();
		const next: OutlinerBlock = {
			id: newId,
			depth: loc.block.depth,
			task: null,
			text: after,
			children: movedChildren,
			system: { date: now, updated: now, extra: {} },
		};

		loc.siblings.splice(loc.index + 1, 0, next);
		this.blockById.set(newId, next);

		this.pendingFocus = { id: newId, cursorStart: 0, cursorEnd: 0 };
		this.render();
		this.dirtyBlockIds.add(newId);
		this.requestSave();
	}

	private indentBlock(id: string): void {
		if (!this.outlinerFile) return;
		const loc = findBlockLocation(this.outlinerFile.blocks, id, null);
		if (!loc) return;
		if (loc.index <= 0) return;

		const prev = loc.siblings[loc.index - 1];
		if (!prev) return;

		// Remove from current siblings, append to previous sibling's children.
		loc.siblings.splice(loc.index, 1);
		prev.children.push(loc.block);

		const textarea = this.textareaById.get(id);
		this.pendingFocus = {
			id,
			cursorStart: textarea?.selectionStart ?? 0,
			cursorEnd: textarea?.selectionEnd ?? 0,
		};
		this.render();
		this.dirtyBlockIds.add(id);
		this.dirtyBlockIds.add(prev.id);
		this.requestSave();
	}

	private outdentBlock(id: string): void {
		if (!this.outlinerFile) return;
		const loc = findBlockLocation(this.outlinerFile.blocks, id, null);
		if (!loc || !loc.parent) return;

		const parentLoc = findBlockLocation(this.outlinerFile.blocks, loc.parent.id, null);
		if (!parentLoc) return;

		// Remove from parent's children, insert after parent in parent's siblings.
		loc.siblings.splice(loc.index, 1);
		parentLoc.siblings.splice(parentLoc.index + 1, 0, loc.block);

		const textarea = this.textareaById.get(id);
		this.pendingFocus = {
			id,
			cursorStart: textarea?.selectionStart ?? 0,
			cursorEnd: textarea?.selectionEnd ?? 0,
		};
		this.render();
		this.dirtyBlockIds.add(id);
		this.dirtyBlockIds.add(loc.parent.id);
		this.requestSave();
	}

	private mergeWithPrevious(id: string): void {
		if (!this.outlinerFile) return;
		const loc = findBlockLocation(this.outlinerFile.blocks, id, null);
		if (!loc) return;
		if (loc.index <= 0) return;

		const prev = loc.siblings[loc.index - 1];
		if (!prev) return;

		const prevTextLen = prev.text.length;
		prev.text = prev.text + loc.block.text;
		// Move children to previous block.
		prev.children.push(...loc.block.children);

		loc.siblings.splice(loc.index, 1);
		this.blockById.delete(id);

		this.pendingFocus = { id: prev.id, cursorStart: prevTextLen, cursorEnd: prevTextLen };
		this.render();

		this.dirtyBlockIds.add(prev.id);
		this.requestSave();
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
