import type BlockLinkPlus from "../../main";
import { MarkdownPostProcessorContext, MarkdownView, TFile, editorLivePreviewField } from "obsidian";
import { contentRange, editableRange } from "shared/utils/codemirror/selectiveEditor";
import { getLineRangeFromRef } from "shared/utils/obsidian";
import { EmbedLeafManager } from "./EmbedLeafManager";
import { FocusTracker } from "./FocusTracker";

const INLINE_EDIT_ACTIVE_CLASS = "blp-inline-edit-active";
const INLINE_EDIT_HOST_CLASS = "blp-inline-edit-host";
const LIVE_PREVIEW_GRACE_MS = 5000;

type LivePreviewObserverEntry = {
	view: MarkdownView;
	rootEl: HTMLElement;
	observer: MutationObserver;
	pendingEmbeds: Set<HTMLElement>;
	scheduled: number | null;
	processing: boolean;
	createdAt: number;
};

type ParsedInlineEmbed = {
	kind: "block" | "heading" | "range";
	file: TFile;
	subpath: string;
	visibleRange: [number, number];
	editableRange: [number, number];
};

export class InlineEditEngine {
	private readonly plugin: BlockLinkPlus;
	readonly leaves: EmbedLeafManager;
	readonly focus: FocusTracker;
	private loaded = false;
	private didInitialMetadataResolve = false;
	private readonly pendingEmbeds = new WeakSet<HTMLElement>();
	private readonly livePreviewObservers = new Map<MarkdownView, LivePreviewObserverEntry>();
	private readonly debugSkipCache = new WeakMap<HTMLElement, { key: string; at: number }>();
	private readonly debugPrefix = "[BLP InlineEdit]";

	constructor(plugin: BlockLinkPlus) {
		this.plugin = plugin;
		this.leaves = new EmbedLeafManager(plugin);
		this.focus = new FocusTracker();
	}

	load(): void {
		if (this.loaded) return;
		this.loaded = true;

		this.plugin.registerEvent(
			this.plugin.app.workspace.on("layout-change", () => {
				if (!this.loaded) return;
				if (!this.isInlineEditActive()) {
					this.disconnectAllObservers();
					this.leaves.cleanup();
					return;
				}

				window.setTimeout(() => {
					this.refreshLivePreviewObservers();
					this.cleanupHiddenEmbeds();
				}, 50);
			})
		);

		this.plugin.app.workspace.onLayoutReady(() => {
			if (!this.loaded) return;
			if (!this.isInlineEditActive()) return;
			this.refreshLivePreviewObservers(true);
		});

		this.plugin.registerEvent(
			this.plugin.app.metadataCache.on("resolved", () => {
				if (!this.loaded) return;
				if (!this.isInlineEditActive()) return;
				if (this.didInitialMetadataResolve) return;
				this.didInitialMetadataResolve = true;
				this.refreshLivePreviewObservers(true);
			})
		);

		window.setTimeout(() => {
			if (!this.loaded) return;
			if (!this.isInlineEditActive()) return;
			this.refreshLivePreviewObservers();
		}, 0);
	}

	unload(): void {
		if (!this.loaded) return;
		this.loaded = false;
		this.disconnectAllObservers();
		this.focus.cleanup();
		this.leaves.cleanup();
	}

	isLoaded(): boolean {
		return this.loaded;
	}

	private isDebugEnabled(): boolean {
		return (window as any).BLP_INLINE_EDIT_DEBUG === true;
	}

	private debugLog(...args: unknown[]): void {
		if (!this.isDebugEnabled()) return;
		// eslint-disable-next-line no-console
		console.log(this.debugPrefix, ...args);
	}

	private debugSkip(embedEl: HTMLElement, key: string, data?: unknown): void {
		if (!this.isDebugEnabled()) return;

		const now = Date.now();
		const previous = this.debugSkipCache.get(embedEl);
		if (previous && previous.key === key && now - previous.at < 2000) return;

		this.debugSkipCache.set(embedEl, { key, at: now });
		this.debugLog(key, data ?? embedEl.getAttribute("src"));
	}

	private isInlineEditActive(): boolean {
		const { inlineEditEnabled, inlineEditFile, inlineEditHeading, inlineEditBlock } = this.plugin.settings;
		return inlineEditEnabled && (inlineEditFile || inlineEditHeading || inlineEditBlock);
	}

