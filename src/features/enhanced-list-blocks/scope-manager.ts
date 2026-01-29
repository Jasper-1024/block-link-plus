import { normalizePath, TFile } from "obsidian";
import type BlockLinkPlus from "../../main";

export const ENHANCED_LIST_FRONTMATTER_KEY = "blp_enhanced_list";

export function normalizeEnhancedListScopePath(input: string): string {
	return normalizePath(input.trim()).replace(/^\/+/, "").replace(/\/+$/, "");
}

export function isPathInEnhancedListScopeFolder(path: string, folder: string): boolean {
	const normalizedFolder = normalizeEnhancedListScopePath(folder);
	if (!normalizedFolder) return true;
	return path === normalizedFolder || path.startsWith(normalizedFolder + "/");
}

type EnabledCacheEntry = { enabled: boolean; mtime: number };

/**
 * In-memory scope manager. No persistence; caches are bounded and invalidated by
 * vault/metadata/settings changes so debugging stays straightforward.
 */
export class EnhancedListScopeManager {
	private plugin: BlockLinkPlus;
	private scopeVersion = 0;

	private listeners = new Set<() => void>();
	private notifyScheduled = false;

	private normalizedEnabledFiles = new Set<string>();
	private normalizedEnabledFolders: string[] = [];
	private normalizedSettingsVersion = -1;

	private enabledByPath = new Map<string, EnabledCacheEntry>();
	private readonly maxEnabledCacheEntries = 2000;

	private enabledMarkdownFilesCache:
		| { scopeVersion: number; files: TFile[]; pathSet: Set<string> }
		| null = null;

	private frontmatterOptInByPath = new Map<string, boolean>();
	private readonly maxFrontmatterCacheEntries = 2000;

	constructor(plugin: BlockLinkPlus) {
		this.plugin = plugin;
		this.registerObsidianListeners();
	}

	getVersion(): number {
		return this.scopeVersion;
	}

	onChange(cb: () => void): () => void {
		this.listeners.add(cb);
		return () => this.listeners.delete(cb);
	}

	onSettingsChanged(): void {
		// Settings can affect scope (enabled folders/files) and view gating;
		// bump scopeVersion so view plugins can refresh on demand.
		this.bumpScopeVersion({ clearAll: true });
	}

	isEnabledFile(file: TFile): boolean {
		if (file.extension && file.extension.toLowerCase() !== "md") return false;

		const filePath = normalizePath(file.path);
		const mtime = file.stat?.mtime ?? 0;

		const cached = this.enabledByPath.get(filePath);
		if (cached && cached.mtime === mtime) return cached.enabled;

		this.ensureNormalizedSettings();

		if (this.normalizedEnabledFiles.has(filePath)) {
			this.setEnabledCache(filePath, { enabled: true, mtime });
			return true;
		}

		if (this.normalizedEnabledFolders.some((f) => isPathInEnhancedListScopeFolder(filePath, f))) {
			this.setEnabledCache(filePath, { enabled: true, mtime });
			return true;
		}

		const optIn = this.getFrontmatterOptIn(file);
		this.setEnabledCache(filePath, { enabled: optIn, mtime });
		return optIn;
	}

	getEnabledMarkdownFiles(): { files: TFile[]; pathSet: Set<string> } {
		if (this.enabledMarkdownFilesCache?.scopeVersion === this.scopeVersion) {
			return { files: this.enabledMarkdownFilesCache.files, pathSet: this.enabledMarkdownFilesCache.pathSet };
		}

		const files = (this.plugin.app.vault.getFiles() ?? []).filter(
			(f): f is TFile => f instanceof TFile && f.extension?.toLowerCase() === "md"
		);

		const enabled = files.filter((f) => this.isEnabledFile(f));
		const pathSet = new Set(enabled.map((f) => f.path));

		this.enabledMarkdownFilesCache = { scopeVersion: this.scopeVersion, files: enabled, pathSet };
		return { files: enabled, pathSet };
	}

	/**
	 * Invalidate a single path (rename/delete/metadata update).
	 */
	invalidatePath(path: string): void {
		const normalized = normalizePath(path);
		this.enabledByPath.delete(normalized);
		this.frontmatterOptInByPath.delete(normalized);
		this.enabledMarkdownFilesCache = null;
		this.bumpScopeVersion({ clearAll: false });
	}

	private ensureNormalizedSettings(): void {
		if (this.normalizedSettingsVersion === this.scopeVersion) return;

		const enabledFiles = (this.plugin.settings.enhancedListEnabledFiles ?? [])
			.map((p: string) => normalizePath(String(p ?? "")))
			.filter(Boolean);
		this.normalizedEnabledFiles = new Set(enabledFiles);

		this.normalizedEnabledFolders = (this.plugin.settings.enhancedListEnabledFolders ?? [])
			.map((p: string) => normalizeEnhancedListScopePath(String(p ?? "")));

		this.normalizedSettingsVersion = this.scopeVersion;
	}

	private getFrontmatterOptIn(file: TFile): boolean {
		const filePath = normalizePath(file.path);

		const cached = this.frontmatterOptInByPath.get(filePath);
		if (cached !== undefined) return cached;

		const cache = this.plugin.app.metadataCache.getFileCache(file);
		const fm = cache?.frontmatter as Record<string, unknown> | undefined;
		const raw = fm?.[ENHANCED_LIST_FRONTMATTER_KEY];
		const enabled = raw === true || raw === "true" || raw === 1;

		this.frontmatterOptInByPath.set(filePath, enabled);
		this.evictFrontmatterOptInIfNeeded();
		return enabled;
	}

