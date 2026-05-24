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

export type OutlinerMoveWhere = "before" | "after" | "inside";

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

function cloneBlockShallow(b: OutlinerBlock): OutlinerBlock {
	return {
		id: b.id,
		depth: b.depth,
		text: b.text,
		children: [],
		system: {
			date: b.system.date,
			updated: b.system.updated,
			extra: { ...(b.system.extra ?? {}) },
		},
		_systemHasBlpMarker: b._systemHasBlpMarker,
	};
}

function linearizeBlocks(list: OutlinerBlock[], out: OutlinerBlock[] = []): OutlinerBlock[] {
	for (const b of list) {
		out.push(cloneBlockShallow(b));
		linearizeBlocks(b.children, out);
	}
	return out;
}

function rebuildTreeFromLinear(linear: OutlinerBlock[]): OutlinerBlock[] {
	const roots: OutlinerBlock[] = [];
	const stack: OutlinerBlock[] = [];

	for (const block of linear) {
		block.children = [];
		while (stack.length > block.depth) stack.pop();

		if (block.depth <= 0) {
			block.depth = 0;
			roots.push(block);
		} else {
			const parent = stack[block.depth - 1];
			if (!parent) throw new Error(`Invalid linear outliner depth sequence at block ${block.id}`);
			parent.children.push(block);
		}

		stack[block.depth] = block;
		stack.length = block.depth + 1;
	}

	return roots;
}

function findLinearIndexById(linear: OutlinerBlock[], id: string): number {
	return linear.findIndex((b) => b.id === id);
}

function findLinearParentId(linear: OutlinerBlock[], index: number): string | null {
	const depth = Math.max(0, Math.floor(linear[index]?.depth ?? 0));
	if (depth <= 0) return null;

	for (let i = index - 1; i >= 0; i--) {
		if ((linear[i]?.depth ?? -1) === depth - 1) return linear[i]?.id ?? null;
	}

	return null;
}

function findLinearDescendantEnd(linear: OutlinerBlock[], index: number): number {
	const depth = Math.max(0, Math.floor(linear[index]?.depth ?? 0));
	let end = index + 1;
	while (end < linear.length && (linear[end]?.depth ?? -1) > depth) end += 1;
	return end;
}

