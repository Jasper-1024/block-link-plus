import type BlockLinkPlus from "../../main";
import type { DirtyRange } from "./normalize-on-save";
import { normalizeEnhancedListContentOnSave } from "./normalize-on-save";
import { repairDuplicateEnhancedListIds } from "./duplicate-id-repair";

export function preprocessEnhancedListContentForSave(
	content: string,
	plugin: BlockLinkPlus,
	opts: { dirtyRanges: DirtyRange[] }
): string {
	let next = content;
	next = normalizeEnhancedListContentOnSave(next, plugin, { dirtyRanges: opts.dirtyRanges });
	next = repairDuplicateEnhancedListIds(next, plugin);
	return next;
}

