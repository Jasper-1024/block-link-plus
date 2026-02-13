import type BlockLinkPlus from "../../main";
import { FILE_OUTLINER_VIEW_TYPE } from "./constants";
import { getFileOutlinerCommandLabels } from "./labels";

export const FILE_OUTLINER_COMMAND_IDS = {
	toggleTaskStatus: "file-outliner-toggle-task-status",
	toggleTaskMarker: "file-outliner-toggle-task-marker",
} as const;

function getActiveOutlinerView(plugin: BlockLinkPlus): any | null {
	try {
		const leaf = plugin.app.workspace.activeLeaf;
		const view = (leaf as any)?.view;
		if (!view) return null;
		if (typeof view.getViewType === "function" && view.getViewType() === FILE_OUTLINER_VIEW_TYPE) return view;
		return null;
	} catch {
		return null;
	}
}

export function registerFileOutlinerCommands(plugin: BlockLinkPlus): void {
	const labels = getFileOutlinerCommandLabels();

	plugin.addCommand({
		id: FILE_OUTLINER_COMMAND_IDS.toggleTaskStatus,
		name: labels.toggleTaskStatus,
		hotkeys: [{ modifiers: ["Mod"], key: "Enter" }],
		checkCallback: (checking) => {
			const view = getActiveOutlinerView(plugin);
			if (!view) return false;
			if (typeof view.toggleActiveTaskStatus !== "function") return false;
			if (checking) return true;
			return Boolean(view.toggleActiveTaskStatus());
		},
	});

	plugin.addCommand({
		id: FILE_OUTLINER_COMMAND_IDS.toggleTaskMarker,
		name: labels.toggleTaskMarker,
		hotkeys: [{ modifiers: ["Mod", "Shift"], key: "Enter" }],
		checkCallback: (checking) => {
			const view = getActiveOutlinerView(plugin);
			if (!view) return false;
			if (typeof view.toggleActiveTaskMarker !== "function") return false;
			if (checking) return true;
			return Boolean(view.toggleActiveTaskMarker());
		},
	});
}
