import type { OutlinerBlock, ParsedOutlinerFile } from "./protocol";

export type OutlinerSelection = {
	id: string;
	start: number;
	end: number;
};

export type OutlinerEngineContext = {
	/** Timestamp for new blocks (format: `yyyy-MM-dd'T'HH:mm:ss`). */
	now: string;
	/** Deterministic id generator (tests) or view-provided generator. */
	generateId: () => string;
	/** Split behavior for children when pressing Enter. */
	childrenOnSplit: "keep" | "move";
	/** Backspace at block start when block has children. */
	backspaceWithChildren: "merge" | "outdent";
};

export type OutlinerEngineResult = {
	file: ParsedOutlinerFile;
	selection: OutlinerSelection;
	dirtyIds: Set<string>;
	didChange: boolean;
};

function cloneBlock(b: OutlinerBlock): OutlinerBlock {
	return {
		id: b.id,
		depth: b.depth,
		text: b.text,
		children: b.children.map(cloneBlock),
		system: {
			date: b.system.date,
			updated: b.system.updated,
			extra: { ...(b.system.extra ?? {}) },
		},
		_systemHasBlpMarker: b._systemHasBlpMarker,
	};
}

function cloneFile(file: ParsedOutlinerFile): ParsedOutlinerFile {
	return {
		frontmatter: file.frontmatter,
		blocks: (file.blocks ?? []).map(cloneBlock),
	};
}

function rebuildDepths(list: OutlinerBlock[], depth: number): void {
	for (const b of list) {
		b.depth = depth;
		rebuildDepths(b.children, depth + 1);
	}
}

type BlockLoc = {
	block: OutlinerBlock;
	parent: OutlinerBlock | null;
	siblings: OutlinerBlock[];
	index: number;
};

function findBlockLocation(list: OutlinerBlock[], id: string, parent: OutlinerBlock | null): BlockLoc | null {
	for (let i = 0; i < list.length; i++) {
		const b = list[i];
		if (b.id === id) return { block: b, parent, siblings: list, index: i };
		const child = findBlockLocation(b.children, id, b);
		if (child) return child;
	}
	return null;
}

function collectIds(list: OutlinerBlock[], out: Set<string>): void {
	for (const b of list) {
		if (b.id) out.add(b.id);
		collectIds(b.children, out);
	}
}

function ensureUniqueGeneratedId(ctx: Pick<OutlinerEngineContext, "generateId">, existing: Set<string>): string {
	for (let i = 0; i < 100; i++) {
		const id = ctx.generateId();
		if (!existing.has(id)) return id;
	}
	// Extremely unlikely fallback: keep trying with a random suffix.
	while (true) {
		const id = Math.random().toString(36).slice(2, 10);
		if (!existing.has(id)) return id;
	}
}

function normalizeSelection(sel: OutlinerSelection, textLen: number): OutlinerSelection {
	const start = Math.max(0, Math.min(textLen, sel.start));
	const end = Math.max(0, Math.min(textLen, sel.end));
	return { ...sel, start, end };
}

export function insertAfter(
	file: ParsedOutlinerFile,
	targetId: string,
	ctx: Pick<OutlinerEngineContext, "now" | "generateId">
): OutlinerEngineResult {
	const next = cloneFile(file);
	const dirtyIds = new Set<string>();

	const loc = findBlockLocation(next.blocks, targetId, null);
	if (!loc) {
		return { file, selection: { id: targetId, start: 0, end: 0 }, dirtyIds, didChange: false };
	}

	const existingIds = new Set<string>();
	collectIds(next.blocks, existingIds);

	const newId = ensureUniqueGeneratedId(ctx, existingIds);
	existingIds.add(newId);

	const newBlock: OutlinerBlock = {
		id: newId,
		depth: 0, // rebuilt below
		text: "",
		children: [],
		system: { date: ctx.now, updated: ctx.now, extra: {} },
		_systemHasBlpMarker: true,
	};

	loc.siblings.splice(loc.index + 1, 0, newBlock);
	dirtyIds.add(newId);

	rebuildDepths(next.blocks, 0);

	return {
		file: next,
		selection: { id: newId, start: 0, end: 0 },
		dirtyIds,
		didChange: true,
	};
}