	onSettingsChanged(): void {
		if (!this.loaded) return;

		if (!this.isInlineEditActive()) {
			this.disconnectAllObservers();
			this.leaves.cleanup();
			return;
		}

		this.refreshLivePreviewObservers();
	}

	private cleanupHiddenEmbeds(): void {
		const embeds = this.leaves.getActiveEmbeds();
		for (const embed of embeds) {
			if (!embed.containerEl.isConnected || !embed.containerEl.isShown()) {
				this.leaves.detach(embed);
			}
		}
	}

	private disconnectObserverEntry(entry: LivePreviewObserverEntry): void {
		try {
			entry.observer.disconnect();
		} catch {
			// ignore
		}

		if (entry.scheduled !== null) {
			try {
				window.clearTimeout(entry.scheduled);
			} catch {
				// ignore
			}
			entry.scheduled = null;
		}

		entry.pendingEmbeds.clear();
	}

	private disconnectAllObservers(): void {
		for (const entry of this.livePreviewObservers.values()) {
			this.disconnectObserverEntry(entry);
		}
		this.livePreviewObservers.clear();
	}

	private scheduleObserverEntry(entry: LivePreviewObserverEntry, delayMs = 25): void {
		if (!this.loaded) return;
		if (entry.scheduled !== null) return;

		entry.scheduled = window.setTimeout(() => {
			entry.scheduled = null;
			void this.processObserverEntry(entry);
		}, delayMs);
	}

	private getLivePreviewState(entry: LivePreviewObserverEntry): "live" | "not-live" | "unknown" {
		const view = entry.view;
		if (!view.file) return "unknown";
		if (view.getMode() === "preview") return "not-live";

		if (entry.rootEl.classList.contains("is-live-preview")) {
			return "live";
		}

		const cm: any = view.editor?.cm as any;
		if (!cm) return "unknown";

		try {
			if (cm.state?.field?.(editorLivePreviewField, false) === true) {
				return "live";
			}
		} catch {
			// ignore
		}

		if (Date.now() - entry.createdAt < LIVE_PREVIEW_GRACE_MS) {
			return "unknown";
		}

		return "not-live";
	}

	private refreshLivePreviewObservers(forceRescan = false): void {
		for (const [view, entry] of this.livePreviewObservers) {
			if (
				!view.containerEl.isConnected ||
				!entry.rootEl.isConnected ||
				view.getMode() === "preview" ||
				view.containerEl.closest(`.${EmbedLeafManager.INLINE_EDIT_ROOT_CLASS}`)
			) {
				this.disconnectObserverEntry(entry);
				this.livePreviewObservers.delete(view);
			}
		}

		if (!this.isInlineEditActive()) return;

		const leaves = this.plugin.app.workspace.getLeavesOfType("markdown");
		for (const leaf of leaves) {
			const view = leaf.view;
			if (!(view instanceof MarkdownView)) continue;
			if (view.getMode() === "preview") continue;
			if (view.containerEl.closest(`.${EmbedLeafManager.INLINE_EDIT_ROOT_CLASS}`)) continue;

			this.ensureLivePreviewObserver(view, forceRescan);
		}
	}

	private ensureLivePreviewObserver(view: MarkdownView, forceRescan = false): void {
		const rootEl = view.containerEl.querySelector<HTMLElement>(".markdown-source-view");
		if (!rootEl) return;

		const existing = this.livePreviewObservers.get(view);
		if (existing && existing.rootEl === rootEl && !forceRescan) return;

		if (existing) {
			this.disconnectObserverEntry(existing);
			this.livePreviewObservers.delete(view);
		}

		const entry: LivePreviewObserverEntry = {
			view,
			rootEl,
			observer: undefined as unknown as MutationObserver,
			pendingEmbeds: new Set(),
			scheduled: null,
			processing: false,
			createdAt: Date.now(),
		};

		entry.observer = new MutationObserver((mutations) => {
			for (const mutation of mutations) {
				if (mutation.type !== "childList") continue;
				for (const node of mutation.addedNodes) {
					if (!(node instanceof HTMLElement)) continue;

					const candidates: HTMLElement[] = [];
					if (this.isInternalMarkdownEmbed(node)) {
						candidates.push(node);
					}
					node.querySelectorAll<HTMLElement>(".internal-embed.markdown-embed").forEach((embed) => {
						candidates.push(embed);
					});

					for (const embed of candidates) {
						if (!embed.isConnected) continue;
						if (this.leaves.isNestedWithinEmbed(embed)) continue;
						entry.pendingEmbeds.add(embed);
					}
				}
			}

			if (entry.pendingEmbeds.size > 0) {
				this.scheduleObserverEntry(entry);
			}
		});

		try {
			entry.observer.observe(rootEl, { childList: true, subtree: true });
		} catch {
			// ignore
		}

		this.livePreviewObservers.set(view, entry);

		rootEl.querySelectorAll<HTMLElement>(".internal-embed.markdown-embed").forEach((embed) => {
			if (this.leaves.isNestedWithinEmbed(embed)) return;
			entry.pendingEmbeds.add(embed);
		});

		if (entry.pendingEmbeds.size > 0) {
			this.scheduleObserverEntry(entry);
		}
	}

