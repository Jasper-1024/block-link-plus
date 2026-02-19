import type BlockLinkPlus from "../../main";
import { StateEffect } from "@codemirror/state";
import {
	MarkdownPostProcessorContext,
	MarkdownRenderChild,
	MarkdownRenderer,
	MarkdownView,
	TFile,
	editorLivePreviewField,
} from "obsidian";
import { around } from "monkey-around";
import {
	editBlockExtensions,
	contentRange,
	editableRange,
	frontmatterFacet,
	hideLine,
	selectiveLinesFacet,
} from "shared/utils/codemirror/selectiveEditor";
import { getLineRangeFromRef } from "shared/utils/obsidian";
import { EmbedLeafManager } from "./EmbedLeafManager";
import { FocusTracker } from "./FocusTracker";

const INLINE_EDIT_ACTIVE_CLASS = "blp-inline-edit-active";
const INLINE_EDIT_HOST_CLASS = "blp-inline-edit-host";
const LIVE_PREVIEW_GRACE_MS = 5000;
const READING_RANGE_ACTIVE_CLASS = "blp-reading-range-active";
const LIVE_PREVIEW_RANGE_ACTIVE_CLASS = "blp-live-preview-range-active";
const READING_RANGE_HOST_CLASS = "blp-reading-range-host";
const LIVE_PREVIEW_RANGE_HOST_CLASS = "blp-live-preview-range-host";

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
	kind: "block" | "heading" | "range" | "file";
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
	private commandRoutingDepth = 0;
	private readonly commandRoutingUninstallers: Array<() => void> = [];
	private readonly readingRangeEmbedsByPath = new Map<string, Set<ReadingRangeEmbedChild>>();
	private readonly livePreviewRangeEmbedsByPath = new Map<string, Set<LivePreviewRangeEmbedChild>>();
	private readonly readingRangeDebounceTimers = new Map<string, number>();
	private readonly readingRangeChildByEmbed = new WeakMap<HTMLElement, ReadingRangeEmbedChild>();
	private readonly readingRangeChildren = new Set<ReadingRangeEmbedChild>();
	private readonly livePreviewRangeChildByEmbed = new WeakMap<HTMLElement, LivePreviewRangeEmbedChild>();
	private readonly livePreviewRangeChildren = new Set<LivePreviewRangeEmbedChild>();
	private readingRangeObserver: MutationObserver | null = null;
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

		this.installCommandRouting();
		this.installFocusTracking();
		this.installReadingRangeRendering();

		this.plugin.registerEvent(
			this.plugin.app.workspace.on("layout-change", () => {
				if (!this.loaded) return;
				if (!this.isInlineEditActive()) {
					this.disconnectAllObservers();
					this.leaves.cleanup();
					this.focus.cleanup();
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
		this.uninstallCommandRouting();
		this.cleanupReadingRangeRendering();
		this.focus.cleanup();
		this.leaves.cleanup();
	}

	isLoaded(): boolean {
		return this.loaded;
	}

	/**
	 * File Outliner View renders markdown outside Live Preview. This opt-in API allows the outliner
	 * surface to mount an inline embed editor on demand (e.g. for `![[note#^id-id]]`).
	 *
	 * Safety: guarded by a `.blp-file-outliner-view` DOM check so normal MarkdownView preview
	 * cannot accidentally trigger embed editing.
	 */
	async mountInlineEmbedInOutliner(embedEl: HTMLElement, sourcePath: string): Promise<boolean> {
		if (!this.loaded) return false;
		if (!this.isInlineEditActive()) return false;
		if (!embedEl?.isConnected) return false;
		if (!embedEl.classList.contains("internal-embed") || !embedEl.classList.contains("markdown-embed")) return false;
		if (!embedEl.closest(".blp-file-outliner-view")) return false;
		// Never mount in Live Preview (InlineEditEngine already owns that surface).
		if (this.isInLivePreview(embedEl)) return false;

		// If already mounted, treat as success and focus the existing editor.
		const existingRoot = embedEl.querySelector<HTMLElement>(`.${EmbedLeafManager.INLINE_EDIT_ROOT_CLASS}`);
		if (existingRoot) {
			try {
				this.leaves.getEmbedFromElement(existingRoot)?.view.editor?.focus();
			} catch {
				// ignore
			}
			return true;
		}
		if (this.pendingEmbeds.has(embedEl)) return false;

		const ctx = {
			sourcePath,
			addChild: () => {},
		} as unknown as MarkdownPostProcessorContext;

		await this.mountInlineEmbedCore(embedEl, ctx, { requireLivePreview: false, origin: "outliner" });

		const root = embedEl.querySelector<HTMLElement>(`.${EmbedLeafManager.INLINE_EDIT_ROOT_CLASS}`);
		if (!root) return false;

		try {
			this.leaves.getEmbedFromElement(root)?.view.editor?.focus();
		} catch {
			// ignore
		}

		return true;
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

	private ensureEmbedEditorExtensions(cm: any): void {
		// Embed leaves are created via detached WorkspaceLeafs; editor extensions registered through
		// Obsidian's workspace pipeline may not be present. Ensure our selective-editor extensions
		// exist so contentRange/editableRange annotations can hide the outliner system tail lines.
		if (!cm?.state || typeof cm.dispatch !== "function") return;

		let hasHideLine = false;
		try {
			// `hideLine` is part of `editBlockExtensions()`; if it's already present, do nothing.
			hasHideLine = cm.state.field(hideLine, false) !== undefined;
		} catch {
			hasHideLine = false;
		}

		try {
			(cm as any).__blpInlineEditHasHideLine = hasHideLine;
		} catch {
			// ignore
		}

		if (hasHideLine) return;

		try {
			// Detached MarkdownView leaves can carry CM6 transaction filters that drop custom effects.
			// Bypass filters so our config extension is actually applied.
			cm.dispatch({ filter: false, effects: StateEffect.appendConfig.of(editBlockExtensions()) });
		} catch {
			// ignore
		}

		try {
			(cm as any).__blpInlineEditHasHideLine = cm.state.field(hideLine, false) !== undefined;
		} catch {
			// ignore
		}
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
			this.focus.cleanup();
			return;
		}

		this.refreshLivePreviewObservers();
	}

	private installFocusTracking(): void {
		this.plugin.registerDomEvent(document, "focusin", (event) => {
			const target = event.target;
			if (!(target instanceof HTMLElement)) return;

			const embed = this.leaves.getEmbedFromElement(target);
			if (embed) {
				this.focus.setFocused(embed);
			}
		});

		this.plugin.registerDomEvent(document, "focusout", (event) => {
			const next = (event as FocusEvent).relatedTarget;
			if (next instanceof HTMLElement) {
				const embed = this.leaves.getEmbedFromElement(next);
				if (embed) {
					this.focus.setFocused(embed);
					return;
				}
			}

			this.focus.setFocused(null);
		});
	}

	private installReadingRangeRendering(): void {
		// Reading-mode: `^id-id` is a BLP-extended syntax and MUST render even when inline edit is disabled.
		this.plugin.registerMarkdownPostProcessor((element, ctx) => {
			const embeds = element.matches?.(".internal-embed.markdown-embed")
				? [element as HTMLElement]
				: Array.from(element.querySelectorAll<HTMLElement>(".internal-embed.markdown-embed"));

			for (const embedEl of embeds) {
				this.ensureReadingRangeEmbedChild(embedEl, ctx.sourcePath, "postprocessor");
				this.ensureLivePreviewRangeEmbedChild(embedEl, ctx.sourcePath, "postprocessor");
			}
		});

		this.plugin.registerEvent(
			this.plugin.app.vault.on("modify", (file) => {
				if (!this.loaded) return;
				if (!(file instanceof TFile)) return;
				this.scheduleReadingRangeRefresh(file.path);
			})
		);

		this.plugin.registerEvent(
			(this.plugin.app.metadataCache as any).on("changed", (file: TFile) => {
				if (!this.loaded) return;
				if (!(file instanceof TFile)) return;
				this.scheduleReadingRangeRefresh(file.path);
			})
		);

		// Some preview embeds are inserted asynchronously after the markdown post processor runs,
		// so we also observe the workspace DOM and attach range renderers to newly added embeds.
		this.installReadingRangeObserver();
	}

	private cleanupReadingRangeRendering(): void {
		if (this.readingRangeObserver) {
			try {
				this.readingRangeObserver.disconnect();
			} catch {
				// ignore
			}
			this.readingRangeObserver = null;
		}

		for (const child of Array.from(this.readingRangeChildren)) {
			try {
				child.unload();
			} catch {
				// ignore
			}
		}
		this.readingRangeChildren.clear();

		for (const child of Array.from(this.livePreviewRangeChildren)) {
			try {
				child.unload();
			} catch {
				// ignore
			}
		}
		this.livePreviewRangeChildren.clear();

		for (const timer of this.readingRangeDebounceTimers.values()) {
			try {
				window.clearTimeout(timer);
			} catch {
				// ignore
			}
		}
		this.readingRangeDebounceTimers.clear();
		this.readingRangeEmbedsByPath.clear();
		this.livePreviewRangeEmbedsByPath.clear();
	}

	private installReadingRangeObserver(): void {
		if (this.readingRangeObserver) return;

		const root = this.plugin.app.workspace.containerEl;
		if (!root) return;

		const observer = new MutationObserver((mutations) => {
			for (const mutation of mutations) {
				for (const removed of Array.from(mutation.removedNodes)) {
					if (!(removed instanceof HTMLElement)) continue;
					this.cleanupReadingRangeChildrenInNode(removed);
				}

				for (const added of Array.from(mutation.addedNodes)) {
					if (!(added instanceof HTMLElement)) continue;
					this.scanReadingRangeEmbedsInNode(added, null, "mutation");
				}
			}
		});

		try {
			observer.observe(root, { childList: true, subtree: true });
			this.readingRangeObserver = observer;
		} catch {
			// ignore
			return;
		}

		// Catch already-rendered embeds (e.g. existing Reading views on startup).
		this.scanReadingRangeEmbedsInNode(root, null, "initial-scan");
	}

	private scanReadingRangeEmbedsInNode(node: HTMLElement, sourcePath: string | null, origin: string): void {
		const hasAnyEmbeds =
			node.matches?.(".internal-embed.markdown-embed") || node.querySelector?.(".internal-embed.markdown-embed") !== null;
		if (!hasAnyEmbeds) return;

		const embeds = node.matches?.(".internal-embed.markdown-embed")
			? [node]
			: Array.from(node.querySelectorAll<HTMLElement>(".internal-embed.markdown-embed"));

		for (const embedEl of embeds) {
			this.ensureReadingRangeEmbedChild(embedEl, sourcePath, origin);
			this.ensureLivePreviewRangeEmbedChild(embedEl, sourcePath, origin);
		}
	}

	private cleanupReadingRangeChildrenInNode(node: HTMLElement): void {
		const hasAnyEmbeds =
			node.matches?.(".internal-embed.markdown-embed") || node.querySelector?.(".internal-embed.markdown-embed") !== null;
		if (!hasAnyEmbeds) return;

		const embeds = node.matches?.(".internal-embed.markdown-embed")
			? [node]
			: Array.from(node.querySelectorAll<HTMLElement>(".internal-embed.markdown-embed"));

		for (const embedEl of embeds) {
			const readingChild = this.readingRangeChildByEmbed.get(embedEl);
			if (readingChild) {
				this.debugLog("reading:unload", embedEl.getAttribute("src"));
				try {
					readingChild.unload();
				} catch {
					// ignore
				} finally {
					this.readingRangeChildByEmbed.delete(embedEl);
					this.readingRangeChildren.delete(readingChild);
				}
			}

			const liveChild = this.livePreviewRangeChildByEmbed.get(embedEl);
			if (liveChild) {
				this.debugLog("live-preview:unload", embedEl.getAttribute("src"));
				try {
					liveChild.unload();
				} catch {
					// ignore
				} finally {
					this.livePreviewRangeChildByEmbed.delete(embedEl);
					this.livePreviewRangeChildren.delete(liveChild);
				}
			}
		}
	}

	private getSourcePathForEmbedElement(embedEl: HTMLElement): string | null {
		let sourcePath: string | null = null;

		try {
			this.plugin.app.workspace.iterateAllLeaves((leaf) => {
				if (sourcePath) return;
				const view = leaf.view;
				if (!(view instanceof MarkdownView)) return;
				if (!view.file) return;
				if (!view.containerEl?.contains(embedEl)) return;
				sourcePath = view.file.path;
			});
		} catch {
			// ignore
		}

		return sourcePath;
	}

	private ensureReadingRangeEmbedChild(embedEl: HTMLElement, sourcePath: string | null, origin: string): void {
		if (this.readingRangeChildByEmbed.has(embedEl)) return;
		if (!embedEl.isConnected) return;
		if (embedEl.closest(".markdown-source-view")) {
			this.debugSkip(embedEl, "reading:skip:source-view", { origin });
			return;
		}
		if (embedEl.classList.contains(INLINE_EDIT_ACTIVE_CLASS)) {
			this.debugSkip(embedEl, "reading:skip:inline-edit-active", { origin });
			return;
		}
		if (this.leaves.isNestedWithinEmbed(embedEl)) {
			this.debugSkip(embedEl, "reading:skip:nested", { origin });
			return;
		}
		if (embedEl.classList.contains(READING_RANGE_ACTIVE_CLASS)) return;

		const resolvedSourcePath =
			sourcePath ?? this.getSourcePathForEmbedElement(embedEl) ?? this.plugin.app.workspace.getActiveFile()?.path ?? "";

		const parsed = this.parseRangeEmbedForReading(embedEl, resolvedSourcePath);
		if (!parsed) {
			const src = embedEl.getAttribute("src") ?? "";
			const alt = embedEl.getAttribute("alt") ?? "";
			if (/#\^([a-z0-9_]+)-\1$/i.test(src.split("|")[0]) || /\^([a-z0-9_]+)-\1$/i.test(alt)) {
				this.debugSkip(embedEl, "reading:skip:parse-failed", {
					origin,
					src,
					alt,
					sourcePath: resolvedSourcePath,
				});
			}
			return;
		}

		this.debugLog("reading:attach", {
			origin,
			src: embedEl.getAttribute("src"),
			alt: embedEl.getAttribute("alt"),
			sourcePath: resolvedSourcePath,
			file: parsed.file.path,
			subpath: parsed.subpath,
		});

		const child = new ReadingRangeEmbedChild({
			plugin: this.plugin,
			embedEl,
			file: parsed.file,
			subpath: parsed.subpath,
			registerEmbed: this.registerReadingRangeEmbed.bind(this),
			unregisterEmbed: this.unregisterReadingRangeEmbed.bind(this),
		});

		this.readingRangeChildByEmbed.set(embedEl, child);
		this.readingRangeChildren.add(child);
		child.register(() => {
			this.readingRangeChildren.delete(child);
			this.readingRangeChildByEmbed.delete(embedEl);
		});

		child.load();
	}

	private ensureLivePreviewRangeEmbedChild(embedEl: HTMLElement, sourcePath: string | null, origin: string): void {
		if (this.livePreviewRangeChildByEmbed.has(embedEl)) return;
		if (!embedEl.isConnected) return;
		if (!embedEl.closest(".markdown-source-view")) {
			this.debugSkip(embedEl, "live-preview:skip:not-source-view", { origin });
			return;
		}
		if (this.leaves.isNestedWithinEmbed(embedEl)) {
			this.debugSkip(embedEl, "live-preview:skip:nested", { origin });
			return;
		}
		if (embedEl.classList.contains(LIVE_PREVIEW_RANGE_ACTIVE_CLASS)) return;
		if (embedEl.classList.contains(INLINE_EDIT_ACTIVE_CLASS)) return;

		const resolvedSourcePath =
			sourcePath ?? this.getSourcePathForEmbedElement(embedEl) ?? this.plugin.app.workspace.getActiveFile()?.path ?? "";

		const parsed = this.parseRangeEmbedForReading(embedEl, resolvedSourcePath);
		if (!parsed) {
			const src = embedEl.getAttribute("src") ?? "";
			const alt = embedEl.getAttribute("alt") ?? "";
			if (/#\^([a-z0-9_]+)-\1$/i.test(src.split("|")[0]) || /\^([a-z0-9_]+)-\1$/i.test(alt)) {
				this.debugSkip(embedEl, "live-preview:skip:parse-failed", {
					origin,
					src,
					alt,
					sourcePath: resolvedSourcePath,
				});
			}
			return;
		}

		this.debugLog("live-preview:attach", {
			origin,
			src: embedEl.getAttribute("src"),
			alt: embedEl.getAttribute("alt"),
			sourcePath: resolvedSourcePath,
			file: parsed.file.path,
			subpath: parsed.subpath,
		});

		const child = new LivePreviewRangeEmbedChild({
			plugin: this.plugin,
			embedEl,
			file: parsed.file,
			subpath: parsed.subpath,
			registerEmbed: this.registerLivePreviewRangeEmbed.bind(this),
			unregisterEmbed: this.unregisterLivePreviewRangeEmbed.bind(this),
		});

		this.livePreviewRangeChildByEmbed.set(embedEl, child);
		this.livePreviewRangeChildren.add(child);
		child.register(() => {
			this.livePreviewRangeChildren.delete(child);
			this.livePreviewRangeChildByEmbed.delete(embedEl);
		});

		child.load();
	}

	private registerReadingRangeEmbed(filePath: string, child: ReadingRangeEmbedChild): void {
		let set = this.readingRangeEmbedsByPath.get(filePath);
		if (!set) {
			set = new Set();
			this.readingRangeEmbedsByPath.set(filePath, set);
		}
		set.add(child);
	}

	private unregisterReadingRangeEmbed(filePath: string, child: ReadingRangeEmbedChild): void {
		const set = this.readingRangeEmbedsByPath.get(filePath);
		if (!set) return;

		set.delete(child);
		if (set.size > 0) return;

		this.readingRangeEmbedsByPath.delete(filePath);
		if (this.livePreviewRangeEmbedsByPath.has(filePath)) return;
		const timer = this.readingRangeDebounceTimers.get(filePath);
		if (timer !== undefined) {
			try {
				window.clearTimeout(timer);
			} catch {
				// ignore
			}
			this.readingRangeDebounceTimers.delete(filePath);
		}
	}

	private registerLivePreviewRangeEmbed(filePath: string, child: LivePreviewRangeEmbedChild): void {
		let set = this.livePreviewRangeEmbedsByPath.get(filePath);
		if (!set) {
			set = new Set();
			this.livePreviewRangeEmbedsByPath.set(filePath, set);
		}
		set.add(child);
	}

	private unregisterLivePreviewRangeEmbed(filePath: string, child: LivePreviewRangeEmbedChild): void {
		const set = this.livePreviewRangeEmbedsByPath.get(filePath);
		if (!set) return;

		set.delete(child);
		if (set.size > 0) return;

		this.livePreviewRangeEmbedsByPath.delete(filePath);
		if (this.readingRangeEmbedsByPath.has(filePath)) return;

		const timer = this.readingRangeDebounceTimers.get(filePath);
		if (timer !== undefined) {
			try {
				window.clearTimeout(timer);
			} catch {
				// ignore
			}
			this.readingRangeDebounceTimers.delete(filePath);
		}
	}

	private scheduleReadingRangeRefresh(filePath: string, delayMs = 200): void {
		if (!this.readingRangeEmbedsByPath.has(filePath) && !this.livePreviewRangeEmbedsByPath.has(filePath)) return;

		const existing = this.readingRangeDebounceTimers.get(filePath);
		if (existing !== undefined) {
			try {
				window.clearTimeout(existing);
			} catch {
				// ignore
			}
		}

		const timer = window.setTimeout(() => {
			this.readingRangeDebounceTimers.delete(filePath);

			const readingEmbeds = this.readingRangeEmbedsByPath.get(filePath);
			if (readingEmbeds) {
				for (const child of Array.from(readingEmbeds)) {
					void child.render();
				}
			}

			const livePreviewEmbeds = this.livePreviewRangeEmbedsByPath.get(filePath);
			if (livePreviewEmbeds) {
				for (const child of Array.from(livePreviewEmbeds)) {
					void child.render();
				}
			}
		}, delayMs);

		this.readingRangeDebounceTimers.set(filePath, timer);
	}

	private installCommandRouting(): void {
		const uninstallers: Array<() => void> = [];

		try {
			const uninstallExecuteCommand = around(this.plugin.app.commands as any, {
				executeCommand: (old: any) => {
					const engine = this;
					return function (command: any, ...args: any[]) {
						const focusedEmbed = engine.focus.getFocused();
						const editor = focusedEmbed?.view?.editor;

						const isEditorCommand =
							typeof command?.editorCallback === "function" ||
							typeof command?.editorCheckCallback === "function" ||
							(typeof command?.id === "string" && command.id.startsWith("editor:"));

						if (focusedEmbed && editor && isEditorCommand) {
							if (typeof command?.editorCheckCallback === "function") {
								try {
									return command.editorCheckCallback(false, editor, focusedEmbed.view);
								} catch {
									// ignore and fallback
								}
							}

							if (typeof command?.editorCallback === "function") {
								try {
									return command.editorCallback(editor, focusedEmbed.view);
								} catch {
									// ignore and fallback
								}
							}

							engine.commandRoutingDepth += 1;
							try {
								return old.call(this, command, ...args);
							} finally {
								engine.commandRoutingDepth -= 1;
							}
						}

						return old.call(this, command, ...args);
					};
				},
			});

			uninstallers.push(uninstallExecuteCommand);
		} catch (error) {
			console.error("InlineEditEngine: failed to patch commands.executeCommand", error);
		}

		try {
			const uninstallGetActiveView = around(this.plugin.app.workspace as any, {
				getActiveViewOfType: (old: any) => {
					const engine = this;
					return function (type: any) {
						if (engine.commandRoutingDepth > 0) {
							const focusedEmbed = engine.focus.getFocused();
							if (focusedEmbed && focusedEmbed.view instanceof type) {
								return focusedEmbed.view;
							}
						}

						return old.call(this, type);
					};
				},
			});

			uninstallers.push(uninstallGetActiveView);
		} catch (error) {
			console.error("InlineEditEngine: failed to patch workspace.getActiveViewOfType", error);
		}

		try {
			const uninstallActiveLeaf = this.patchWorkspaceActiveLeafGetter();
			uninstallers.push(uninstallActiveLeaf);
		} catch (error) {
			console.error("InlineEditEngine: failed to patch workspace.activeLeaf", error);
		}

		if (uninstallers.length > 0) {
			this.commandRoutingUninstallers.push(...uninstallers);
		}
	}

	private patchWorkspaceActiveLeafGetter(): () => void {
		const workspace = this.plugin.app.workspace as any;
		const key = "activeLeaf";

		const hadOwn = Object.prototype.hasOwnProperty.call(workspace, key);
		const originalOwnDescriptor = Object.getOwnPropertyDescriptor(workspace, key);

		const originalDescriptor = originalOwnDescriptor;
		if (!originalDescriptor) return () => {};
		if (originalDescriptor.configurable === false) return () => {};

		let storedValue = "value" in originalDescriptor ? originalDescriptor.value : workspace[key];
		const originalGetter = originalDescriptor.get;
		const originalSetter = originalDescriptor.set;

		const engine = this;

		Object.defineProperty(workspace, key, {
			configurable: true,
			enumerable: originalDescriptor.enumerable ?? true,
			get() {
				if (engine.commandRoutingDepth > 0) {
					const focusedEmbed = engine.focus.getFocused();
					if (focusedEmbed?.leaf) return focusedEmbed.leaf;
				}

				if (typeof originalGetter === "function") {
					return originalGetter.call(this);
				}

				return storedValue;
			},
			set(value) {
				if (typeof originalSetter === "function") {
					originalSetter.call(this, value);
					return;
				}

				storedValue = value;
			},
		});

		return () => {
			try {
				const currentStored = (() => {
					if (typeof originalGetter === "function") {
						try {
							return originalGetter.call(workspace);
						} catch {
							return storedValue;
						}
					}
					return storedValue;
				})();

				if (hadOwn && originalOwnDescriptor) {
					if ("value" in originalOwnDescriptor) {
						Object.defineProperty(workspace, key, {
							...originalOwnDescriptor,
							value: currentStored,
						});
					} else {
						Object.defineProperty(workspace, key, originalOwnDescriptor);
					}
					return;
				}

				delete workspace[key];
			} catch {
				// ignore
			}
		};
	}

	private uninstallCommandRouting(): void {
		const uninstallers = this.commandRoutingUninstallers.splice(0);
		for (const uninstall of uninstallers) {
			try {
				uninstall();
			} catch {
				// ignore
			}
		}
		this.commandRoutingDepth = 0;
	}

	private cleanupHiddenEmbeds(): void {
		const embeds = this.leaves.getActiveEmbeds();
		for (const embed of embeds) {
			if (!embed.containerEl.isConnected || !embed.containerEl.isShown()) {
				if (this.focus.getFocused() === embed) {
					this.focus.setFocused(null);
				}
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
		timeoutMs = 2000
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
		return embedEl.closest(".markdown-source-view") !== null;
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
				let subpath = match[2].trim();
				if (subpath.startsWith("#")) {
					subpath = subpath.slice(1).trim();
				}
				embedLink = `${match[1].trim()}#${subpath}`;
			}
		}

		return embedLink;
	}

	private parseRangeEmbedForReading(
		embedEl: HTMLElement,
		sourcePath: string
	): { file: TFile; subpath: string } | null {
		const embedLink = this.getInternalEmbedLink(embedEl);
		if (!embedLink) return null;

		const pipeIndex = embedLink.indexOf("|");
		const actualLink = pipeIndex === -1 ? embedLink : embedLink.substring(0, pipeIndex);

		const hashIndex = actualLink.indexOf("#");
		if (hashIndex === -1) return null;

		let notePath = actualLink.substring(0, hashIndex).trim();
		let ref = actualLink.substring(hashIndex + 1).trim();

		if (ref.startsWith("#")) {
			ref = ref.slice(1).trim();
		}

		if (!ref.startsWith("^")) return null;
		if (!/^\^[a-zA-Z0-9_-]+$/.test(ref)) return null;
		if (!/^\^([a-z0-9_]+)-\1$/i.test(ref)) return null;

		let file: TFile | null = null;
		if (!notePath) {
			const current = this.plugin.app.vault.getAbstractFileByPath(sourcePath);
			if (current instanceof TFile) {
				file = current;
			}
		} else {
			file = this.plugin.app.metadataCache.getFirstLinkpathDest(notePath, sourcePath);
		}

		if (!file) return null;

		return { file, subpath: `#${ref}` };
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

	private parseFileEmbed(embedEl: HTMLElement, ctx: MarkdownPostProcessorContext): ParsedInlineEmbed | null {
		const embedLink = this.getInternalEmbedLink(embedEl);
		if (!embedLink) return null;

		const pipeIndex = embedLink.indexOf("|");
		const actualLink = pipeIndex === -1 ? embedLink : embedLink.substring(0, pipeIndex);

		const hashIndex = actualLink.indexOf("#");
		if (hashIndex !== -1) return null;

		let notePath = actualLink.trim();
		if (!notePath) {
			notePath = ctx.sourcePath;
		}

		const file = this.plugin.app.metadataCache.getFirstLinkpathDest(notePath, ctx.sourcePath);
		if (!file) return null;

		const maxLine = Number.MAX_SAFE_INTEGER;
		return {
			kind: "file",
			file,
			subpath: "",
			visibleRange: [1, maxLine],
			editableRange: [1, maxLine],
		};
	}

	private parseInlineEmbed(embedEl: HTMLElement, ctx: MarkdownPostProcessorContext): ParsedInlineEmbed | null {
		if (!this.plugin.settings.inlineEditEnabled) return null;

		if (this.plugin.settings.inlineEditBlock) {
			const parsedBlock = this.parseBlockIdEmbed(embedEl, ctx);
			if (parsedBlock) {
				return {
					kind: parsedBlock.isRange ? "range" : "block",
					file: parsedBlock.file,
					subpath: parsedBlock.subpath,
					visibleRange: parsedBlock.range,
					editableRange: parsedBlock.range,
				};
			}
		}

		if (this.plugin.settings.inlineEditHeading) {
			const parsedHeading = this.parseHeadingEmbed(embedEl, ctx);
			if (parsedHeading) return parsedHeading;
		}

		if (this.plugin.settings.inlineEditFile) {
			const parsedFile = this.parseFileEmbed(embedEl, ctx);
			if (parsedFile) return parsedFile;
		}

		return null;
	}

	private cleanupLegacyMultilineEmbed(embedEl: HTMLElement): void {
		if (!embedEl.classList.contains("mk-multiline-block") && !embedEl.querySelector(".mk-multiline-react-container")) {
			return;
		}

		try {
			embedEl.querySelector(".mk-multiline-react-container")?.remove();
		} catch {
			// ignore
		}

		try {
			embedEl.querySelector(".mk-multiline-jump-link")?.remove();
		} catch {
			// ignore
		}

		try {
			embedEl.querySelector(".mk-multiline-external-edit")?.remove();
		} catch {
			// ignore
		}

		try {
			embedEl.querySelector(".mk-floweditor")?.remove();
		} catch {
			// ignore
		}

		try {
			embedEl.classList.remove("mk-multiline-block");
			embedEl.classList.remove("mk-multiline-readonly");
		} catch {
			// ignore
		}

		const nativeContent = embedEl.querySelector<HTMLElement>(".markdown-embed-content");
		if (nativeContent) {
			try {
				nativeContent.style.display = "";
			} catch {
				// ignore
			}
		}

		const nativeLink = embedEl.querySelector<HTMLElement>(".markdown-embed-link");
		if (nativeLink) {
			try {
				nativeLink.style.display = "";
			} catch {
				// ignore
			}
		}
	}

	private getIndentWidth(text: string): number {
		let width = 0;
		for (let i = 0; i < text.length; i++) {
			width += text[i] === "\t" ? 4 : 1;
		}
		return width;
	}

	private stripBlockquotePrefix(line: string, depth: number): { ok: boolean; text: string } {
		if (depth <= 0) return { ok: true, text: line };

		let remaining = line;
		for (let i = 0; i < depth; i++) {
			const match = remaining.match(/^[ \t]*>[ \t]?/);
			if (!match) return { ok: false, text: remaining };
			remaining = remaining.slice(match[0].length);
		}

		return { ok: true, text: remaining };
	}

	private extendListItemBlockEndLine(
		doc: { lines: number; line: (n: number) => { text?: string } },
		visibleStart: number,
		visibleEnd: number
	): number {
		let startText = "";
		try {
			startText = doc.line(visibleStart).text ?? "";
		} catch {
			return visibleEnd;
		}

		const listItemMatch = startText.match(/^((?:[ \t]*>[ \t]*)*)([ \t]*)(?:[-+*]|\d+[.)])[ \t]+/);
		if (!listItemMatch) return visibleEnd;

		const quoteDepth = (listItemMatch[1].match(/>/g) ?? []).length;
		const baseIndentWidth = this.getIndentWidth(listItemMatch[2] ?? "");

		let endLine = visibleEnd;
		for (let lineNumber = visibleEnd + 1; lineNumber <= doc.lines; lineNumber++) {
			let lineText = "";
			try {
				lineText = doc.line(lineNumber).text ?? "";
			} catch {
				break;
			}

			const stripped = this.stripBlockquotePrefix(lineText, quoteDepth);
			if (!stripped.ok) break;

			const normalized = stripped.text;
			if (normalized.trim() === "") {
				endLine = lineNumber;
				continue;
			}

			const leadingWhitespace = normalized.match(/^[ \t]*/)?.[0] ?? "";
			const indentWidth = this.getIndentWidth(leadingWhitespace);
			if (indentWidth > baseIndentWidth) {
				endLine = lineNumber;
				continue;
			}

			break;
		}

		return endLine;
	}

	private resolveEmbedLineRanges(
		parsed: ParsedInlineEmbed,
		cm: { state?: { doc?: { lines?: number; line?: (n: number) => { text?: string } } } }
	): { visibleRange: [number, number]; editableRange: [number, number] } {
		const doc: any = cm?.state?.doc;
		if (!doc?.line || typeof doc.lines !== "number") {
			return { visibleRange: parsed.visibleRange, editableRange: parsed.editableRange };
		}

		let [start, end] = parsed.visibleRange;
		if (start > end) {
			[start, end] = [end, start];
		}

		const clamp = (line: number) => Math.min(Math.max(1, line), doc.lines);
		const visibleStart = clamp(start);
		const visibleEnd = clamp(end);

		if (parsed.kind !== "range") {
			let [editableStart, editableEnd] = parsed.editableRange;
			if (editableStart > editableEnd) {
				[editableStart, editableEnd] = [editableEnd, editableStart];
			}

			const normalizedEditableStart = clamp(Math.max(visibleStart, editableStart));
			const normalizedEditableEnd = clamp(Math.min(visibleEnd, editableEnd));

			const extendedVisibleEnd =
				parsed.kind === "block"
					? this.extendListItemBlockEndLine(doc, visibleStart, visibleEnd)
					: visibleEnd;
			const extendedEditableEnd =
				parsed.kind === "block" ? Math.max(normalizedEditableEnd, extendedVisibleEnd) : normalizedEditableEnd;

			return {
				visibleRange: [visibleStart, extendedVisibleEnd],
				editableRange: [
					normalizedEditableStart,
					Math.max(normalizedEditableStart, Math.min(extendedVisibleEnd, extendedEditableEnd)),
				],
			};
		}

		const marker = parsed.subpath.startsWith("#") ? parsed.subpath.slice(1) : parsed.subpath;
		const isMarkerLine = (lineNumber: number): boolean => {
			try {
				const text = doc.line(lineNumber).text ?? "";
				return text.trim() === marker;
			} catch {
				return false;
			}
		};

		if (isMarkerLine(visibleEnd)) {
			const editableEnd = clamp(Math.max(visibleStart, visibleEnd - 1));
			return { visibleRange: [visibleStart, visibleEnd], editableRange: [visibleStart, editableEnd] };
		}

		const nextLine = visibleEnd + 1;
		if (nextLine <= doc.lines && isMarkerLine(nextLine)) {
			return { visibleRange: [visibleStart, nextLine], editableRange: [visibleStart, visibleEnd] };
		}

		return { visibleRange: [visibleStart, visibleEnd], editableRange: [visibleStart, visibleEnd] };
	}

	private prepareEmbedShell(embedEl: HTMLElement): { hostEl: HTMLElement; cleanup: () => void } {
		embedEl.addClass(INLINE_EDIT_ACTIVE_CLASS);

		// Inline edit replaces the native embed preview with a detached MarkdownView editor.
		// Detach the preview DOM so system tail lines (Dataview inline fields) cannot leak.
		let nativeContent = embedEl.querySelector<HTMLElement>(".markdown-embed-content");
		let nativeLink = embedEl.querySelector<HTMLElement>(".markdown-embed-link");

		let contentParent = nativeContent?.parentElement ?? null;
		let contentNext = nativeContent?.nextSibling ?? null;
		let linkParent = nativeLink?.parentElement ?? null;
		let linkNext = nativeLink?.nextSibling ?? null;

		const detachNative = (el: HTMLElement | null) => {
			if (!el) return;
			try {
				el.detach();
				return;
			} catch {
				// ignore
			}
			try {
				el.remove();
			} catch {
				// ignore
			}
		};

		const scanAndDetach = () => {
			// Native embed content/link can be created after we start inline edit; keep detaching it.
			const currentContent = embedEl.querySelector<HTMLElement>(".markdown-embed-content");
			if (currentContent) {
				if (!nativeContent) {
					nativeContent = currentContent;
					contentParent = currentContent.parentElement ?? contentParent;
					contentNext = currentContent.nextSibling ?? contentNext;
				}
				detachNative(currentContent);
			}

			const currentLink = embedEl.querySelector<HTMLElement>(".markdown-embed-link");
			if (currentLink) {
				if (!nativeLink) {
					nativeLink = currentLink;
					linkParent = currentLink.parentElement ?? linkParent;
					linkNext = currentLink.nextSibling ?? linkNext;
				}
				detachNative(currentLink);
			}
		};

		scanAndDetach();

		let detachObserver: MutationObserver | null = null;
		try {
			detachObserver = new MutationObserver(() => scanAndDetach());
			detachObserver.observe(embedEl, { childList: true, subtree: true });
		} catch {
			detachObserver = null;
		}

		const hostEl = document.createElement("div");
		hostEl.className = INLINE_EDIT_HOST_CLASS;
		try {
			const parent = contentParent ?? embedEl;
			const before = contentNext && parent.contains(contentNext) ? contentNext : null;
			parent.insertBefore(hostEl, before);
		} catch {
			try {
				embedEl.appendChild(hostEl);
			} catch {
				// ignore
			}
		}

		const cleanup = () => {
			try {
				detachObserver?.disconnect();
			} catch {
				// ignore
			}

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

			try {
				if (nativeLink) {
					const parent = linkParent ?? embedEl;
					const before = linkNext && parent.contains(linkNext) ? linkNext : null;
					parent.insertBefore(nativeLink, before);
				}
			} catch {
				// ignore
			}

			try {
				if (nativeContent) {
					const parent = contentParent ?? embedEl;
					const before = contentNext && parent.contains(contentNext) ? contentNext : null;
					parent.insertBefore(nativeContent, before);
				}
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
		await this.mountInlineEmbedCore(embedEl, ctx, { requireLivePreview: true, hostView, origin: "live-preview" });
	}

	private async mountInlineEmbedCore(
		embedEl: HTMLElement,
		ctx: MarkdownPostProcessorContext,
		opts: { requireLivePreview: boolean; hostView?: MarkdownView; origin: string }
	): Promise<void> {
		if (opts.requireLivePreview && !this.isInLivePreview(embedEl)) {
			this.debugSkip(embedEl, "skip:not-live-preview", { origin: opts.origin });
			return;
		}
		if (this.leaves.isNestedWithinEmbed(embedEl)) {
			this.debugSkip(embedEl, "skip:nested", { origin: opts.origin });
			return;
		}
		if (this.leaves.isLegacyDoubleBangEmbed(embedEl)) {
			this.debugSkip(embedEl, "skip:legacy-doublebang", { origin: opts.origin });
			return;
		}

		this.cleanupOrphanedShell(embedEl);

		if (embedEl.querySelector(`.${EmbedLeafManager.INLINE_EDIT_ROOT_CLASS}`)) {
			this.debugSkip(embedEl, "skip:already-mounted", { origin: opts.origin });
			return;
		}
		if (this.pendingEmbeds.has(embedEl)) {
			this.debugSkip(embedEl, "skip:pending", { origin: opts.origin });
			return;
		}

		const parsed = this.parseInlineEmbed(embedEl, ctx);
		if (!parsed) {
			this.debugSkip(embedEl, "skip:parse-failed", {
				origin: opts.origin,
				src: embedEl.getAttribute("src"),
				alt: embedEl.getAttribute("alt"),
				ctxSourcePath: ctx.sourcePath,
			});
			return;
		}

		if (parsed.kind === "range") {
			// Clear any legacy multiline embed shells and suspend reading-range preview for this embed.
			this.cleanupLegacyMultilineEmbed(embedEl);
			try {
				this.cleanupReadingRangeChildrenInNode(embedEl);
			} catch {
				// ignore
			}
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
				origin: opts.origin,
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

			const stopRemeasure = this.attachHostRemeasure(hostEl, opts.hostView);

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

				this.ensureEmbedEditorExtensions(cm);

				const resolvedRanges = this.resolveEmbedLineRanges(parsed, cm);
				try {
					(cm as any).__blpInlineEditResolvedVisibleRange = resolvedRanges.visibleRange;
					(cm as any).__blpInlineEditResolvedEditableRange = resolvedRanges.editableRange;
				} catch {
					// ignore
				}

				const prevState = cm.state;
				// Set visible/editable line ranges for the embed editor. Use `filter:false` to bypass
				// Obsidian's editor transaction filters, which can otherwise drop custom annotations.
				cm.dispatch({
					filter: false,
					annotations: [
						contentRange.of(resolvedRanges.visibleRange),
						editableRange.of(resolvedRanges.editableRange),
					],
				});

				// Debug-only surface (queried via CDP): whether hideLine is producing any decorations.
				try {
					(cm as any).__blpInlineEditStateChanged = prevState !== cm.state;
					const dec = cm.state.field(hideLine, false);
					let count = 0;
					if (dec && typeof dec.between === "function") {
						dec.between(0, cm.state.doc.length, () => {
							count += 1;
						});
					}
					(cm as any).__blpInlineEditHideLineDecCount = count;
					(cm as any).__blpInlineEditContentRange = cm.state.field(frontmatterFacet, false) ?? null;
					(cm as any).__blpInlineEditEditableRange = cm.state.field(selectiveLinesFacet, false) ?? null;
				} catch {
					// ignore
				}

				try {
					const startLine = Math.max(0, resolvedRanges.editableRange[0] - 1);
					embed.view.editor?.setCursor({ line: startLine, ch: 0 });
					embed.view.editor?.scrollIntoView(
						{ from: { line: startLine, ch: 0 }, to: { line: startLine, ch: 0 } },
						true
					);
				} catch {
					// ignore
				}
			} else {
				this.debugLog("mount:no-cm", embedEl.getAttribute("src"));
			}

			try {
				(opts.hostView?.editor?.cm as any)?.requestMeasure?.();
			} catch {
				// ignore
			}

			this.debugLog("mount:done", embedEl.getAttribute("src"));
		} catch (error) {
			cleanup();
			try {
				(window as any).__blpInlineEditLastError = String((error as any)?.message ?? error);
				(window as any).__blpInlineEditLastErrorStack = String((error as any)?.stack ?? "");
			} catch {
				// ignore
			}
			console.error("InlineEditEngine: failed to mount embed editor", error);
		} finally {
			this.pendingEmbeds.delete(embedEl);
		}
	}
}

type LivePreviewRangeEmbedChildArgs = {
	plugin: BlockLinkPlus;
	embedEl: HTMLElement;
	file: TFile;
	subpath: string;
	registerEmbed: (filePath: string, child: LivePreviewRangeEmbedChild) => void;
	unregisterEmbed: (filePath: string, child: LivePreviewRangeEmbedChild) => void;
};

class LivePreviewRangeEmbedChild extends MarkdownRenderChild {
	private readonly plugin: BlockLinkPlus;
	private readonly embedEl: HTMLElement;
	private readonly file: TFile;
	private readonly subpath: string;
	private readonly registerEmbed: (filePath: string, child: LivePreviewRangeEmbedChild) => void;
	private readonly unregisterEmbed: (filePath: string, child: LivePreviewRangeEmbedChild) => void;
	private renderSeq = 0;
	private mounted = false;
	private activated = false;
	private renderChild: MarkdownRenderChild | null = null;
	private retryTimer: number | null = null;
	private retryCount = 0;
	private nativeContentEl: HTMLElement | null = null;
	private hostEl: HTMLElement | null = null;

	constructor(args: LivePreviewRangeEmbedChildArgs) {
		super(args.embedEl);
		this.plugin = args.plugin;
		this.embedEl = args.embedEl;
		this.file = args.file;
		this.subpath = args.subpath;
		this.registerEmbed = args.registerEmbed;
		this.unregisterEmbed = args.unregisterEmbed;
	}

	onload(): void {
		this.mounted = true;
		void this.render();
	}

	onunload(): void {
		this.mounted = false;
		if (this.retryTimer !== null) {
			try {
				window.clearTimeout(this.retryTimer);
			} catch {
				// ignore
			}
			this.retryTimer = null;
		}

		if (this.activated) {
			try {
				this.embedEl.classList.remove(LIVE_PREVIEW_RANGE_ACTIVE_CLASS);
			} catch {
				// ignore
			}
			try {
				this.unregisterEmbed(this.file.path, this);
			} catch {
				// ignore
			}
		}

		try {
			this.renderChild?.unload();
		} catch {
			// ignore
		}
		this.renderChild = null;

		this.showNativeEmbed();
		this.removeHostEl();
		this.nativeContentEl = null;
	}

	private scheduleRetry(delayMs: number): void {
		if (!this.mounted) return;
		if (this.retryTimer !== null) return;
		if (this.retryCount >= 60) return;

		this.retryCount += 1;
		this.retryTimer = window.setTimeout(() => {
			this.retryTimer = null;
			void this.render();
		}, delayMs);
	}

	private getNativeContentEl(): HTMLElement | null {
		if (this.nativeContentEl?.isConnected) return this.nativeContentEl;

		const el = this.embedEl.querySelector<HTMLElement>(".markdown-embed-content");
		this.nativeContentEl = el;
		return el;
	}

	private getOrCreateHostEl(): HTMLElement | null {
		if (this.hostEl?.isConnected) return this.hostEl;

		const existing = this.embedEl.querySelector<HTMLElement>(`.${LIVE_PREVIEW_RANGE_HOST_CLASS}`);
		if (existing) {
			this.hostEl = existing;
			return existing;
		}

		const host = document.createElement("div");
		host.className = LIVE_PREVIEW_RANGE_HOST_CLASS;
		host.style.display = "none";

		const nativeContent = this.getNativeContentEl();
		const parent = nativeContent?.parentElement ?? this.embedEl;
		try {
			parent.insertBefore(host, nativeContent ?? null);
		} catch {
			try {
				parent.appendChild(host);
			} catch {
				// ignore
			}
		}

		this.hostEl = host;
		return host;
	}

	private showNativeEmbed(): void {
		const nativeContent = this.getNativeContentEl();
		if (nativeContent) {
			try {
				nativeContent.style.display = "";
			} catch {
				// ignore
			}
		}

		if (this.hostEl) {
			try {
				this.hostEl.style.display = "none";
			} catch {
				// ignore
			}
		}
	}

	private showRangeEmbed(): void {
		const nativeContent = this.getNativeContentEl();
		if (nativeContent) {
			try {
				nativeContent.style.display = "none";
			} catch {
				// ignore
			}
		}

		const host = this.getOrCreateHostEl();
		if (host) {
			try {
				host.style.display = "";
			} catch {
				// ignore
			}
		}
	}

	private removeHostEl(): void {
		if (!this.hostEl) return;
		try {
			this.hostEl.remove();
		} catch {
			// ignore
		}
		this.hostEl = null;
	}

	private cleanupLegacyMultilineShell(): void {
		try {
			this.embedEl.querySelector(".mk-multiline-react-container")?.remove();
		} catch {
			// ignore
		}

		try {
			this.embedEl.querySelector(".mk-multiline-jump-link")?.remove();
		} catch {
			// ignore
		}

		try {
			this.embedEl.querySelector(".mk-multiline-external-edit")?.remove();
		} catch {
			// ignore
		}

		try {
			this.embedEl.querySelector(".mk-floweditor")?.remove();
		} catch {
			// ignore
		}

		try {
			this.embedEl.classList.remove("mk-multiline-block");
			this.embedEl.classList.remove("mk-multiline-readonly");
		} catch {
			// ignore
		}

		const nativeContent = this.embedEl.querySelector<HTMLElement>(".markdown-embed-content");
		if (nativeContent) {
			try {
				nativeContent.style.display = "";
			} catch {
				// ignore
			}
		}

		const nativeLink = this.embedEl.querySelector<HTMLElement>(".markdown-embed-link");
		if (nativeLink) {
			try {
				nativeLink.style.display = "";
			} catch {
				// ignore
			}
		}

		this.showNativeEmbed();
	}

	async render(): Promise<void> {
		if (!this.mounted) return;
		if (!this.embedEl.isConnected) {
			this.scheduleRetry(50);
			return;
		}

		// Live Preview (source mode) only.
		if (!this.embedEl.closest(".markdown-source-view")) {
			return;
		}

		// Avoid clobbering an active inline-edit takeover (host + embedded MarkdownView live here).
		if (
			this.embedEl.classList.contains(INLINE_EDIT_ACTIVE_CLASS) ||
			this.embedEl.querySelector(`.${INLINE_EDIT_HOST_CLASS}`) ||
			this.embedEl.querySelector(`.${EmbedLeafManager.INLINE_EDIT_ROOT_CLASS}`)
		) {
			return;
		}

		if (!this.activated) {
			this.activated = true;
			try {
				this.embedEl.classList.add(LIVE_PREVIEW_RANGE_ACTIVE_CLASS);
			} catch {
				// ignore
			}
			this.cleanupLegacyMultilineShell();
			this.registerEmbed(this.file.path, this);
		}

		if (!this.embedEl.classList.contains("is-loaded")) {
			this.scheduleRetry(50);
			return;
		}

		const currentSeq = (this.renderSeq += 1);

		if (typeof MarkdownRenderer?.renderMarkdown !== "function") {
			this.showNativeEmbed();
			return;
		}

		const contentEl = this.getNativeContentEl();
		if (!contentEl) {
			this.scheduleRetry(50);
			return;
		}

		const hostEl = this.getOrCreateHostEl();
		if (!hostEl) {
			this.showNativeEmbed();
			this.scheduleRetry(50);
			return;
		}

		const [start, end] = getLineRangeFromRef(this.file.path, this.subpath, this.plugin.app);
		if (!start || !end) {
			this.showNativeEmbed();
			this.scheduleRetry(100);
			return;
		}

		let raw = "";
		try {
			raw = await this.plugin.app.vault.cachedRead(this.file);
		} catch {
			this.showNativeEmbed();
			this.scheduleRetry(200);
			return;
		}

		if (!this.mounted) return;
		if (currentSeq !== this.renderSeq) return;
		if (
			this.embedEl.classList.contains(INLINE_EDIT_ACTIVE_CLASS) ||
			this.embedEl.querySelector(`.${INLINE_EDIT_HOST_CLASS}`) ||
			this.embedEl.querySelector(`.${EmbedLeafManager.INLINE_EDIT_ROOT_CLASS}`)
		) {
			return;
		}

		const lines = raw.split(/\r?\n/);
		const clamp = (line: number) => Math.min(Math.max(1, line), Math.max(1, lines.length));
		const from = clamp(Math.min(start, end));
		const to = clamp(Math.max(start, end));
		const fragment = lines.slice(from - 1, to).join("\n");

		const wrapper = document.createElement("div");
		wrapper.className = "markdown-preview-view markdown-rendered";
		wrapper.style.display = "none";

		const sizer = document.createElement("div");
		sizer.className = "markdown-preview-sizer markdown-preview-section";
		wrapper.appendChild(sizer);

		try {
			hostEl.appendChild(wrapper);
		} catch {
			this.showNativeEmbed();
			this.scheduleRetry(100);
			return;
		}

		const nextChild = new MarkdownRenderChild(sizer);
		this.addChild(nextChild);
		nextChild.load();

		try {
			await MarkdownRenderer.renderMarkdown(fragment, sizer, this.file.path, nextChild);
		} catch (error) {
			console.error("InlineEditEngine: failed to render live preview range embed", error);
			try {
				nextChild.unload();
			} catch {
				// ignore
			}
			try {
				wrapper.remove();
			} catch {
				// ignore
			}
			this.showNativeEmbed();
			this.scheduleRetry(500);
			return;
		}

		if (!this.mounted) {
			try {
				nextChild.unload();
			} catch {
				// ignore
			}
			return;
		}
		if (currentSeq !== this.renderSeq) {
			try {
				nextChild.unload();
			} catch {
				// ignore
			}
			return;
		}

		try {
			this.renderChild?.unload();
		} catch {
			// ignore
		}
		this.renderChild = nextChild;
		this.retryCount = 0;

		try {
			for (const child of Array.from(hostEl.children)) {
				if (child === wrapper) continue;
				child.remove();
			}
		} catch {
			// ignore
		}

		try {
			wrapper.style.display = "";
		} catch {
			// ignore
		}

		this.showRangeEmbed();
	}
}

type ReadingRangeEmbedChildArgs = {
	plugin: BlockLinkPlus;
	embedEl: HTMLElement;
	file: TFile;
	subpath: string;
	registerEmbed: (filePath: string, child: ReadingRangeEmbedChild) => void;
	unregisterEmbed: (filePath: string, child: ReadingRangeEmbedChild) => void;
};

class ReadingRangeEmbedChild extends MarkdownRenderChild {
	private readonly plugin: BlockLinkPlus;
	private readonly embedEl: HTMLElement;
	private readonly file: TFile;
	private readonly subpath: string;
	private readonly registerEmbed: (filePath: string, child: ReadingRangeEmbedChild) => void;
	private readonly unregisterEmbed: (filePath: string, child: ReadingRangeEmbedChild) => void;
	private renderSeq = 0;
	private mounted = false;
	private activated = false;
	private renderChild: MarkdownRenderChild | null = null;
	private retryTimer: number | null = null;
	private retryCount = 0;
	private nativeContentEl: HTMLElement | null = null;
	private hostEl: HTMLElement | null = null;

	constructor(args: ReadingRangeEmbedChildArgs) {
		super(args.embedEl);
		this.plugin = args.plugin;
		this.embedEl = args.embedEl;
		this.file = args.file;
		this.subpath = args.subpath;
		this.registerEmbed = args.registerEmbed;
		this.unregisterEmbed = args.unregisterEmbed;
	}

	onload(): void {
		this.mounted = true;
		void this.render();
	}

	onunload(): void {
		this.mounted = false;
		if (this.retryTimer !== null) {
			try {
				window.clearTimeout(this.retryTimer);
			} catch {
				// ignore
			}
			this.retryTimer = null;
		}

		if (this.activated) {
			try {
				this.embedEl.classList.remove(READING_RANGE_ACTIVE_CLASS);
			} catch {
				// ignore
			}
			try {
				this.unregisterEmbed(this.file.path, this);
			} catch {
				// ignore
			}
		}
		try {
			this.renderChild?.unload();
		} catch {
			// ignore
		}
		this.renderChild = null;

		this.showNativeEmbed();
		this.removeHostEl();
		this.nativeContentEl = null;
	}

	private scheduleRetry(delayMs: number): void {
		if (!this.mounted) return;
		if (this.retryTimer !== null) return;
		if (this.retryCount >= 60) return;

		this.retryCount += 1;
		this.retryTimer = window.setTimeout(() => {
			this.retryTimer = null;
			void this.render();
		}, delayMs);
	}

	private getNativeContentEl(): HTMLElement | null {
		if (this.nativeContentEl?.isConnected) return this.nativeContentEl;

		const el = this.embedEl.querySelector<HTMLElement>(".markdown-embed-content");
		this.nativeContentEl = el;
		return el;
	}

	private getOrCreateHostEl(): HTMLElement | null {
		if (this.hostEl?.isConnected) return this.hostEl;

		const existing = this.embedEl.querySelector<HTMLElement>(`.${READING_RANGE_HOST_CLASS}`);
		if (existing) {
			this.hostEl = existing;
			return existing;
		}

		const host = document.createElement("div");
		host.className = READING_RANGE_HOST_CLASS;
		host.style.display = "none";

		const nativeContent = this.getNativeContentEl();
		const parent = nativeContent?.parentElement ?? this.embedEl;
		try {
			parent.insertBefore(host, nativeContent ?? null);
		} catch {
			try {
				parent.appendChild(host);
			} catch {
				// ignore
			}
		}

		this.hostEl = host;
		return host;
	}

	private showNativeEmbed(): void {
		const nativeContent = this.getNativeContentEl();
		if (nativeContent) {
			try {
				nativeContent.style.display = "";
			} catch {
				// ignore
			}
		}

		if (this.hostEl) {
			try {
				this.hostEl.style.display = "none";
			} catch {
				// ignore
			}
		}
	}

	private showRangeEmbed(): void {
		const nativeContent = this.getNativeContentEl();
		if (nativeContent) {
			try {
				nativeContent.style.display = "none";
			} catch {
				// ignore
			}
		}

		const host = this.getOrCreateHostEl();
		if (host) {
			try {
				host.style.display = "";
			} catch {
				// ignore
			}
		}
	}

	private removeHostEl(): void {
		if (!this.hostEl) return;
		try {
			this.hostEl.remove();
		} catch {
			// ignore
		}
		this.hostEl = null;
	}

	private cleanupLegacyMultilineShell(): void {
		try {
			this.embedEl.querySelector(".mk-multiline-react-container")?.remove();
		} catch {
			// ignore
		}

		try {
			this.embedEl.querySelector(".mk-multiline-jump-link")?.remove();
		} catch {
			// ignore
		}

		try {
			this.embedEl.querySelector(".mk-multiline-external-edit")?.remove();
		} catch {
			// ignore
		}

		try {
			this.embedEl.querySelector(".mk-floweditor")?.remove();
		} catch {
			// ignore
		}

		try {
			this.embedEl.classList.remove("mk-multiline-block");
			this.embedEl.classList.remove("mk-multiline-readonly");
		} catch {
			// ignore
		}

		const nativeContent = this.embedEl.querySelector<HTMLElement>(".markdown-embed-content");
		if (nativeContent) {
			try {
				nativeContent.style.display = "";
			} catch {
				// ignore
			}
		}

		const nativeLink = this.embedEl.querySelector<HTMLElement>(".markdown-embed-link");
		if (nativeLink) {
			try {
				nativeLink.style.display = "";
			} catch {
				// ignore
			}
		}

		this.showNativeEmbed();
	}

	async render(): Promise<void> {
		if (!this.mounted) return;
		if (!this.embedEl.isConnected) {
			this.scheduleRetry(50);
			return;
		}

		// Only render in preview-like contexts (Reading mode / hover previews). Live Preview embeds are handled elsewhere.
		if (this.embedEl.closest(".markdown-source-view")) {
			return;
		}

		if (!this.activated) {
			this.activated = true;
			try {
				this.embedEl.classList.add(READING_RANGE_ACTIVE_CLASS);
			} catch {
				// ignore
			}
			this.cleanupLegacyMultilineShell();
			this.registerEmbed(this.file.path, this);
		}

		if (!this.embedEl.classList.contains("is-loaded")) {
			this.scheduleRetry(50);
			return;
		}

		const currentSeq = (this.renderSeq += 1);

		if (typeof MarkdownRenderer?.renderMarkdown !== "function") {
			this.showNativeEmbed();
			return;
		}

		const contentEl = this.getNativeContentEl();
		if (!contentEl) {
			this.scheduleRetry(50);
			return;
		}

		const hostEl = this.getOrCreateHostEl();
		if (!hostEl) {
			this.showNativeEmbed();
			this.scheduleRetry(50);
			return;
		}

		const [start, end] = getLineRangeFromRef(this.file.path, this.subpath, this.plugin.app);
		if (!start || !end) {
			this.showNativeEmbed();
			this.scheduleRetry(100);
			return;
		}

		let raw = "";
		try {
			raw = await this.plugin.app.vault.cachedRead(this.file);
		} catch {
			this.showNativeEmbed();
			this.scheduleRetry(200);
			return;
		}

		if (!this.mounted) return;
		if (currentSeq !== this.renderSeq) return;

		const lines = raw.split(/\r?\n/);
		const clamp = (line: number) => Math.min(Math.max(1, line), Math.max(1, lines.length));
		const from = clamp(Math.min(start, end));
		const to = clamp(Math.max(start, end));
		const fragment = lines.slice(from - 1, to).join("\n");

		const wrapper = document.createElement("div");
		wrapper.className = "markdown-preview-view markdown-rendered";
		wrapper.style.display = "none";

		const sizer = document.createElement("div");
		sizer.className = "markdown-preview-sizer markdown-preview-section";
		wrapper.appendChild(sizer);

		try {
			hostEl.appendChild(wrapper);
		} catch {
			this.showNativeEmbed();
			this.scheduleRetry(100);
			return;
		}

		const nextChild = new MarkdownRenderChild(sizer);
		this.addChild(nextChild);
		nextChild.load();

		try {
			await MarkdownRenderer.renderMarkdown(fragment, sizer, this.file.path, nextChild);
		} catch (error) {
			console.error("InlineEditEngine: failed to render reading range embed", error);
			try {
				nextChild.unload();
			} catch {
				// ignore
			}
			try {
				wrapper.remove();
			} catch {
				// ignore
			}
			this.showNativeEmbed();
			this.scheduleRetry(500);
			return;
		}

		if (!this.mounted) {
			try {
				nextChild.unload();
			} catch {
				// ignore
			}
			return;
		}
		if (currentSeq !== this.renderSeq) {
			try {
				nextChild.unload();
			} catch {
				// ignore
			}
			return;
		}

		try {
			this.renderChild?.unload();
		} catch {
			// ignore
		}
		this.renderChild = nextChild;
		this.retryCount = 0;

		try {
			for (const child of Array.from(hostEl.children)) {
				if (child === wrapper) continue;
				child.remove();
			}
		} catch {
			// ignore
		}

		try {
			wrapper.style.display = "";
		} catch {
			// ignore
		}

		this.showRangeEmbed();
	}
}