export function splitAtSelection(
	file: ParsedOutlinerFile,
	sel: OutlinerSelection,
	ctx: OutlinerEngineContext
): OutlinerEngineResult {
	const next = cloneFile(file);
	const dirtyIds = new Set<string>();

	const loc = findBlockLocation(next.blocks, sel.id, null);
	if (!loc) {
		return { file, selection: sel, dirtyIds, didChange: false };
	}

	const currentText = String(loc.block.text ?? "");
	const normSel = normalizeSelection(sel, currentText.length);
	const left = Math.min(normSel.start, normSel.end);
	const right = Math.max(normSel.start, normSel.end);

	const before = currentText.slice(0, left);
	const after = currentText.slice(right);

	loc.block.text = before;
	dirtyIds.add(loc.block.id);

	const moveChildren = ctx.childrenOnSplit === "move";
	const movedChildren = moveChildren ? loc.block.children : [];
	if (moveChildren) loc.block.children = [];

	const existingIds = new Set<string>();
	collectIds(next.blocks, existingIds);
	const newId = ensureUniqueGeneratedId(ctx, existingIds);

	const newBlock: OutlinerBlock = {
		id: newId,
		depth: 0, // rebuilt below
		text: after,
		children: movedChildren,
		system: { date: ctx.now, updated: ctx.now, extra: {} },
		_systemHasBlpMarker: true,
	};

	loc.siblings.splice(loc.index + 1, 0, newBlock);
	dirtyIds.add(newId);

	rebuildDepths(next.blocks, 0);

	return {
		file: next,
		selection: { id: newId, start: 0, end: 0 },
		dirtyIds,
		didChange: true,
	};
}

export function indentBlock(
	file: ParsedOutlinerFile,
	sel: OutlinerSelection
): OutlinerEngineResult {
	const next = cloneFile(file);
	const dirtyIds = new Set<string>();

	const loc = findBlockLocation(next.blocks, sel.id, null);
	if (!loc) return { file, selection: sel, dirtyIds, didChange: false };
	if (loc.index <= 0) return { file, selection: sel, dirtyIds, didChange: false };

	const prev = loc.siblings[loc.index - 1];
	if (!prev) return { file, selection: sel, dirtyIds, didChange: false };

	loc.siblings.splice(loc.index, 1);
	prev.children.push(loc.block);

	dirtyIds.add(loc.block.id);
	dirtyIds.add(prev.id);
	rebuildDepths(next.blocks, 0);

	return { file: next, selection: sel, dirtyIds, didChange: true };
}

export function outdentBlock(
	file: ParsedOutlinerFile,
	sel: OutlinerSelection
): OutlinerEngineResult {
	const next = cloneFile(file);
	const dirtyIds = new Set<string>();

	const loc = findBlockLocation(next.blocks, sel.id, null);
	if (!loc || !loc.parent) return { file, selection: sel, dirtyIds, didChange: false };

	const parentLoc = findBlockLocation(next.blocks, loc.parent.id, null);
	if (!parentLoc) return { file, selection: sel, dirtyIds, didChange: false };

	// Remove from parent's children, insert after parent in parent's siblings.
	loc.siblings.splice(loc.index, 1);
	parentLoc.siblings.splice(parentLoc.index + 1, 0, loc.block);

	dirtyIds.add(loc.block.id);
	dirtyIds.add(loc.parent.id);
	rebuildDepths(next.blocks, 0);

	return { file: next, selection: sel, dirtyIds, didChange: true };
}

