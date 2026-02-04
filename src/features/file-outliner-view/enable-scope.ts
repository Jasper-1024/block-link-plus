import { normalizePath, TFile } from "obsidian";
import type BlockLinkPlus from "../../main";

import {
	FILE_OUTLINER_FRONTMATTER_KEY,
	FileOutlinerScopeManager,
	isPathInFileOutlinerScopeFolder,
	normalizeFileOutlinerScopePath,
} from "./scope-manager";

export { FILE_OUTLINER_FRONTMATTER_KEY };

export function normalizeScopePath(input: string): string {
	return normalizeFileOutlinerScopePath(input);
}

export function isPathInFolder(path: string, folder: string): boolean {
	return isPathInFileOutlinerScopeFolder(normalizePath(path), folder);
}

const scopeByPlugin = new WeakMap<BlockLinkPlus, FileOutlinerScopeManager>();
const scopeSymbol: symbol = Symbol.for("block-link-plus.fileOutlinerScopeManager");

export function getFileOutlinerScopeManager(plugin: BlockLinkPlus): FileOutlinerScopeManager {
	const anyPlugin = plugin as any;
	const existing = anyPlugin?.[scopeSymbol] as FileOutlinerScopeManager | undefined;
	if (existing) return existing;

	let scope = scopeByPlugin.get(plugin);
	if (!scope) {
		scope = new FileOutlinerScopeManager(plugin);
		scopeByPlugin.set(plugin, scope);
	}

	try {
		anyPlugin[scopeSymbol] = scope;
	} catch {
		// Ignore if plugin object is not extensible.
	}

	return scope;
}

export function isFileOutlinerEnabledFile(plugin: BlockLinkPlus, file: TFile): boolean {
	if (!(file instanceof TFile)) return false;
	return getFileOutlinerScopeManager(plugin).isEnabledFile(file);
}

export function getFileOutlinerEnabledMarkdownFiles(plugin: BlockLinkPlus): TFile[] {
	return getFileOutlinerScopeManager(plugin).getEnabledMarkdownFiles().files;
}