	private async processObserverEntry(entry: LivePreviewObserverEntry): Promise<void> {
		if (!this.loaded) return;
		if (entry.processing) return;
		entry.processing = true;

		try {
			if (!this.isInlineEditActive()) {
				entry.pendingEmbeds.clear();
				return;
			}

			const livePreviewState = this.getLivePreviewState(entry);
			if (livePreviewState === "not-live") {
				entry.pendingEmbeds.clear();
				return;
			}
			if (livePreviewState === "unknown") {
				return;
			}

			const view = entry.view;
			const ctx = {
				sourcePath: view.file!.path,
				addChild: () => {},
			} as unknown as MarkdownPostProcessorContext;

			const embeds = Array.from(entry.pendingEmbeds).filter((el) => el.isConnected);
			entry.pendingEmbeds.clear();

			for (const embedEl of embeds) {
				await this.processInlineEmbed(embedEl, ctx, view);
			}

			this.cleanupHiddenEmbeds();
		} finally {
			entry.processing = false;
			if (entry.pendingEmbeds.size > 0) {
				this.scheduleObserverEntry(entry);
			}
		}
	}

	private async waitForEditorView(
		view: { editor?: { cm?: unknown } },
		timeoutMs = 500
	): Promise<unknown | null> {
		const deadline = Date.now() + timeoutMs;
		while (Date.now() < deadline) {
			const cm = view.editor?.cm;
			if (cm) return cm;
			await new Promise((resolve) => window.setTimeout(resolve, 25));
		}
		return null;
	}

	private isInternalMarkdownEmbed(el: HTMLElement): boolean {
		return el.classList.contains("internal-embed") && el.classList.contains("markdown-embed");
	}

	private isInLivePreview(embedEl: HTMLElement): boolean {
		return embedEl.closest(".markdown-source-view") !== null && embedEl.closest(".markdown-preview-view") === null;
	}

	private cleanupOrphanedShell(embedEl: HTMLElement): void {
		if (!embedEl.classList.contains(INLINE_EDIT_ACTIVE_CLASS)) return;
		if (embedEl.querySelector(`.${EmbedLeafManager.INLINE_EDIT_ROOT_CLASS}`)) return;
		if (embedEl.querySelector(`.${INLINE_EDIT_HOST_CLASS}`)) return;

		try {
			embedEl.removeClass(INLINE_EDIT_ACTIVE_CLASS);
		} catch {
			// ignore
		}
	}

	private getInternalEmbedLink(embedEl: HTMLElement): string | null {
		let embedLink = embedEl.getAttribute("src");
		const altText = embedEl.getAttribute("alt");

		if (!embedLink && altText) {
			const match = altText.match(/(.+?)\\s*>\\s*(.+)/);
			if (match) {
				embedLink = `${match[1].trim()}#${match[2].trim()}`;
			}
		}

		return embedLink;
	}

	private parseBlockIdEmbed(
		embedEl: HTMLElement,
		ctx: MarkdownPostProcessorContext
	): { file: TFile; subpath: string; range: [number, number]; isRange: boolean } | null {
		const embedLink = this.getInternalEmbedLink(embedEl);
		if (!embedLink) return null;

		const pipeIndex = embedLink.indexOf("|");
		const actualLink = pipeIndex === -1 ? embedLink : embedLink.substring(0, pipeIndex);

		const hashIndex = actualLink.indexOf("#");
		if (hashIndex === -1) return null;

		let notePath = actualLink.substring(0, hashIndex).trim();
		const ref = actualLink.substring(hashIndex + 1).trim();

		if (!ref.startsWith("^")) return null;
		if (!/^\^[a-zA-Z0-9_-]+$/.test(ref)) return null;
		const isRange = /^\^([a-z0-9_]+)-\1$/i.test(ref);

		if (!notePath) {
			notePath = ctx.sourcePath;
		}

		const file = this.plugin.app.metadataCache.getFirstLinkpathDest(notePath, ctx.sourcePath);
		if (!file) return null;

		const subpath = `#${ref}`;
		const [start, end] = getLineRangeFromRef(file.path, subpath, this.plugin.app);
		if (!start || !end) return null;

		return { file, subpath, range: [start, end], isRange };
	}

