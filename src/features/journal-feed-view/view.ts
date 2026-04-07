import { TextFileView, TFile, WorkspaceLeaf } from "obsidian";
import moment from "moment";

import type BlockLinkPlus from "../../main";
import { EmbedLeafManager, type ManagedEmbedLeaf } from "../inline-edit-engine/EmbedLeafManager";
import { getJournalFeedConfigFromText, type JournalFeedConfig } from "./anchor";
import { JOURNAL_FEED_VIEW_TYPE } from "./constants";
import { chooseStartIndex, resolveDailySources, type DailySource } from "./daily-sources";

type DaySection = {
	file: TFile;
	ts: number;
	isIntersecting: boolean;
	sectionEl: HTMLElement;
	headerEl: HTMLElement;
	editorHostEl: HTMLElement;
	placeholderEl: HTMLElement;
	embed: ManagedEmbedLeaf | null;
	mountPromise: Promise<void> | null;
	unloadTimer: number | null;
	lastHeight: number;
};

function formatDay(ts: number, format: string): string {
	try {
		return moment(ts).format(format);
	} catch {
		return String(ts);
	}
}

export class JournalFeedView extends TextFileView {
	private readonly plugin: BlockLinkPlus;

	private config: JournalFeedConfig = { initialDays: 3, pageSize: 7 };
	private folderPath = "/";
	private dateFormat = "YYYY-MM-DD";
	private sources: DailySource[] = [];
	private nextIndex = 0;

	private rootEl: HTMLElement | null = null;
	private feedHeaderEl: HTMLElement | null = null;
	private feedEl: HTMLElement | null = null;
	private loadMoreEl: HTMLElement | null = null;

	private readonly embeds: EmbedLeafManager;
	private sections: DaySection[] = [];
	private sectionByHost = new WeakMap<HTMLElement, DaySection>();
	private lifecycleVersion = 0;

	private editorObserver: IntersectionObserver | null = null;
	private loadMoreObserver: IntersectionObserver | null = null;
	private rebuildTimer: number | null = null;

	constructor(leaf: WorkspaceLeaf, plugin: BlockLinkPlus) {
		super(leaf);
		this.plugin = plugin;
		this.embeds = new EmbedLeafManager(plugin);
		this.contentEl.addClass("blp-journal-feed-view");
		this.installFocusBridge();
	}

	getViewType(): string {
		return JOURNAL_FEED_VIEW_TYPE;
	}

	getDisplayText(): string {
		return this.file?.basename ?? "Journal Feed";
	}

	setViewData(data: string, clear: boolean): void {
		if (clear) this.clear();
		this.data = data ?? "";

		// Keep the anchor content intact. Journal Feed is a projected surface.
		this.scheduleRebuild();
	}

	getViewData(): string {
		return this.data ?? "";
	}

	clear(): void {
		this.detachAllSections();
		this.contentEl.empty();
		this.rootEl = null;
		this.feedHeaderEl = null;
		this.feedEl = null;
		this.loadMoreEl = null;
	}

	onunload(): void {
		super.onunload();
		this.detachAllSections();
	}

	private scheduleRebuild(delayMs = 30): void {
		if (this.rebuildTimer !== null) return;
		this.rebuildTimer = window.setTimeout(() => {
			this.rebuildTimer = null;
			void this.rebuild();
		}, delayMs);
	}

	private renderShell(): void {
		this.contentEl.empty();
		this.rootEl = this.contentEl.createDiv("blp-journal-feed-root");

		this.feedHeaderEl = this.rootEl.createDiv("blp-journal-feed-header");
		this.feedEl = this.rootEl.createDiv("blp-journal-feed-scroll");
		this.loadMoreEl = this.feedEl.createDiv("blp-journal-feed-load-more");
		this.loadMoreEl.setText("Load more…");
	}

	private async rebuild(): Promise<void> {
		this.detachAllSections();
		this.renderShell();

		this.config = getJournalFeedConfigFromText(this.data);

		const resolved = resolveDailySources(this.app as any);
		if (!resolved.ok) {
			this.renderError(resolved.reason);
			return;
		}

		this.folderPath = resolved.folderPath;
		this.dateFormat = resolved.format;
		this.sources = resolved.sources;

		if (this.sources.length === 0) {
			this.renderError("No Daily Notes files found.");
			return;
		}

		const startIndex = chooseStartIndex(this.sources);
		this.nextIndex = startIndex;

		this.renderHeader();
		this.installObservers();

		this.appendMore({ count: this.config.initialDays });
	}