	private registerObsidianListeners(): void {
		const pluginAny = this.plugin as any;
		if (!pluginAny || typeof pluginAny.registerEvent !== "function") return;
		const registerEvent = (ref: any) => pluginAny.registerEvent(ref);

		const vault: any = (this.plugin.app as any)?.vault;
		if (registerEvent && vault && typeof vault.on === "function") {
			registerEvent(
				vault.on("rename", (file: any, oldPath: string) => {
					if (!(file instanceof TFile)) return;
					const prev = normalizePath(String(oldPath ?? ""));
					const next = normalizePath(String(file.path ?? ""));
					if (prev && next && prev !== next) {
						const entry = this.enabledByPath.get(prev);
						if (entry) {
							this.enabledByPath.delete(prev);
							this.enabledByPath.set(next, entry);
						}
						const fm = this.frontmatterOptInByPath.get(prev);
						if (fm !== undefined) {
							this.frontmatterOptInByPath.delete(prev);
							this.frontmatterOptInByPath.set(next, fm);
						}
					}
					this.enabledMarkdownFilesCache = null;
					this.bumpScopeVersion({ clearAll: false });
				})
			);

			registerEvent(
				vault.on("delete", (file: any) => {
					if (!(file instanceof TFile)) return;
					this.enabledByPath.delete(normalizePath(String(file.path ?? "")));
					this.frontmatterOptInByPath.delete(normalizePath(String(file.path ?? "")));
					this.enabledMarkdownFilesCache = null;
					this.bumpScopeVersion({ clearAll: false });
				})
			);

			registerEvent(
				vault.on("create", (file: any) => {
					if (!(file instanceof TFile)) return;
					if (file.extension?.toLowerCase() !== "md") return;
					this.enabledMarkdownFilesCache = null;
					this.bumpScopeVersion({ clearAll: false });
				})
			);
		}

		const metadata: any = (this.plugin.app as any)?.metadataCache;
		if (registerEvent && metadata && typeof metadata.on === "function") {
			registerEvent(
				metadata.on("changed", (file: any, _data: any, cache: any) => {
					if (!(file instanceof TFile)) return;

					const path = normalizePath(String(file.path ?? ""));
					// Any metadata change invalidates per-file enable decision cache.
					this.enabledByPath.delete(path);
					this.enabledMarkdownFilesCache = null;

					const fm = cache?.frontmatter as Record<string, unknown> | undefined;
					const hasKey = Boolean(
						fm && Object.prototype.hasOwnProperty.call(fm, ENHANCED_LIST_FRONTMATTER_KEY)
					);
					const prevOptIn = this.frontmatterOptInByPath.get(path);
					if (!hasKey && prevOptIn === undefined) return;

					const raw = fm?.[ENHANCED_LIST_FRONTMATTER_KEY];
					const nextOptIn = raw === true || raw === "true" || raw === 1;

					if (prevOptIn !== nextOptIn) {
						this.frontmatterOptInByPath.set(path, nextOptIn);
						this.evictFrontmatterOptInIfNeeded();
						this.bumpScopeVersion({ clearAll: false });
					} else {
						this.frontmatterOptInByPath.set(path, nextOptIn);
						this.evictFrontmatterOptInIfNeeded();
					}
				})
			);
		}
	}

	private bumpScopeVersion(opts: { clearAll: boolean }): void {
		this.scopeVersion++;
		this.enabledMarkdownFilesCache = null;
		this.normalizedSettingsVersion = -1;

		if (opts.clearAll) {
			this.enabledByPath.clear();
			// Keep frontmatterOptInByPath; it's cheap and helps detect changes without scanning.
		}

		this.scheduleNotify();
	}

	private scheduleNotify(): void {
		if (this.notifyScheduled) return;
		this.notifyScheduled = true;

		const run = () => {
			this.notifyScheduled = false;
			for (const cb of [...this.listeners]) {
				try {
					cb();
				} catch {
					// ignore listener errors
				}
			}
		};

		if (typeof queueMicrotask === "function") {
			queueMicrotask(run);
		} else if (typeof setTimeout === "function") {
			setTimeout(run, 0);
		} else {
			run();
		}
	}

	private setEnabledCache(path: string, entry: EnabledCacheEntry): void {
		this.enabledByPath.set(path, entry);

		// Basic bound: avoid unbounded growth if callers probe lots of files.
		if (this.enabledByPath.size > this.maxEnabledCacheEntries) {
			const toDelete = this.enabledByPath.size - this.maxEnabledCacheEntries;
			const it = this.enabledByPath.keys();
			for (let i = 0; i < toDelete; i++) {
				const k = it.next().value;
				if (typeof k === "string") this.enabledByPath.delete(k);
			}
		}
	}

	private evictFrontmatterOptInIfNeeded(): void {
		if (this.frontmatterOptInByPath.size <= this.maxFrontmatterCacheEntries) return;

		const toDelete = this.frontmatterOptInByPath.size - this.maxFrontmatterCacheEntries;
		const it = this.frontmatterOptInByPath.keys();
		for (let i = 0; i < toDelete; i++) {
			const k = it.next().value;
			if (typeof k === "string") this.frontmatterOptInByPath.delete(k);
		}
	}
}
