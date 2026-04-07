import { around } from "monkey-around";
import { WorkspaceLeaf, type OpenViewState, type ViewState } from "obsidian";

import type BlockLinkPlus from "../../main";
import { isDetachedLeaf } from "../../shared/utils/workspaceLeafFlags";
import { JOURNAL_FEED_VIEW_TYPE } from "./constants";
import { isJournalFeedAnchorFileMaybeRead } from "./anchor";

export function registerJournalFeedRouting(plugin: BlockLinkPlus): void {
	plugin.register(
		around(WorkspaceLeaf.prototype, {
			openFile(old) {
				return async function (this: WorkspaceLeaf, file: any, openState?: OpenViewState): Promise<void> {
					// Never route "detached"/internal leaves (embeds, internal MarkdownViews, etc).
					// Routing is a user-facing concern for workspace leaves only.
					const leafAny = this as any;
					if (isDetachedLeaf(this) || leafAny?.parent == null) {
						return old.call(this, file, openState);
					}

					try {
						if (await isJournalFeedAnchorFileMaybeRead(plugin, file)) {
							const viewState: ViewState = {
								type: JOURNAL_FEED_VIEW_TYPE,
								state: { file: file.path },
								active: openState?.active,
							};

							await this.setViewState(viewState, openState?.eState);

							if (openState?.active !== false) {
								try {
									plugin.app.workspace.setActiveLeaf(this, { focus: true });
								} catch {
									// Ignore activation errors.
								}
							}

							return;
						}
					} catch {
						// Fall back to native behavior.
					}

					return old.call(this, file, openState);
				};
			},
		})
	);
}