	private renderHeader(): void {
		if (!this.feedHeaderEl) return;
		this.feedHeaderEl.empty();

		const titleRow = this.feedHeaderEl.createDiv("blp-journal-feed-title-row");
		titleRow.createDiv({ cls: "blp-journal-feed-title", text: "Journal Feed" });

		const meta = this.feedHeaderEl.createDiv("blp-journal-feed-meta");
		meta.setText(`Daily Notes: folder=${this.folderPath || "/"} format=${this.dateFormat}`);

		const actions = this.feedHeaderEl.createDiv("blp-journal-feed-actions");

		const refreshBtn = actions.createEl("button", { text: "Refresh" });
		refreshBtn.addEventListener("click", () => this.scheduleRebuild(0));

		const openAnchorBtn = actions.createEl("button", { text: "Open Anchor" });
		openAnchorBtn.addEventListener("click", () => this.openAnchorInMarkdown());
	}

	private renderError(message: string): void {
		if (!this.feedEl) return;
		this.feedEl.empty();

		const box = this.feedEl.createDiv("blp-journal-feed-error");
		box.createEl("div", { text: message });

		const actions = box.createDiv("blp-journal-feed-actions");
		const openAnchorBtn = actions.createEl("button", { text: "Open Anchor" });
		openAnchorBtn.addEventListener("click", () => this.openAnchorInMarkdown());
	}

	private openAnchorInMarkdown(): void {
		const file = this.file instanceof TFile ? this.file : null;
		if (!file) return;

		try {
			const leaf = this.app.workspace.getLeaf(true);
			void leaf.setViewState({
				type: "markdown",
				state: { file: file.path, mode: "source" },
				active: true,
			} as any);
		} catch {
			// ignore
		}
	}

	private installObservers(): void {
		this.editorObserver?.disconnect();
		this.loadMoreObserver?.disconnect();

		const root = this.feedEl ?? this.contentEl;

		this.editorObserver = new IntersectionObserver(
			(entries) => {
				for (const entry of entries) {
					const section = this.sectionByHost.get(entry.target as HTMLElement);
					if (!section) continue;

					section.isIntersecting = entry.isIntersecting;
					if (entry.isIntersecting) {
						void this.mountSectionEditor(section, { focus: false, bridge: false });
					} else {
						this.scheduleSectionUnload(section);
					}
				}
			},
			{ root, rootMargin: "600px 0px 600px 0px", threshold: 0.01 }
		);

		if (this.loadMoreEl) {
			this.loadMoreObserver = new IntersectionObserver(
				(entries) => {
					if (entries.some((e) => e.isIntersecting)) {
						this.appendMore({ count: this.config.pageSize });
					}
				},
				{ root, rootMargin: "800px 0px 800px 0px", threshold: 0.01 }
			);
			this.loadMoreObserver.observe(this.loadMoreEl);
		}
	}

	private appendMore(opts: { count: number }): void {
		if (!this.feedEl) return;
		if (this.sources.length === 0) return;
		if (opts.count <= 0) return;

		const start = this.nextIndex;
		const end = Math.min(this.sources.length, start + opts.count);
		if (start >= end) {
			this.loadMoreEl?.setText("No more days.");
			return;
		}

		for (let i = start; i < end; i++) {
			const src = this.sources[i];
			const section = this.createDaySection(src);
			this.sections.push(section);
		}

		this.nextIndex = end;

		// Keep the sentinel at the bottom.
		if (this.loadMoreEl) {
			this.feedEl.appendChild(this.loadMoreEl);
		}
	}

