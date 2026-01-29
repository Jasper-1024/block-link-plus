import { DateTime } from "luxon";
import type BlockLinkPlus from "../../main";
import { generateRandomId } from "../../utils";
import { SYSTEM_LINE_MERGED_RE } from "./list-parse";

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
		const match = lines[i].match(SYSTEM_LINE_MERGED_RE);
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
