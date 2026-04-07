import type BlockLinkPlus from "../../main";
import { JOURNAL_FEED_VIEW_TYPE } from "./constants";
import { JournalFeedView } from "./view";
import { registerJournalFeedRouting } from "./routing";

export { JOURNAL_FEED_VIEW_TYPE, JournalFeedView };

export function registerJournalFeedView(plugin: BlockLinkPlus): void {
	plugin.registerView(JOURNAL_FEED_VIEW_TYPE, (leaf) => new JournalFeedView(leaf, plugin));
	registerJournalFeedRouting(plugin);
}