export function mergeWithPrevious(
	file: ParsedOutlinerFile,
	sel: OutlinerSelection
): OutlinerEngineResult {
	const next = cloneFile(file);
	const dirtyIds = new Set<string>();

	const loc = findBlockLocation(next.blocks, sel.id, null);
	if (!loc) return { file, selection: sel, dirtyIds, didChange: false };
	if (loc.index <= 0) return { file, selection: sel, dirtyIds, didChange: false };

	const prev = loc.siblings[loc.index - 1];
	if (!prev) return { file, selection: sel, dirtyIds, didChange: false };

	const prevLen = String(prev.text ?? "").length;
	prev.text = String(prev.text ?? "") + String(loc.block.text ?? "");
	prev.children.push(...loc.block.children);

	loc.siblings.splice(loc.index, 1);

	dirtyIds.add(prev.id);
	rebuildDepths(next.blocks, 0);

	return {
		file: next,
		selection: { id: prev.id, start: prevLen, end: prevLen },
		dirtyIds,
		didChange: true,
	};
}

export function mergeWithNext(
	file: ParsedOutlinerFile,
	sel: OutlinerSelection
): OutlinerEngineResult {
	const next = cloneFile(file);
	const dirtyIds = new Set<string>();

	const loc = findBlockLocation(next.blocks, sel.id, null);
	if (!loc) return { file, selection: sel, dirtyIds, didChange: false };
	if (loc.index >= loc.siblings.length - 1) return { file, selection: sel, dirtyIds, didChange: false };

	const nextSibling = loc.siblings[loc.index + 1];
	if (!nextSibling) return { file, selection: sel, dirtyIds, didChange: false };

	const curLen = String(loc.block.text ?? "").length;
	loc.block.text = String(loc.block.text ?? "") + String(nextSibling.text ?? "");
	loc.block.children.push(...nextSibling.children);

	loc.siblings.splice(loc.index + 1, 1);

	dirtyIds.add(loc.block.id);
	rebuildDepths(next.blocks, 0);

	return {
		file: next,
		selection: { id: loc.block.id, start: curLen, end: curLen },
		dirtyIds,
		didChange: true,
	};
}

export function deleteBlock(
	file: ParsedOutlinerFile,
	targetId: string,
	ctx: Pick<OutlinerEngineContext, "now" | "generateId">
): OutlinerEngineResult {
	const next = cloneFile(file);
	const dirtyIds = new Set<string>();

	const loc = findBlockLocation(next.blocks, targetId, null);
	if (!loc) {
		return { file, selection: { id: targetId, start: 0, end: 0 }, dirtyIds, didChange: false };
	}

	const focusPref: Array<
		| { kind: "next"; block: OutlinerBlock }
		| { kind: "prev"; block: OutlinerBlock }
		| { kind: "parent"; block: OutlinerBlock }
	> = [];

	const nextSibling = loc.siblings[loc.index + 1];
	if (nextSibling) focusPref.push({ kind: "next", block: nextSibling });

	const prevSibling = loc.siblings[loc.index - 1];
	if (prevSibling) focusPref.push({ kind: "prev", block: prevSibling });

	if (loc.parent) focusPref.push({ kind: "parent", block: loc.parent });

	loc.siblings.splice(loc.index, 1);

	// If we deleted the last remaining block, keep the file non-empty so the user can continue typing.
	if ((next.blocks?.length ?? 0) === 0) {
		const existingIds = new Set<string>();
		existingIds.add(targetId);
		const newId = ensureUniqueGeneratedId(ctx, existingIds);
		const newBlock: OutlinerBlock = {
			id: newId,
			depth: 0,
			text: "",
			children: [],
			system: { date: ctx.now, updated: ctx.now, extra: {} },
			_systemHasBlpMarker: true,
		};
		next.blocks = [newBlock];
		dirtyIds.add(newId);
		rebuildDepths(next.blocks, 0);
		return { file: next, selection: { id: newId, start: 0, end: 0 }, dirtyIds, didChange: true };
	}

	rebuildDepths(next.blocks, 0);

	const focus = focusPref[0];
	if (!focus) {
		// Should be unreachable because we ensured a non-empty file above, but keep a safe fallback.
		const first = next.blocks[0];
		if (!first) return { file: next, selection: { id: targetId, start: 0, end: 0 }, dirtyIds, didChange: true };
		return { file: next, selection: { id: first.id, start: 0, end: 0 }, dirtyIds, didChange: true };
	}

	const focusText = String(focus.block.text ?? "");
	const cursor = focus.kind === "next" ? 0 : focusText.length;

	return { file: next, selection: { id: focus.block.id, start: cursor, end: cursor }, dirtyIds, didChange: true };
}

