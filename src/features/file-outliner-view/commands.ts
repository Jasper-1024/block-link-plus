import type BlockLinkPlus from "../../main";
import { FILE_OUTLINER_VIEW_TYPE } from "./constants";
import { getFileOutlinerCommandLabels } from "./labels";
import { getActiveOutlinerEmbedViews } from "../journal-feed-view/OutlinerEmbedLeafManager";

export const FILE_OUTLINER_COMMAND_IDS = {
	toggleTaskStatus: "file-outliner-toggle-task-status",
	toggleTaskMarker: "file-outliner-toggle-task-marker",
	moveActiveBlockUp: "file-outliner-move-active-block-up",
	moveActiveBlockDown: "file-outliner-move-active-block-down",
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

function getFocusedOutlinerView(plugin: BlockLinkPlus): any | null {
	const candidates: any[] = [];
	try {
		const activeView = (plugin.app.workspace.activeLeaf as any)?.view;
		if (activeView) candidates.push(activeView);
	} catch {
		// Ignore a partially initialized workspace during command registration.
	}

	try {
		const leaves = (plugin.app.workspace as any).getLeavesOfType?.(FILE_OUTLINER_VIEW_TYPE) ?? [];
		for (const leaf of leaves) {
			const view = leaf?.view;
			if (view && !candidates.includes(view)) candidates.push(view);
		}
	} catch {
		// Workspace discovery is best-effort; embedded leaves use the registry below.
	}

	try {
		for (const view of getActiveOutlinerEmbedViews(plugin)) {
			if (view && !candidates.includes(view)) candidates.push(view);
		}
	} catch {
		// A Journal Feed teardown may race command availability checks.
	}

	for (const view of candidates) {
		if (typeof view.getViewType === "function" && view.getViewType() !== FILE_OUTLINER_VIEW_TYPE) continue;
		if (typeof view.isActiveBlockEditorFocused !== "function") continue;
		try {
			if (view.isActiveBlockEditorFocused()) return view;
		} catch {
			// Keep looking for another focused Outliner leaf.
		}
	}

	return null;
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

	const registerMoveCommand = (opts: { id: string; name: string; key: "ArrowUp" | "ArrowDown"; direction: "up" | "down" }) => {
		plugin.addCommand({
			id: opts.id,
			name: opts.name,
			hotkeys: [{ modifiers: ["Alt"], key: opts.key }],
			checkCallback: (checking) => {
				const view = getFocusedOutlinerView(plugin);
				if (!view || typeof view.moveActiveBlock !== "function") return false;
				if (checking) return true;
				return Boolean(view.moveActiveBlock(opts.direction));
			},
		});
	};

	registerMoveCommand({
		id: FILE_OUTLINER_COMMAND_IDS.moveActiveBlockUp,
		name: labels.moveActiveBlockUp,
		key: "ArrowUp",
		direction: "up",
	});
	registerMoveCommand({
		id: FILE_OUTLINER_COMMAND_IDS.moveActiveBlockDown,
		name: labels.moveActiveBlockDown,
		key: "ArrowDown",
		direction: "down",
	});
}
