import type BlockLinkPlus from "../../main";
import { FILE_OUTLINER_VIEW_TYPE } from "./constants";
import { FileOutlinerView } from "./view";
import { registerFileOutlinerRouting } from "./routing";
import { registerFileOutlinerMarkdownPaneMenu } from "./markdown-pane-menu";

export { FILE_OUTLINER_VIEW_TYPE, FileOutlinerView };
export * from "./protocol";
export { handleBlpView } from "./blp-view";
export { registerFileOutlinerRouting };

export function notifyFileOutlinerViewsSettingsChanged(plugin: BlockLinkPlus): void {
	try {
		const leaves = plugin.app.workspace.getLeavesOfType(FILE_OUTLINER_VIEW_TYPE) ?? [];
		for (const leaf of leaves as any[]) {
			const viewAny = (leaf as any)?.view as any;
			if (viewAny && typeof viewAny.onFileOutlinerSettingsChanged === "function") {
				viewAny.onFileOutlinerSettingsChanged();
			}
		}
	} catch {
		// ignore
	}
}

export function registerFileOutlinerView(plugin: BlockLinkPlus): void {
	plugin.registerView(FILE_OUTLINER_VIEW_TYPE, (leaf) => new FileOutlinerView(leaf, plugin));
	registerFileOutlinerRouting(plugin);
	registerFileOutlinerMarkdownPaneMenu(plugin);
}