export function backspaceAtStart(
	file: ParsedOutlinerFile,
	sel: OutlinerSelection,
	ctx: Pick<OutlinerEngineContext, "backspaceWithChildren">
): OutlinerEngineResult {
	// Caller should ensure start=end=0; we re-check to keep engine deterministic.
	if (sel.start !== 0 || sel.end !== 0) return { file, selection: sel, dirtyIds: new Set(), didChange: false };

	const loc = findBlockLocation(file.blocks, sel.id, null);
	if (!loc) return { file, selection: sel, dirtyIds: new Set(), didChange: false };

	if (loc.block.children.length > 0 && ctx.backspaceWithChildren === "outdent") {
		const outdented = outdentBlock(file, sel);
		if (outdented.didChange) return outdented;
	}

	const merged = mergeWithPrevious(file, sel);
	if (merged.didChange) return merged;

	// If there is no previous sibling, fall back to outdent when possible.
	return outdentBlock(file, sel);
}

export function pasteSplitLines(
	file: ParsedOutlinerFile,
	sel: OutlinerSelection,
	rawText: string,
	ctx: Pick<OutlinerEngineContext, "now" | "generateId">
): OutlinerEngineResult {
	const text = String(rawText ?? "").replace(/\r\n/g, "\n").replace(/\r/g, "\n");
	const lines = text.split("\n");
	if (lines.length <= 1) return { file, selection: sel, dirtyIds: new Set(), didChange: false };

	const next = cloneFile(file);
	const dirtyIds = new Set<string>();

	const loc = findBlockLocation(next.blocks, sel.id, null);
	if (!loc) return { file, selection: sel, dirtyIds, didChange: false };

	const currentText = String(loc.block.text ?? "");
	const normSel = normalizeSelection(sel, currentText.length);
	const left = Math.min(normSel.start, normSel.end);
	const right = Math.max(normSel.start, normSel.end);

	const before = currentText.slice(0, left);
	const after = currentText.slice(right);

	// First line stays in the current block.
	loc.block.text = before + (lines[0] ?? "");
	dirtyIds.add(loc.block.id);

	const existingIds = new Set<string>();
	collectIds(next.blocks, existingIds);

	let insertAt = loc.index + 1;
	let lastId: string | null = null;
	for (let i = 1; i < lines.length; i++) {
		const isLast = i === lines.length - 1;
		const newId = ensureUniqueGeneratedId(ctx, existingIds);
		existingIds.add(newId);

		const newBlock: OutlinerBlock = {
			id: newId,
			depth: 0, // rebuilt below
			text: (lines[i] ?? "") + (isLast ? after : ""),
			children: [],
			system: { date: ctx.now, updated: ctx.now, extra: {} },
			_systemHasBlpMarker: true,
		};

		loc.siblings.splice(insertAt, 0, newBlock);
		insertAt++;

		dirtyIds.add(newId);
		lastId = newId;
	}

	rebuildDepths(next.blocks, 0);

	const focusId = lastId ?? loc.block.id;
	const focusPos = (lines[lines.length - 1] ?? "").length;
	return {
		file: next,
		selection: { id: focusId, start: focusPos, end: focusPos },
		dirtyIds,
		didChange: true,
	};
}
