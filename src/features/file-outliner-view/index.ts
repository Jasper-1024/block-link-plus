import type BlockLinkPlus from "../../main";
import { FILE_OUTLINER_VIEW_TYPE } from "./constants";
import { FileOutlinerView } from "./view";
import { registerFileOutlinerRouting } from "./routing";
import { registerFileOutlinerMarkdownPaneMenu } from "./markdown-pane-menu";

export { FILE_OUTLINER_VIEW_TYPE, FileOutlinerView };
export * from "./protocol";
export { handleBlpView } from "./blp-view";
export { registerFileOutlinerRouting };

export function registerFileOutlinerView(plugin: BlockLinkPlus): void {
	plugin.registerView(FILE_OUTLINER_VIEW_TYPE, (leaf) => new FileOutlinerView(leaf, plugin));
	registerFileOutlinerRouting(plugin);
	registerFileOutlinerMarkdownPaneMenu(plugin);
}
