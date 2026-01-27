import { Notice, SuggestModal, type Instruction, type TFile } from "obsidian";
import type BlockLinkPlus from "../../main";
import { getEnhancedListBlockIndex, type IndexedEnhancedListBlock } from "./block-index";

type InsertTarget = {
	view: any; // CM6 EditorView (runtime type comes from Obsidian)
	from: number;
	to: number;
};

function buildBlockReferenceLink(
	plugin: BlockLinkPlus,
	file: TFile,
	blockId: string,
	embed: boolean
): string {
	const caretId = blockId.startsWith("^") ? blockId : `^${blockId}`;

	const app: any = plugin.app as any;
	const fm: any = app.fileManager;
	const anchor = `#${caretId}`;

	try {
		if (fm && typeof fm.generateMarkdownLink === "function") {
			const link = fm.generateMarkdownLink(file, "", anchor);
			return embed ? `!${link}` : link;
		}
	} catch {
		// ignore
	}

	// Safe fallback (works even when fileManager is not available in tests).
	const link = `[[${file.path}${anchor}]]`;
	return embed ? `!${link}` : link;
}

function scoreMatch(text: string, query: string): number | null {
	const q = query.trim().toLowerCase();
	if (!q) return 0;
	const t = text.toLowerCase();
	const idx = t.indexOf(q);
	if (idx === -1) return null;
	return idx;
}

export class EnhancedListBlockReferencePickerModal extends SuggestModal<IndexedEnhancedListBlock> {
	private plugin: BlockLinkPlus;
	private embed: boolean;
	private target: InsertTarget;
	private onCloseCallback: (() => void) | null = null;

	private loadPromise: Promise<void> | null = null;
	private allBlocks: IndexedEnhancedListBlock[] = [];

	constructor(
		plugin: BlockLinkPlus,
		opts: { embed: boolean; target: InsertTarget; instructions?: Instruction[]; onClose?: () => void }
	) {
		super(plugin.app);
		this.plugin = plugin;
		this.embed = opts.embed;
		this.target = opts.target;
		this.onCloseCallback = opts.onClose ?? null;

		this.limit = 100;
		this.emptyStateText = "No blocks found";
		this.setPlaceholder("Search blocks (text / file)...");

		if (opts.instructions) this.setInstructions(opts.instructions);
	}

	onOpen() {
		super.onOpen();
		// Preload in background so the first keystroke isn't blocked by IO.
		void this.ensureLoaded();
	}

	onClose() {
		super.onClose();
		try {
			this.onCloseCallback?.();
		} catch {
			// ignore
		}
	}

	private async ensureLoaded(): Promise<void> {
		if (this.loadPromise) return this.loadPromise;
		this.loadPromise = (async () => {
			const idx = getEnhancedListBlockIndex(this.plugin);
			// Keep this bounded: recent files cover the common Logseq/Roam workflow
			// without requiring a persistent global index.
			this.allBlocks = await idx.getBlocksFromRecentFiles({ maxFiles: 200 });
		})();
		return this.loadPromise;
	}

	async getSuggestions(query: string): Promise<IndexedEnhancedListBlock[]> {
		await this.ensureLoaded();

		const q = query.trim();
		if (!q) {
			return this.allBlocks
				.slice()
				.sort((a, b) => b.fileMtime - a.fileMtime || a.filePath.localeCompare(b.filePath) || a.lineNo - b.lineNo)
				.slice(0, this.limit);
		}

		const scored: Array<{ item: IndexedEnhancedListBlock; score: number }> = [];
		for (const item of this.allBlocks) {
			const hay = `${item.text} ${item.filePath} ${item.parents.join(" ")}`;
			const s = scoreMatch(hay, q);
			if (s == null) continue;
			scored.push({ item, score: s });
		}

		return scored
			.sort((a, b) => a.score - b.score || b.item.fileMtime - a.item.fileMtime || a.item.filePath.localeCompare(b.item.filePath))
			.slice(0, this.limit)
			.map((x) => x.item);
	}

	renderSuggestion(item: IndexedEnhancedListBlock, el: HTMLElement) {
		el.addClass("blp-block-ref-suggestion");

		const title = el.createDiv({ cls: "blp-block-ref-title" });
		title.setText(item.text || "(empty)");

		const meta = el.createDiv({ cls: "blp-block-ref-meta" });
		const parts: string[] = [];
		if (item.parents.length > 0) parts.push(item.parents.slice(-2).join(" > "));
		parts.push(item.filePath);
		meta.setText(parts.filter(Boolean).join(" — "));
	}

	onChooseSuggestion(item: IndexedEnhancedListBlock) {
		const link = buildBlockReferenceLink(this.plugin, item.file, item.id, this.embed);

		try {
			const view: any = this.target.view as any;
			view.dispatch({ changes: { from: this.target.from, to: this.target.to, insert: link } });
		} catch (e) {
			new Notice(`Failed to insert block reference: ${String((e as any)?.message ?? e)}`);
		}
	}
}

export function openEnhancedListBlockReferencePicker(
	plugin: BlockLinkPlus,
	opts: { view: any; from: number; to: number; embed: boolean; onClose?: () => void }
): void {
	const instructions: Instruction[] = [
		{ command: "Enter", purpose: "Insert" },
		{ command: "Esc", purpose: "Cancel" },
	];

	const modal = new EnhancedListBlockReferencePickerModal(plugin, {
		embed: opts.embed,
		target: { view: opts.view, from: opts.from, to: opts.to },
		instructions,
		onClose: opts.onClose,
	});
	modal.open();
}
