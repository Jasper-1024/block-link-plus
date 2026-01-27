import type { TFile } from "obsidian";
import type BlockLinkPlus from "../../main";
import { processLineContent } from "../../utils";
import { getEnhancedListEnabledMarkdownFiles } from "./enable-scope";
import { indentCols, MARKDOWN_TAB_WIDTH } from "./indent-utils";

const LIST_ITEM_PREFIX_RE = /^(\s*)(?:([-*+])|(\d+\.))\s+(?:\[(?: |x|X)\]\s+)?/;

const SYSTEM_LINE_MERGED_RE =
	/^(\s*)\[date::\s*(\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2})\]\s*\^([a-zA-Z0-9_-]+)\s*$/;
const SYSTEM_LINE_DATE_ONLY_RE =
	/^(\s*)\[date::\s*(\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2})\]\s*$/;
const SYSTEM_LINE_ID_ONLY_RE = /^(\s*)\^([a-zA-Z0-9_-]+)\s*$/;

export type IndexedEnhancedListBlock = {
	file: TFile;
	filePath: string;
	fileMtime: number;
	// The raw id without the leading caret (system lines are `^id`).
	id: string;
	// Human-friendly text for search + display (based on the list item start line).
	text: string;
	// 1-based line number of the list item start line.
	lineNo: number;
	indentCols: number;
	// Ancestor texts, outermost -> innermost.
	parents: string[];
};

export function parseEnhancedListBlocksFromContent(
	content: string,
	file: TFile
): IndexedEnhancedListBlock[] {
	const lines = content.split("\n");
	const out: IndexedEnhancedListBlock[] = [];

	// Track ancestry by indentation (marker indent cols).
	const stack: Array<{ indentCols: number; text: string }> = [];

	for (let i = 0; i < lines.length; i++) {
		const line = lines[i] ?? "";
		const m = line.match(LIST_ITEM_PREFIX_RE);
		if (!m) continue;

		const indent = indentCols(m[1] ?? "", MARKDOWN_TAB_WIDTH);

		// Pop to the nearest ancestor (strictly smaller indent).
		while (stack.length > 0 && stack[stack.length - 1].indentCols >= indent) {
			stack.pop();
		}

		const parents = stack.map((p) => p.text);
		const text = processLineContent(line);

		// Find the system line inside the parent item's own content (before children).
		let id: string | null = null;
		for (let j = i + 1; j < lines.length; j++) {
			const next = lines[j] ?? "";
			if (next.trim() === "") continue;

			const nextList = next.match(LIST_ITEM_PREFIX_RE);
			if (nextList) {
				// Child or sibling starts; the parent system line must appear before this.
				break;
			}

			const merged = next.match(SYSTEM_LINE_MERGED_RE);
			if (merged?.[3]) {
				id = merged[3];
				break;
			}

			const dateOnly = next.match(SYSTEM_LINE_DATE_ONLY_RE);
			if (dateOnly) {
				const next2 = lines[j + 1] ?? "";
				const idOnly = next2.match(SYSTEM_LINE_ID_ONLY_RE);
				if (idOnly?.[2]) {
					id = idOnly[2];
					break;
				}
				break;
			}
		}

		// Push current item for descendants (even if it lacks an id).
		stack.push({ indentCols: indent, text });

		if (!id) continue;

		out.push({
			file,
			filePath: file.path,
			fileMtime: file.stat.mtime,
			id,
			text,
			lineNo: i + 1,
			indentCols: indent,
			parents,
		});
	}

	return out;
}

type FileCacheEntry = { mtime: number; blocks: IndexedEnhancedListBlock[] };

export class EnhancedListBlockIndex {
	private plugin: BlockLinkPlus;
	private fileCache = new Map<string, FileCacheEntry>();

	constructor(plugin: BlockLinkPlus) {
		this.plugin = plugin;
	}

	async getBlocksForFile(file: TFile): Promise<IndexedEnhancedListBlock[]> {
		const cached = this.fileCache.get(file.path);
		if (cached && cached.mtime === file.stat.mtime) return cached.blocks;

		const vault: any = this.plugin.app.vault as any;
		const content =
			typeof vault.cachedRead === "function" ? await vault.cachedRead(file) : await this.plugin.app.vault.read(file);

		const blocks = parseEnhancedListBlocksFromContent(content, file);
		this.fileCache.set(file.path, { mtime: file.stat.mtime, blocks });
		return blocks;
	}

	async getBlocksFromRecentFiles(opts: { maxFiles: number }): Promise<IndexedEnhancedListBlock[]> {
		const files = getEnhancedListEnabledMarkdownFiles(this.plugin)
			.sort((a, b) => b.stat.mtime - a.stat.mtime)
			.slice(0, Math.max(1, Math.floor(opts.maxFiles)));

		const out: IndexedEnhancedListBlock[] = [];
		for (const f of files) {
			try {
				out.push(...(await this.getBlocksForFile(f)));
			} catch {
				// ignore file read errors
			}
		}
		return out;
	}

	clear(): void {
		this.fileCache.clear();
	}
}

const indexByPlugin = new WeakMap<BlockLinkPlus, EnhancedListBlockIndex>();

export function getEnhancedListBlockIndex(plugin: BlockLinkPlus): EnhancedListBlockIndex {
	let idx = indexByPlugin.get(plugin);
	if (!idx) {
		idx = new EnhancedListBlockIndex(plugin);
		indexByPlugin.set(plugin, idx);
	}
	return idx;
}
