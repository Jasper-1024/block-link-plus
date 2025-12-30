import { MarkdownRenderChild, MarkdownView, TFile, WorkspaceLeaf } from "obsidian";
import type BlockLinkPlus from "../../main";

export interface ManagedEmbedLeaf {
	containerEl: HTMLElement;
	file: TFile;
	subpath?: string;
	sourcePath: string;
	component: MarkdownRenderChild;
	leaf: WorkspaceLeaf;
	view: MarkdownView;
	restore?: () => void;
}

export class EmbedLeafManager {
	static readonly INLINE_EDIT_ROOT_CLASS = "blp-inline-edit-root";

	private readonly plugin: BlockLinkPlus;
	private readonly embedRegistry = new WeakMap<HTMLElement, ManagedEmbedLeaf>();
	private readonly activeEmbeds = new Set<ManagedEmbedLeaf>();

	constructor(plugin: BlockLinkPlus) {
		this.plugin = plugin;
	}

	getActiveEmbeds(): ManagedEmbedLeaf[] {
		return Array.from(this.activeEmbeds);
	}

	cleanup(): void {
		const embeds = Array.from(this.activeEmbeds);
		for (const embed of embeds) {
			this.detach(embed);
		}
	}

	getEmbedFromElement(element: HTMLElement | null): ManagedEmbedLeaf | null {
		if (!element) return null;

		let current: HTMLElement | null = element;
		while (current && current !== document.body) {
			const embed = this.embedRegistry.get(current);
			if (embed) return embed;
			current = current.parentElement;
		}
		return null;
	}

	isNestedWithinEmbed(element: HTMLElement | null): boolean {
		if (!element) return false;
		return element.matchParent(`.${EmbedLeafManager.INLINE_EDIT_ROOT_CLASS}`) !== null;
	}

	isLegacyDoubleBangEmbed(embedEl: HTMLElement): boolean {
		let prev: ChildNode | null = embedEl.previousSibling;
		let collected = "";
		let nonEmptyTextNodes = 0;

		while (prev && nonEmptyTextNodes < 2 && collected.length < 16) {
			if (prev.nodeType === Node.TEXT_NODE) {
				const text = prev.textContent ?? "";
				if (text.trim() === "") {
					prev = prev.previousSibling;
					continue;
				}

				collected = text + collected;
				nonEmptyTextNodes += 1;
				prev = prev.previousSibling;
				continue;
			}

			break;
		}

		const trimmed = collected.replace(/\s+$/, "");
		return trimmed.endsWith("!!");
	}

	async createEmbedLeaf(args: {
		containerEl: HTMLElement;
		file: TFile;
		sourcePath: string;
		subpath?: string;
	}): Promise<ManagedEmbedLeaf> {
		const leaf = new (WorkspaceLeaf as any)(this.plugin.app) as WorkspaceLeaf;

		const embed: ManagedEmbedLeaf = {
			containerEl: args.containerEl,
			file: args.file,
			subpath: args.subpath,
			sourcePath: args.sourcePath,
			component: undefined as unknown as MarkdownRenderChild,
			leaf,
			view: undefined as unknown as MarkdownView,
		};

		const component = new MarkdownRenderChild(args.containerEl);
		component.load();
		component.register(() => {
			this.detachLeafFromComponentUnload(embed);
		});
		embed.component = component;

		args.containerEl.addClass(EmbedLeafManager.INLINE_EDIT_ROOT_CLASS);

		try {
			await leaf.openFile(args.file, {
				state: { mode: "source" },
			} as any);
		} catch (error) {
			component.unload();
			leaf.detach();
			throw error;
		}

		if (!(leaf.view instanceof MarkdownView)) {
			component.unload();
			leaf.detach();
			throw new Error("InlineEdit: failed to load MarkdownView");
		}

		embed.view = leaf.view;

		this.embedRegistry.set(args.containerEl, embed);
		this.activeEmbeds.add(embed);

		return embed;
	}

	reparent(embeddingContainerEl: HTMLElement, viewContainerEl: HTMLElement): void {
		embeddingContainerEl.replaceChildren(viewContainerEl);
	}

	detachLeafFromComponentUnload(embed: ManagedEmbedLeaf): void {
		this.embedRegistry.delete(embed.containerEl);
		this.activeEmbeds.delete(embed);

		try {
			embed.restore?.();
		} catch {
			// ignore
		}

		try {
			embed.containerEl.removeClass(EmbedLeafManager.INLINE_EDIT_ROOT_CLASS);
		} catch {
			// ignore
		}

		try {
			embed.leaf.detach();
		} catch {
			// ignore
		}
	}

	detach(embed: ManagedEmbedLeaf): void {
		try {
			embed.component.unload();
		} catch {
			// ignore
		}
	}
}
