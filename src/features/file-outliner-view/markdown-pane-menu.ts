import { around } from "monkey-around";
import { MarkdownView, TFile } from "obsidian";

import type BlockLinkPlus from "../../main";
import { isFileOutlinerEnabledFile } from "./enable-scope";
import { FILE_OUTLINER_VIEW_TYPE } from "./constants";
import { getFileOutlinerPaneMenuLabels } from "./pane-menu-labels";

type PaneMenuItemLike = {
	setTitle(title: string): PaneMenuItemLike;
	setIcon(icon: string): PaneMenuItemLike;
	onClick(cb: () => void): PaneMenuItemLike;
};

type PaneMenuLike = {
	addSeparator(): void;
	addItem(cb: (item: PaneMenuItemLike) => void): void;
};

export function addOpenAsOutlinerPaneMenuItems(
	menu: PaneMenuLike,
	opts: {
		openSameLeaf: () => void;
		openNewTab: () => void;
	}
): void {
	const labels = getFileOutlinerPaneMenuLabels();
	menu.addSeparator();
	menu.addItem((item) => {
		item.setTitle(labels.openAsOutliner).setIcon("list").onClick(opts.openSameLeaf);
	});
	menu.addItem((item) => {
		item
			.setTitle(labels.openAsOutlinerNewTab)
			.setIcon("copy")
			.onClick(opts.openNewTab);
	});
}

async function openOutlinerFromMarkdownView(
	plugin: BlockLinkPlus,
	view: MarkdownView,
	file: TFile,
	opts: { newLeaf: "tab" | "split" | false }
): Promise<void> {
	try {
		// Best-effort: commit any pending Markdown edits before we swap the leaf view type.
		await (view as any).save?.();
	} catch {
		// ignore
	}

	const leaf = opts.newLeaf ? plugin.app.workspace.getLeaf(opts.newLeaf) : view.leaf;
	await leaf.setViewState({
		type: FILE_OUTLINER_VIEW_TYPE,
		state: { file: file.path },
		active: true,
	});

	try {
		plugin.app.workspace.setActiveLeaf(leaf, { focus: true });
	} catch {
		// ignore
	}
}

export function registerFileOutlinerMarkdownPaneMenu(plugin: BlockLinkPlus): void {
	plugin.register(
		around(MarkdownView.prototype, {
			onPaneMenu(old) {
				return function (this: MarkdownView, menu: any, source: any): void {
					old.call(this, menu, source);

					try {
						// "More options" is the top-right pane menu button.
						if (source !== "more-options") return;

						const file = this.file;
						if (!(file instanceof TFile)) return;
						if (file.extension?.toLowerCase() !== "md") return;
						if (!isFileOutlinerEnabledFile(plugin, file)) return;

						addOpenAsOutlinerPaneMenuItems(menu as PaneMenuLike, {
							openSameLeaf: () =>
								void openOutlinerFromMarkdownView(plugin, this, file, {
									newLeaf: false,
								}),
							openNewTab: () =>
								void openOutlinerFromMarkdownView(plugin, this, file, {
									newLeaf: "tab",
								}),
						});
					} catch {
						// ignore
					}
				};
			},
		})
	);
}