	private createDaySection(src: DailySource): DaySection {
		if (!this.feedEl) {
			throw new Error("JournalFeedView: feedEl missing");
		}

		const sectionEl = this.feedEl.createDiv("blp-journal-feed-day");
		const headerEl = sectionEl.createDiv("blp-journal-feed-day-header");

		const dateText = formatDay(src.ts, this.dateFormat);
		headerEl.createDiv({ cls: "blp-journal-feed-day-title", text: dateText });

		const openBtn = headerEl.createEl("button", { text: "Open" });
		openBtn.addEventListener("click", () => {
			try {
				void this.app.workspace.getLeaf(true).openFile(src.file);
			} catch {
				// ignore
			}
		});

		const editorHostEl = sectionEl.createDiv("blp-journal-feed-day-editor");
		editorHostEl.dataset.blpJournalEditor = "1";
		editorHostEl.dataset.path = src.file.path;

		const placeholderEl = editorHostEl.createDiv("blp-journal-feed-placeholder");
		placeholderEl.setText("Scroll to load…");

		const section: DaySection = {
			file: src.file,
			ts: src.ts,
			isIntersecting: false,
			sectionEl,
			headerEl,
			editorHostEl,
			placeholderEl,
			embed: null,
			mountPromise: null,
			unloadTimer: null,
			lastHeight: 160,
		};

		this.sectionByHost.set(editorHostEl, section);
		this.editorObserver?.observe(editorHostEl);

		// Click-to-mount: if user clicks a placeholder, mount immediately.
		editorHostEl.addEventListener("pointerdown", () => {
			void this.mountSectionEditor(section, { focus: true, bridge: true });
		});

		return section;
	}

	private async mountSectionEditor(section: DaySection, opts: { focus: boolean; bridge: boolean }): Promise<void> {
		if (section.unloadTimer !== null) {
			try {
				window.clearTimeout(section.unloadTimer);
			} catch {
				// ignore
			}
			section.unloadTimer = null;
		}

		const shouldBridge = opts.bridge || opts.focus;

		if (section.embed) {
			const embed = section.embed;
			if (shouldBridge) this.bridgeFocus(embed);
			if (opts.focus) embed.view.editor?.focus();
			return;
		}

		if (section.mountPromise) {
			try {
				await section.mountPromise;
			} catch {
				// ignore
			}

			const embed = section.embed;
			if (embed) {
				if (shouldBridge) this.bridgeFocus(embed);
				if (opts.focus) (embed as ManagedEmbedLeaf).view.editor?.focus();
			}

			return;
		}

		if (!section.editorHostEl.isConnected) return;

		const version = this.lifecycleVersion;

		// Clear placeholder but preserve last known height to avoid scroll jumps.
		try {
			section.editorHostEl.style.minHeight = `${Math.max(section.lastHeight, 160)}px`;
		} catch {
			// ignore
		}
		section.editorHostEl.empty();

		section.mountPromise = (async () => {
			let embed: ManagedEmbedLeaf;
			try {
				embed = await this.embeds.createEmbedLeaf({
					containerEl: section.editorHostEl,
					file: section.file,
					sourcePath: this.file?.path ?? section.file.path,
				});
			} catch {
				section.editorHostEl.empty();
				section.placeholderEl = section.editorHostEl.createDiv("blp-journal-feed-placeholder");
				section.placeholderEl.setText("Failed to load.");
				return;
			}

			// View was rebuilt/unloaded while awaiting the embed. Detach immediately.
			if (version !== this.lifecycleVersion || !section.editorHostEl.isConnected) {
				try {
					this.embeds.detach(embed);
				} catch {
					// ignore
				}
				return;
			}

			this.embeds.reparent(section.editorHostEl, embed.view.containerEl);
			section.embed = embed;
		})();

		try {
			await section.mountPromise;
		} catch {
			// ignore
		} finally {
			section.mountPromise = null;
		}

		const embed = section.embed;
		if (!embed) return;

		if (shouldBridge) this.bridgeFocus(embed);

		if (opts.focus) {
			try {
				(embed as ManagedEmbedLeaf).view.editor?.focus();
			} catch {
				// ignore
			}
		}

		// Race guard: if we mounted while already out of view, ensure we still unload.
		if (!section.isIntersecting && !opts.focus) {
			this.scheduleSectionUnload(section);
		}
	}

	private scheduleSectionUnload(section: DaySection): void {
		if (section.unloadTimer !== null) return;
		section.unloadTimer = window.setTimeout(() => {
			section.unloadTimer = null;
			void this.unmountSectionEditor(section);
		}, 1200);
	}

