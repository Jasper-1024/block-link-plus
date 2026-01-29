import { normalizePath, TFile } from "obsidian";
import type BlockLinkPlus from "../../main";

import {
	ENHANCED_LIST_FRONTMATTER_KEY,
	EnhancedListScopeManager,
	isPathInEnhancedListScopeFolder,
	normalizeEnhancedListScopePath,
} from "./scope-manager";

export { ENHANCED_LIST_FRONTMATTER_KEY };

export function normalizeScopePath(input: string): string {
	return normalizeEnhancedListScopePath(input);
}

export function isPathInFolder(path: string, folder: string): boolean {
	return isPathInEnhancedListScopeFolder(normalizePath(path), folder);
}

const scopeByPlugin = new WeakMap<BlockLinkPlus, EnhancedListScopeManager>();
const scopeSymbol: symbol = Symbol.for("block-link-plus.enhancedListScopeManager");

export function getEnhancedListScopeManager(plugin: BlockLinkPlus): EnhancedListScopeManager {
	const anyPlugin = plugin as any;
	const existing = anyPlugin?.[scopeSymbol] as EnhancedListScopeManager | undefined;
	if (existing) return existing;

	let scope = scopeByPlugin.get(plugin);
	if (!scope) {
		scope = new EnhancedListScopeManager(plugin);
		scopeByPlugin.set(plugin, scope);
	}

	try {
		anyPlugin[scopeSymbol] = scope;
	} catch {
		// Ignore if plugin object is not extensible.
	}

	return scope;
}

export function isEnhancedListEnabledFile(plugin: BlockLinkPlus, file: TFile): boolean {
	if (!(file instanceof TFile)) return false;
	return getEnhancedListScopeManager(plugin).isEnabledFile(file);
}

export function getEnhancedListEnabledMarkdownFiles(plugin: BlockLinkPlus): TFile[] {
	return getEnhancedListScopeManager(plugin).getEnabledMarkdownFiles().files;
}

