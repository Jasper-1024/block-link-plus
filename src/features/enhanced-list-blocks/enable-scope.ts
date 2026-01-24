import { normalizePath, TFile } from "obsidian";
import type BlockLinkPlus from "../../main";

export const ENHANCED_LIST_FRONTMATTER_KEY = "blp_enhanced_list";

function normalizeScopePath(input: string): string {
	return normalizePath(input.trim()).replace(/^\/+/, "").replace(/\/+$/, "");
}

function isPathInFolder(path: string, folder: string): boolean {
	const normalizedFolder = normalizeScopePath(folder);
	if (!normalizedFolder) return true;
	return path === normalizedFolder || path.startsWith(normalizedFolder + "/");
}

export function isEnhancedListEnabledFile(plugin: BlockLinkPlus, file: TFile): boolean {
	if (file.extension && file.extension.toLowerCase() !== "md") return false;

	const filePath = normalizePath(file.path);

	if ((plugin.settings.enhancedListEnabledFiles ?? []).some((p) => normalizePath(p) === filePath)) {
		return true;
	}

	if ((plugin.settings.enhancedListEnabledFolders ?? []).some((f) => isPathInFolder(filePath, f))) {
		return true;
	}

	const cache = plugin.app.metadataCache.getFileCache(file);
	const fm = cache?.frontmatter as Record<string, unknown> | undefined;
	if (!fm) return false;

	const raw = fm[ENHANCED_LIST_FRONTMATTER_KEY];
	return raw === true || raw === "true" || raw === 1;
}

export function getEnhancedListEnabledMarkdownFiles(plugin: BlockLinkPlus): TFile[] {
	const files = plugin.app.vault.getFiles();
	return files.filter((f): f is TFile => f instanceof TFile && isEnhancedListEnabledFile(plugin, f));
}

