import { around } from "monkey-around";
import { TFile, WorkspaceLeaf, type OpenViewState, type ViewState } from "obsidian";

import type BlockLinkPlus from "../../main";
import { isFileOutlinerEnabledFile } from "./enable-scope";
import { FILE_OUTLINER_VIEW_TYPE } from "./constants";

export function registerFileOutlinerRouting(plugin: BlockLinkPlus): void {
	plugin.register(
		around(WorkspaceLeaf.prototype, {
			openFile(old) {
				return async function (this: WorkspaceLeaf, file: TFile, openState?: OpenViewState): Promise<void> {
					try {
						if (file instanceof TFile && file.extension?.toLowerCase() === "md") {
							if (isFileOutlinerEnabledFile(plugin, file)) {
								if (plugin.settings.fileOutlinerViewEnabled === false) {
									return old.call(this, file, openState);
								}

								const viewState: ViewState = {
									type: FILE_OUTLINER_VIEW_TYPE,
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