function isValidLinearDepthSequence(linear: OutlinerBlock[]): boolean {
	for (let i = 0; i < linear.length; i++) {
		const depth = Math.max(0, Math.floor(linear[i]?.depth ?? 0));
		if (i === 0) {
			if (depth !== 0) return false;
			continue;
		}

		const prevDepth = Math.max(0, Math.floor(linear[i - 1]?.depth ?? 0));
		if (depth > prevDepth + 1) return false;
	}

	return true;
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

export function insertAtRootEnd(
	file: ParsedOutlinerFile,
	ctx: Pick<OutlinerEngineContext, "now" | "generateId">
): OutlinerEngineResult {
	const next = cloneFile(file);
	const dirtyIds = new Set<string>();

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

	next.blocks.push(newBlock);
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

export function indentBlockPreservingOrder(
	file: ParsedOutlinerFile,
	sel: OutlinerSelection
): OutlinerEngineResult {
	const linear = linearizeBlocks(file.blocks ?? []);
	const dirtyIds = new Set<string>();

	const index = findLinearIndexById(linear, sel.id);
	if (index <= 0) return { file, selection: sel, dirtyIds, didChange: false };

	const current = linear[index];
	if (!current) return { file, selection: sel, dirtyIds, didChange: false };

	const previous = linear[index - 1];
	if (!previous) return { file, selection: sel, dirtyIds, didChange: false };
	if ((previous.depth ?? 0) < (current.depth ?? 0)) {
		return { file, selection: sel, dirtyIds, didChange: false };
	}

	const oldParentId = findLinearParentId(linear, index);
	current.depth = Math.max(0, (current.depth ?? 0) + 1);
	if (!isValidLinearDepthSequence(linear)) {
		return { file, selection: sel, dirtyIds: new Set(), didChange: false };
	}

	const newParentId = findLinearParentId(linear, index);
	dirtyIds.add(current.id);
	if (oldParentId) dirtyIds.add(oldParentId);
	if (newParentId) dirtyIds.add(newParentId);

	return {
		file: { frontmatter: file.frontmatter, blocks: rebuildTreeFromLinear(linear) },
		selection: sel,
		dirtyIds,
		didChange: true,
	};
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

export function outdentBlockPreservingOrder(
	file: ParsedOutlinerFile,
	sel: OutlinerSelection
): OutlinerEngineResult {
	const linear = linearizeBlocks(file.blocks ?? []);
	const dirtyIds = new Set<string>();

	const index = findLinearIndexById(linear, sel.id);
	if (index < 0) return { file, selection: sel, dirtyIds, didChange: false };

	const current = linear[index];
	if (!current) return { file, selection: sel, dirtyIds, didChange: false };
	if ((current.depth ?? 0) <= 0) return { file, selection: sel, dirtyIds, didChange: false };

	const oldParentId = findLinearParentId(linear, index);
	const descendantEnd = findLinearDescendantEnd(linear, index);

	current.depth = Math.max(0, (current.depth ?? 0) - 1);
	dirtyIds.add(current.id);

	for (let i = index + 1; i < descendantEnd; i++) {
		const descendant = linear[i];
		if (!descendant) continue;
		descendant.depth = Math.max(0, (descendant.depth ?? 0) - 1);
		dirtyIds.add(descendant.id);
	}

	if (!isValidLinearDepthSequence(linear)) {
		return { file, selection: sel, dirtyIds: new Set(), didChange: false };
	}

	const newParentId = findLinearParentId(linear, index);
	if (oldParentId) dirtyIds.add(oldParentId);
	if (newParentId) dirtyIds.add(newParentId);

	return {
		file: { frontmatter: file.frontmatter, blocks: rebuildTreeFromLinear(linear) },
		selection: sel,
		dirtyIds,
		didChange: true,
	};
}

export function moveBlockSubtree(
	file: ParsedOutlinerFile,
	sourceId: string,
	targetId: string,
	where: OutlinerMoveWhere
): OutlinerEngineResult {
	if (!sourceId || !targetId) {
		return { file, selection: { id: sourceId, start: 0, end: 0 }, dirtyIds: new Set(), didChange: false };
	}
	if (sourceId === targetId) {
		return { file, selection: { id: sourceId, start: 0, end: 0 }, dirtyIds: new Set(), didChange: false };
	}

	const next = cloneFile(file);
	const dirtyIds = new Set<string>();

	const src = findBlockLocation(next.blocks, sourceId, null);
	if (!src) return { file, selection: { id: sourceId, start: 0, end: 0 }, dirtyIds, didChange: false };

	// Disallow moving a subtree into itself (or relative to its descendants) to avoid cycles.
	const srcIds = new Set<string>();
	collectIds([src.block], srcIds);
	if (srcIds.has(targetId)) {
		return { file, selection: { id: sourceId, start: 0, end: 0 }, dirtyIds, didChange: false };
	}

	const tgt = findBlockLocation(next.blocks, targetId, null);
	if (!tgt) return { file, selection: { id: sourceId, start: 0, end: 0 }, dirtyIds, didChange: false };

	let destSiblings: OutlinerBlock[];
	let destIndex: number;
	let destParent: OutlinerBlock | null;

	if (where === "inside") {
		destParent = tgt.block;
		destSiblings = tgt.block.children;
		destIndex = destSiblings.length; // append
	} else {
		destParent = tgt.parent;
		destSiblings = tgt.siblings;
		destIndex = tgt.index + (where === "after" ? 1 : 0);
	}

	// Adjust insertion index when moving within the same siblings list.
	if (destSiblings === src.siblings && destIndex > src.index) {
		destIndex -= 1;
	}

	// No-op: already in the right place.
	if (destSiblings === src.siblings && destIndex === src.index) {
		return { file, selection: { id: sourceId, start: 0, end: 0 }, dirtyIds, didChange: false };
	}

	// Remove then insert.
	src.siblings.splice(src.index, 1);
	destSiblings.splice(Math.max(0, Math.min(destSiblings.length, destIndex)), 0, src.block);

	rebuildDepths(next.blocks, 0);

	dirtyIds.add(src.block.id);
	if (src.parent) dirtyIds.add(src.parent.id);
	if (destParent) dirtyIds.add(destParent.id);

	return { file: next, selection: { id: sourceId, start: 0, end: 0 }, dirtyIds, didChange: true };
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