	private parseHeadingEmbed(embedEl: HTMLElement, ctx: MarkdownPostProcessorContext): ParsedInlineEmbed | null {
		const embedLink = this.getInternalEmbedLink(embedEl);
		if (!embedLink) return null;

		const pipeIndex = embedLink.indexOf("|");
		const actualLink = pipeIndex === -1 ? embedLink : embedLink.substring(0, pipeIndex);

		const hashIndex = actualLink.indexOf("#");
		if (hashIndex === -1) return null;

		let notePath = actualLink.substring(0, hashIndex).trim();
		const ref = actualLink.substring(hashIndex + 1).trim();

		if (!ref) return null;
		if (ref.startsWith("^")) return null;

		if (!notePath) {
			notePath = ctx.sourcePath;
		}

		const file = this.plugin.app.metadataCache.getFirstLinkpathDest(notePath, ctx.sourcePath);
		if (!file) return null;

		const subpath = `#${ref}`;
		const [start, end] = getLineRangeFromRef(file.path, subpath, this.plugin.app);
		if (!start || !end) return null;

		const editableStart = start + 1;
		if (editableStart > end) return null;

		return {
			kind: "heading",
			file,
			subpath,
			visibleRange: [start, end],
			editableRange: [editableStart, end],
		};
	}

	private parseInlineEmbed(embedEl: HTMLElement, ctx: MarkdownPostProcessorContext): ParsedInlineEmbed | null {
		if (!this.plugin.settings.inlineEditEnabled) return null;

		if (this.plugin.settings.inlineEditBlock) {
			const parsedBlock = this.parseBlockIdEmbed(embedEl, ctx);
			if (parsedBlock) {
				const [start, end] = parsedBlock.range;
				const rangeEditable: [number, number] = parsedBlock.isRange ? [start, end - 1] : [start, end];
				if (rangeEditable[1] < rangeEditable[0]) return null;

				return {
					kind: parsedBlock.isRange ? "range" : "block",
					file: parsedBlock.file,
					subpath: parsedBlock.subpath,
					visibleRange: parsedBlock.range,
					editableRange: rangeEditable,
				};
			}
		}

		if (this.plugin.settings.inlineEditHeading) {
			return this.parseHeadingEmbed(embedEl, ctx);
		}

		return null;
	}

	private prepareEmbedShell(embedEl: HTMLElement): { hostEl: HTMLElement; cleanup: () => void } {
		embedEl.addClass(INLINE_EDIT_ACTIVE_CLASS);

		const contentEl = embedEl.querySelector<HTMLElement>(".markdown-embed-content");
		const hostParent = contentEl ?? embedEl;
		const hostEl = hostParent.createDiv({ cls: INLINE_EDIT_HOST_CLASS });

		const cleanup = () => {
			try {
				hostEl.detach();
			} catch {
				// ignore
			}

			try {
				embedEl.removeClass(INLINE_EDIT_ACTIVE_CLASS);
			} catch {
				// ignore
			}
		};

		return { hostEl, cleanup };
	}

	private attachHostRemeasure(hostEl: HTMLElement, hostView?: MarkdownView): () => void {
		const hostCm: any = hostView?.editor?.cm as any;
		if (!hostCm?.requestMeasure) return () => {};

		let raf: number | null = null;
		const schedule = () => {
			if (raf !== null) return;
			raf = window.requestAnimationFrame(() => {
				raf = null;
				try {
					hostCm.requestMeasure();
				} catch {
					// ignore
				}
			});
		};

		let observer: ResizeObserver | null = null;
		if (typeof ResizeObserver !== "undefined") {
			try {
				observer = new ResizeObserver(() => schedule());
				observer.observe(hostEl);
			} catch {
				observer = null;
			}
		}

		schedule();
		window.setTimeout(schedule, 50);

		return () => {
			if (raf !== null) {
				try {
					window.cancelAnimationFrame(raf);
				} catch {
					// ignore
				}
			}

			if (observer) {
				try {
					observer.disconnect();
				} catch {
					// ignore
				}
			}
		};
	}

