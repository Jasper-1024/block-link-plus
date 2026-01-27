import { TFile } from "obsidian";
import { DateTime } from "luxon";
import type BlockLinkPlus from "../../main";
import { generateRandomId } from "../../utils";
import { isEnhancedListEnabledFile } from "./enable-scope";
import { consumeEnhancedListDirtyRanges, normalizeEnhancedListContentOnSave } from "./normalize-on-save";

const SYSTEM_LINE_REGEX =
	/^(\s*)\[date::\s*(\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2})\]\s*\^([a-zA-Z0-9_-]+)\s*$/;

function formatSystemDate(dt: DateTime): string {
	return dt.toFormat("yyyy-MM-dd'T'HH:mm:ss");
}

function generateUniqueId(plugin: BlockLinkPlus, usedIds: Set<string>, fileContent: string): string {
	const prefix = plugin.settings.enable_prefix ? plugin.settings.id_prefix : "";
	const length = plugin.settings.id_length;

	for (let i = 0; i < 50; i++) {
		const id = generateRandomId(prefix, length);
		if (usedIds.has(id)) continue;
		if (fileContent.includes(`^${id}`)) continue;
		usedIds.add(id);
		return id;
	}

	// Extremely unlikely fallback: keep trying with a longer random suffix.
	while (true) {
		const id = Math.random().toString(36).slice(2, 10);
		if (usedIds.has(id)) continue;
		if (fileContent.includes(`^${id}`)) continue;
		usedIds.add(id);
		return id;
	}
}

export function repairDuplicateEnhancedListIds(content: string, plugin: BlockLinkPlus): string {
	const lines = content.split("\n");
	const seen = new Set<string>();
	const used = new Set<string>();

	const duplicates: Array<{ lineIndex: number; indent: string }> = [];

	for (let i = 0; i < lines.length; i++) {
		const match = lines[i].match(SYSTEM_LINE_REGEX);
		if (!match) continue;

		const id = match[3];
		used.add(id);

		if (seen.has(id)) {
			duplicates.push({ lineIndex: i, indent: match[1] ?? "" });
		} else {
			seen.add(id);
		}
	}

	if (duplicates.length === 0) return content;

	const now = DateTime.now();
	for (const dup of duplicates) {
		const newId = generateUniqueId(plugin, used, content);
		lines[dup.lineIndex] = `${dup.indent}[date:: ${formatSystemDate(now)}] ^${newId}`;
	}

	return lines.join("\n");
}

export function registerEnhancedListDuplicateIdRepair(plugin: BlockLinkPlus): void {
	const inFlight = new Set<string>();

	const vault: any = plugin.app.vault as any;
	if (typeof vault?.on !== "function") return;

	plugin.registerEvent(
		vault.on("modify", async (file: any) => {
			if (!(file instanceof TFile)) return;
			if (!isEnhancedListEnabledFile(plugin, file)) return;

			if (inFlight.has(file.path)) return;
			inFlight.add(file.path);

			try {
				const content = await plugin.app.vault.read(file);

				// "Normalize on save" operates only on recently-edited ranges (tracked in-memory).
				const dirtyRanges = consumeEnhancedListDirtyRanges(file.path);
				let next = content;
				if (plugin.settings.enhancedListNormalizeOnSave === true && dirtyRanges.length > 0) {
					next = normalizeEnhancedListContentOnSave(next, plugin, { dirtyRanges });
				}

				// Existing behavior: always fix duplicate Enhanced List IDs on save.
				next = repairDuplicateEnhancedListIds(next, plugin);

				if (next !== content) {
					await plugin.app.vault.modify(file, next);
				}
			} finally {
				inFlight.delete(file.path);
			}
		})
	);
}
