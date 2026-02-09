import type { WorkspaceLeaf } from "obsidian";

// Marks WorkspaceLeaf instances that are created by BLP for internal rendering
// (e.g. InlineEditEngine embed leaves). These leaves must never be affected by
// user-facing routing (like file-level outliner view routing).
const BLP_DETACHED_LEAF_MARK: unique symbol = Symbol.for("block-link-plus.detachedLeaf");

export function markLeafAsDetached(leaf: WorkspaceLeaf): void {
	try {
		(leaf as any)[BLP_DETACHED_LEAF_MARK] = true;
	} catch {
		// ignore
	}
}

export function isDetachedLeaf(leaf: WorkspaceLeaf | null | undefined): boolean {
	try {
		return Boolean(leaf && (leaf as any)[BLP_DETACHED_LEAF_MARK] === true);
	} catch {
		return false;
	}
}