	private async processInlineEmbed(
		embedEl: HTMLElement,
		ctx: MarkdownPostProcessorContext,
		hostView?: MarkdownView
	): Promise<void> {
		if (!this.isInLivePreview(embedEl)) {
			this.debugSkip(embedEl, "skip:not-live-preview");
			return;
		}
		if (this.leaves.isNestedWithinEmbed(embedEl)) {
			this.debugSkip(embedEl, "skip:nested");
			return;
		}
		if (this.leaves.isLegacyDoubleBangEmbed(embedEl)) {
			this.debugSkip(embedEl, "skip:legacy-doublebang");
			return;
		}

		this.cleanupOrphanedShell(embedEl);

		if (embedEl.querySelector(`.${EmbedLeafManager.INLINE_EDIT_ROOT_CLASS}`)) {
			this.debugSkip(embedEl, "skip:already-mounted");
			return;
		}
		if (this.pendingEmbeds.has(embedEl)) {
			this.debugSkip(embedEl, "skip:pending");
			return;
		}

		const parsed = this.parseInlineEmbed(embedEl, ctx);
		if (!parsed) {
			this.debugSkip(embedEl, "skip:parse-failed", {
				src: embedEl.getAttribute("src"),
				alt: embedEl.getAttribute("alt"),
				ctxSourcePath: ctx.sourcePath,
			});
			return;
		}

		this.pendingEmbeds.add(embedEl);

		const { hostEl, cleanup } = this.prepareEmbedShell(embedEl);

		try {
			this.debugLog("mount:start", {
				src: embedEl.getAttribute("src"),
				kind: parsed.kind,
				filePath: parsed.file.path,
				subpath: parsed.subpath,
				visibleRange: parsed.visibleRange,
				editableRange: parsed.editableRange,
			});

			const embed = await this.leaves.createEmbedLeaf({
				containerEl: hostEl,
				file: parsed.file,
				sourcePath: ctx.sourcePath,
				subpath: parsed.subpath,
			});

			const stopPropagation = (event: Event) => {
				event.stopPropagation();
			};
			const focusEditor = (event: Event) => {
				event.stopPropagation();
				embed.view.editor?.focus();
			};

			hostEl.addEventListener("mousedown", focusEditor);
			hostEl.addEventListener("click", focusEditor);
			hostEl.addEventListener("keydown", stopPropagation);

			const stopRemeasure = this.attachHostRemeasure(hostEl, hostView);

			embed.restore = () => {
				try {
					stopRemeasure();
				} catch {
					// ignore
				}

				try {
					hostEl.removeEventListener("mousedown", focusEditor);
				} catch {
					// ignore
				}
				try {
					hostEl.removeEventListener("click", focusEditor);
				} catch {
					// ignore
				}
				try {
					hostEl.removeEventListener("keydown", stopPropagation);
				} catch {
					// ignore
				}

				cleanup();
			};

			if (!hostEl.isConnected) {
				this.leaves.detach(embed);
				return;
			}

			this.leaves.reparent(hostEl, embed.view.containerEl);

			const cm = (await this.waitForEditorView(embed.view)) as any;
			if (cm) {
				try {
					cm.contentDOM.contentEditable = "true";
				} catch {
					// ignore
				}

				try {
					cm.requestMeasure?.();
				} catch {
					// ignore
				}

				cm.dispatch({
					annotations: [
						contentRange.of(parsed.visibleRange),
						editableRange.of(parsed.editableRange),
					],
				});

				try {
					const startLine = Math.max(0, parsed.editableRange[0] - 1);
					embed.view.editor?.setCursor({ line: startLine, ch: 0 });
					embed.view.editor?.scrollIntoView({ from: { line: startLine, ch: 0 }, to: { line: startLine, ch: 0 } }, true);
				} catch {
					// ignore
				}
			} else {
				this.debugLog("mount:no-cm", embedEl.getAttribute("src"));
			}

			try {
				(hostView?.editor?.cm as any)?.requestMeasure?.();
			} catch {
				// ignore
			}

			this.debugLog("mount:done", embedEl.getAttribute("src"));
		} catch (error) {
			cleanup();
			console.error("InlineEditEngine: failed to mount embed editor", error);
		} finally {
			this.pendingEmbeds.delete(embedEl);
		}
	}
}
