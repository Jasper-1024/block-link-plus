import { MarkdownRenderChild, TFile, WorkspaceLeaf } from "obsidian";

import type BlockLinkPlus from "../../main";
import { markLeafAsDetached } from "../../shared/utils/workspaceLeafFlags";
import { FILE_OUTLINER_VIEW_TYPE } from "../file-outliner-view/constants";

export interface ManagedOutlinerEmbedLeaf {
	containerEl: HTMLElement;
	file: TFile;
	sourcePath: string;
	component: MarkdownRenderChild;
	leaf: WorkspaceLeaf;
	view: any;
	restore?: () => void;
}

export class OutlinerEmbedLeafManager {
	private readonly plugin: BlockLinkPlus;
	private readonly embedRegistry = new WeakMap<HTMLElement, ManagedOutlinerEmbedLeaf>();
	private readonly activeEmbeds = new Set<ManagedOutlinerEmbedLeaf>();

	constructor(plugin: BlockLinkPlus) {
		this.plugin = plugin;
	}

	getActiveEmbeds(): ManagedOutlinerEmbedLeaf[] {
		return Array.from(this.activeEmbeds);
	}

	cleanup(): void {
		const embeds = Array.from(this.activeEmbeds);
		for (const embed of embeds) {
			this.detach(embed);
		}
	}

	async createEmbedLeaf(args: { containerEl: HTMLElement; file: TFile; sourcePath: string }): Promise<ManagedOutlinerEmbedLeaf> {
		const leaf = new (WorkspaceLeaf as any)(this.plugin.app) as WorkspaceLeaf;
		markLeafAsDetached(leaf);

		const embed: ManagedOutlinerEmbedLeaf = {
			containerEl: args.containerEl,
			file: args.file,
			sourcePath: args.sourcePath,
			component: undefined as unknown as MarkdownRenderChild,
			leaf,
			view: undefined,
		};

		const component = new MarkdownRenderChild(args.containerEl);
		component.load();
		component.register(() => {
			this.detachLeafFromComponentUnload(embed);
		});
		embed.component = component;

		try {
			await leaf.setViewState({
				type: FILE_OUTLINER_VIEW_TYPE,
				state: { file: args.file.path },
				active: false,
			} as any);
		} catch (error) {
			component.unload();
			leaf.detach();
			throw error;
		}

		const view: any = leaf.view;
		if (!view || typeof view.getViewType !== "function" || view.getViewType() !== FILE_OUTLINER_VIEW_TYPE) {
			component.unload();
			leaf.detach();
			throw new Error("JournalFeed: failed to load FileOutlinerView");
		}

		embed.view = view;

		this.embedRegistry.set(args.containerEl, embed);
		this.activeEmbeds.add(embed);

		return embed;
	}

	reparent(embeddingContainerEl: HTMLElement, viewContainerEl: HTMLElement): void {
		embeddingContainerEl.replaceChildren(viewContainerEl);
	}

	private detachLeafFromComponentUnload(embed: ManagedOutlinerEmbedLeaf): void {
		this.embedRegistry.delete(embed.containerEl);
		this.activeEmbeds.delete(embed);

		try {
			embed.restore?.();
		} catch {
			// ignore
		}

		try {
			embed.leaf.detach();
		} catch {
			// ignore
		}
	}

	detach(embed: ManagedOutlinerEmbedLeaf): void {
		try {
			embed.component.unload();
		} catch {
			// ignore
		}
	}
}

