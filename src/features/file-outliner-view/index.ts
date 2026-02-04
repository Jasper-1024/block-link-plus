import type BlockLinkPlus from "../../main";
import { FileOutlinerView, FILE_OUTLINER_VIEW_TYPE } from "./view";
import { registerFileOutlinerRouting } from "./routing";

export { FILE_OUTLINER_VIEW_TYPE, FileOutlinerView };
export * from "./protocol";
export { registerFileOutlinerRouting };

export function registerFileOutlinerView(plugin: BlockLinkPlus): void {
	plugin.registerView(FILE_OUTLINER_VIEW_TYPE, (leaf) => new FileOutlinerView(leaf, plugin));
	registerFileOutlinerRouting(plugin);
}
