import { Modal, TFile } from "obsidian";
import type BlockLinkPlus from "../../main";
import { processLineContent } from "../../utils";
import { indentCols, MARKDOWN_TAB_WIDTH } from "./indent-utils";

const LIST_ITEM_PREFIX_RE = /^(\s*)(?:([-*+])|(\d+\.))\s+(?:\[(?: |x|X)\]\s+)?/;
const FENCE_LINE_REGEX = /^(\s*)(```+|~~~+).*/;

const SYSTEM_LINE_MERGED_RE =
	/^(\s*)\[date::\s*(\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2})\]\s*\^([a-zA-Z0-9_-]+)\s*$/;
const SYSTEM_LINE_DATE_ONLY_RE =
	/^(\s*)\[date::\s*(\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2})\]\s*$/;
const SYSTEM_LINE_ID_ONLY_RE = /^(\s*)\^([a-zA-Z0-9_-]+)\s*$/;

const BLOCK_REF_LINK_RE = /!?\[\[([^|\]#]+)#\^([a-zA-Z0-9_-]+)(?:\|[^\]]*)?\]\]/g;

type ParsedBlock = {
	id: string;
	text: string;
	// 1-based start line number of the list item.
	lineNo: number;
	indentCols: number;
	parentId: string | null;
};

export type BlockPeekContext = {
	self: ParsedBlock;
	// Outermost -> parent.
	ancestors: ParsedBlock[];
	prevSiblings: ParsedBlock[];
	nextSiblings: ParsedBlock[];
};

function escapeRegex(s: string): string {
	return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function buildFenceStateMap(lines: string[]): boolean[] {
	// 1-based line numbers for easier parity with CM/Obsidian APIs.
	const inFenceByLineNo: boolean[] = new Array(lines.length + 1).fill(false);

	let inFence = false;
	let fenceChar = "";
	let fenceLen = 0;
	let openedAtLineNo = 0;

	for (let i = 0; i < lines.length; i++) {
		const lineNo = i + 1;
		const text = lines[i] ?? "";

		if (!inFence) {
			const m = text.match(FENCE_LINE_REGEX);
			if (m) {
				inFence = true;
				fenceChar = (m[2] ?? "")[0] ?? "";
				fenceLen = (m[2] ?? "").length;
				openedAtLineNo = lineNo;
			}
		}

		inFenceByLineNo[lineNo] = inFence;

		if (inFence) {
			const closeRe = new RegExp(`^\\s*${escapeRegex(fenceChar)}{${fenceLen},}\\s*$`);
			if (fenceChar && fenceLen >= 3 && lineNo !== openedAtLineNo && closeRe.test(text)) {
				inFence = false;
				fenceChar = "";
				fenceLen = 0;
				openedAtLineNo = 0;
			}
		}
	}

	return inFenceByLineNo;
}

function parseBlocksWithParents(content: string): { blocks: ParsedBlock[]; byId: Map<string, ParsedBlock> } {
	const lines = content.split("\n");
	const fenceMap = buildFenceStateMap(lines);

	const blocks: ParsedBlock[] = [];
	const byId = new Map<string, ParsedBlock>();

	// Stack tracks indentation and the nearest ancestor with an id.
	const stack: Array<{ indentCols: number; id: string | null }> = [];

	for (let i = 0; i < lines.length; i++) {
		const lineNo = i + 1;
		if (fenceMap[lineNo]) continue;

		const line = lines[i] ?? "";
		const m = line.match(LIST_ITEM_PREFIX_RE);
		if (!m) continue;

		const indent = indentCols(m[1] ?? "", MARKDOWN_TAB_WIDTH);
		while (stack.length > 0 && stack[stack.length - 1].indentCols >= indent) {
			stack.pop();
		}

		const parentId = (() => {
			for (let k = stack.length - 1; k >= 0; k--) {
				const id = stack[k]?.id;
				if (id) return id;
			}
			return null;
		})();

		const text = processLineContent(line);

		let id: string | null = null;
		for (let j = i + 1; j < lines.length; j++) {
			const jLineNo = j + 1;
			if (fenceMap[jLineNo]) continue;

			const next = lines[j] ?? "";
			if (next.trim() === "") continue;

			// Once we hit a child/sibling list item (outside fences), the parent system line
			// must have appeared already.
			if (LIST_ITEM_PREFIX_RE.test(next)) break;

			const merged = next.match(SYSTEM_LINE_MERGED_RE);
			if (merged?.[3]) {
				id = merged[3];
				break;
			}

			const dateOnly = next.match(SYSTEM_LINE_DATE_ONLY_RE);
			if (dateOnly) {
				const next2 = lines[j + 1] ?? "";
				const idOnly = next2.match(SYSTEM_LINE_ID_ONLY_RE);
				if (idOnly?.[2]) id = idOnly[2];
				break;
			}
		}

		// Keep indentation structure even when id is missing.
		stack.push({ indentCols: indent, id });

		if (!id) continue;

		const block: ParsedBlock = { id, text, lineNo: i + 1, indentCols: indent, parentId };
		blocks.push(block);
		byId.set(id, block);
	}

	return { blocks, byId };
}

export function getBlockPeekContextFromContent(
	content: string,
	targetId: string,
	opts: { siblings: number }
): BlockPeekContext | null {
	const { blocks, byId } = parseBlocksWithParents(content);
	const self = byId.get(targetId);
	if (!self) return null;

	// Ancestors (outermost -> parent).
	const ancestors: ParsedBlock[] = [];
	let cur: ParsedBlock | undefined = self;
	while (cur?.parentId) {
		const parent = byId.get(cur.parentId);
		if (!parent) break;
		ancestors.unshift(parent);
		cur = parent;
	}

	const siblings = blocks.filter((b) => b.parentId === self.parentId);
	const idx = siblings.findIndex((b) => b.id === self.id);
	const n = Math.max(0, Math.floor(opts.siblings));
	const prevSiblings = idx > 0 ? siblings.slice(Math.max(0, idx - n), idx) : [];
	const nextSiblings = idx >= 0 ? siblings.slice(idx + 1, idx + 1 + n) : [];

	return { self, ancestors, prevSiblings, nextSiblings };
}

export function findBlockTargetFromLine(
	plugin: BlockLinkPlus,
	args: { sourceFile: TFile; lineText: string }
): { file: TFile; id: string } | null {
	BLOCK_REF_LINK_RE.lastIndex = 0;
	const m = BLOCK_REF_LINK_RE.exec(args.lineText);
	if (!m?.[1] || !m?.[2]) return null;

	const linkpath = m[1];
	const id = m[2];

	try {
		const dest = (plugin.app as any).metadataCache?.getFirstLinkpathDest?.(linkpath, args.sourceFile.path);
		if (dest) return { file: dest, id };
	} catch {
		// ignore
	}

	return null;
}

export function findActiveListItemBlockIdInContent(content: string, cursorLineNo0: number): string | null {
	const lines = content.split("\n");
	const fenceMap = buildFenceStateMap(lines);

	let startIdx = cursorLineNo0;
	for (let i = cursorLineNo0; i >= 0; i--) {
		const lineNo = i + 1;
		const t = lines[i] ?? "";
		const inFence = fenceMap[lineNo] ?? false;

		// Enhanced List Blocks forbids blank lines inside a list item unless inside a fenced code block.
		if (!inFence && t.trim() === "") break;

		if (!inFence && LIST_ITEM_PREFIX_RE.test(t)) {
			startIdx = i;
			break;
		}
	}

	const startLineNo = startIdx + 1;
	if (fenceMap[startLineNo]) return null;
	const startLine = lines[startIdx] ?? "";
	if (!LIST_ITEM_PREFIX_RE.test(startLine)) return null;

	for (let j = startIdx + 1; j < lines.length; j++) {
		const lineNo = j + 1;
		const inFence = fenceMap[lineNo] ?? false;
		const next = lines[j] ?? "";

		if (!inFence && next.trim() === "") break;
		if (inFence) continue;

		if (LIST_ITEM_PREFIX_RE.test(next)) break;

		const merged = next.match(SYSTEM_LINE_MERGED_RE);
		if (merged?.[3]) return merged[3];

		const dateOnly = next.match(SYSTEM_LINE_DATE_ONLY_RE);
		if (dateOnly) {
			const next2 = lines[j + 1] ?? "";
			const idOnly = next2.match(SYSTEM_LINE_ID_ONLY_RE);
			if (idOnly?.[2]) return idOnly[2];
			return null;
		}
	}

	return null;
}

class BlockPeekModal extends Modal {
	private plugin: BlockLinkPlus;
	private file: TFile;
	private id: string;

	constructor(plugin: BlockLinkPlus, file: TFile, id: string) {
		super(plugin.app);
		this.plugin = plugin;
		this.file = file;
		this.id = id;
	}

	onOpen() {
		this.titleEl.setText("Block Peek");
		this.contentEl.empty();

		const header = this.contentEl.createDiv({ cls: "blp-block-peek-header" });
		const headerLink = header.createDiv({ cls: "blp-block-peek-path", text: `${this.file.path}#^${this.id}` });
		headerLink.addEventListener("click", () => {
			void this.app.workspace.getLeaf(false).openFile(this.file);
			this.close();
		});

		const body = this.contentEl.createDiv({ cls: "blp-block-peek-body" });
		body.createEl("p", { text: "Loading..." });

		void this.render(body);
	}

	private async render(container: HTMLElement) {
		container.empty();

		const vault: any = this.plugin.app.vault as any;
		const content =
			typeof vault.cachedRead === "function" ? await vault.cachedRead(this.file) : await this.plugin.app.vault.read(this.file);

		const ctx = getBlockPeekContextFromContent(content, this.id, { siblings: 2 });
		if (!ctx) {
			container.createEl("p", { text: "Block not found in file." });
			return;
		}

		const ctxEl = container.createDiv({ cls: "blp-block-peek-section" });
		ctxEl.createEl("h4", { text: "Context" });

		const chain = ctx.ancestors
			.map((b) => b.text)
			.concat([ctx.self.text])
			.filter(Boolean)
			.join(" > ");
		ctxEl.createEl("div", { text: chain || "(empty)" });

		const sibEl = ctxEl.createEl("div", { cls: "blp-block-peek-siblings" });
		if (ctx.prevSiblings.length > 0) {
			sibEl.createEl("div", { cls: "blp-block-peek-siblings-title", text: "Prev:" });
			for (const b of ctx.prevSiblings) sibEl.createEl("div", { text: `- ${b.text}` });
		}
		if (ctx.nextSiblings.length > 0) {
			sibEl.createEl("div", { cls: "blp-block-peek-siblings-title", text: "Next:" });
			for (const b of ctx.nextSiblings) sibEl.createEl("div", { text: `- ${b.text}` });
		}
	}
}

export function openEnhancedListBlockPeek(plugin: BlockLinkPlus, args: { file: TFile; blockId: string }): void {
	const id = args.blockId.startsWith("^") ? args.blockId.slice(1) : args.blockId;
	new BlockPeekModal(plugin, args.file, id).open();
}

export function openEnhancedListBlockPeekAtCursor(
	plugin: BlockLinkPlus,
	args: { file: TFile; cursorLine0: number; content: string }
): void {
	const id = findActiveListItemBlockIdInContent(args.content, args.cursorLine0);
	if (!id) return;
	new BlockPeekModal(plugin, args.file, id).open();
}