	private async unmountSectionEditor(section: DaySection): Promise<void> {
		const embed = section.embed;
		if (!embed) return;

		// Preserve height so scroll doesn't jump.
		try {
			const h = section.editorHostEl.getBoundingClientRect().height;
			if (Number.isFinite(h) && h > 0) section.lastHeight = Math.round(h);
			section.editorHostEl.style.minHeight = `${Math.max(section.lastHeight, 160)}px`;
		} catch {
			// ignore
		}

		// Best effort: flush edits before disposing the leaf.
		try {
			await embed.view.save();
		} catch {
			// ignore
		}

		// If this embed was focused, clear focus so commands don't get hijacked.
		try {
			const focused = this.plugin.inlineEditEngine?.focus?.getFocused?.();
			if (focused === embed) {
				this.plugin.inlineEditEngine.focus.setFocused(null);
			}
		} catch {
			// ignore
		}

		try {
			this.embeds.detach(embed);
		} catch {
			// ignore
		} finally {
			section.embed = null;
		}

		section.editorHostEl.empty();
		section.placeholderEl = section.editorHostEl.createDiv("blp-journal-feed-placeholder");
		section.placeholderEl.setText("Scroll to load…");
	}

	private detachAllSections(): void {
		this.lifecycleVersion += 1;

		// Clear focus if we currently own it.
		try {
			const focused = this.plugin.inlineEditEngine?.focus?.getFocused?.();
			if (focused && focused.containerEl?.closest?.(".blp-journal-feed-view")) {
				this.plugin.inlineEditEngine.focus.setFocused(null);
			}
		} catch {
			// ignore
		}

		this.editorObserver?.disconnect();
		this.loadMoreObserver?.disconnect();
		this.editorObserver = null;
		this.loadMoreObserver = null;

		for (const section of this.sections) {
			if (section.unloadTimer !== null) {
				try {
					window.clearTimeout(section.unloadTimer);
				} catch {
					// ignore
				}
				section.unloadTimer = null;
			}

			if (section.embed) {
				try {
					this.embeds.detach(section.embed);
				} catch {
					// ignore
				}
				section.embed = null;
			}

			section.mountPromise = null;
		}

		this.sections = [];
		this.sectionByHost = new WeakMap<HTMLElement, DaySection>();
		this.embeds.cleanup();

		if (this.rebuildTimer !== null) {
			try {
				window.clearTimeout(this.rebuildTimer);
			} catch {
				// ignore
			}
			this.rebuildTimer = null;
		}
	}

	private bridgeFocus(embed: ManagedEmbedLeaf): void {
		try {
			this.plugin.inlineEditEngine?.focus?.setFocused?.(embed);
		} catch {
			// ignore
		}
	}

	private installFocusBridge(): void {
		// Focus tracking for Journal Feed editors. This is separate from InlineEditEngine's
		// own embed registry so Journal Feed works even when inline edit features are disabled.
		this.registerDomEvent(this.contentEl, "focusin", (event: FocusEvent) => {
			const target = event.target;
			if (!(target instanceof HTMLElement)) return;
			const host = target.closest<HTMLElement>("[data-blp-journal-editor]");
			if (!host) return;
			const section = this.sectionByHost.get(host);
			if (!section) return;

			void this.mountSectionEditor(section, { focus: false, bridge: true });
		});

		this.registerDomEvent(this.contentEl, "focusout", (event: FocusEvent) => {
			const next = event.relatedTarget;
			if (next instanceof HTMLElement) {
				const nextHost = next.closest<HTMLElement>("[data-blp-journal-editor]");
				if (nextHost) {
					const nextSection = this.sectionByHost.get(nextHost);
					if (nextSection?.embed) {
						this.bridgeFocus(nextSection.embed);
						return;
					}
				}
			}

			// Clear only if we currently own the focus.
			try {
				const focused = this.plugin.inlineEditEngine?.focus?.getFocused?.();
				if (focused && focused.containerEl?.closest?.(".blp-journal-feed-view")) {
					this.plugin.inlineEditEngine.focus.setFocused(null);
				}
			} catch {
				// ignore
			}
		});
	}
}
