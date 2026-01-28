import { MarkdownPostProcessorContext, MarkdownRenderer, TFile } from "obsidian";
import type BlockLinkPlus from "../../main";
import * as yaml from "js-yaml";
import { DateTime } from "luxon";
import type { DataviewApi, Link } from "obsidian-dataview";
import { getDataviewApi } from "../../utils/dataview-detector";
import { getEnhancedListEnabledMarkdownFiles, isEnhancedListEnabledFile } from "./enable-scope";
import crypto from "crypto";
import { findManagedRegion, REGION_END_MARKER, REGION_START_MARKER_PREFIX } from "./region-parser";
import { openEnhancedListBlockPeek } from "./block-peek";

type SortBy = "date" | "file.path" | "line";
type SortOrder = "asc" | "desc";

type RenderType = "embed-list" | "table";
type RenderMode = "materialize";
type HierarchyFilterMode = "all" | "outermost-match" | "root-only";

type ColumnConfig = { name: string; field?: string; expr?: string };

export interface BlpViewConfig {
	source?: {
		folders?: string[];
		files?: string[];
		dv?: string;
	};
	filters?: {
		date?: {
			within_days?: number;
			after?: string;
			before?: string;
			between?: [string, string] | { after: string; before: string };
		};
		fields?: Array<{
			field: string;
			op: "has" | "=" | "!=" | ">" | ">=" | "<" | "<=" | "in" | "contains";
			value?: unknown;
		}>;
		tags?: {
			any?: string[];
			all?: string[];
			none?: string[];
			none_in_ancestors?: string[];
		};
		outlinks?: {
			any?: string[];
			all?: string[];
			none?: string[];
			link_to_current_file?: boolean;
		};
		section?: {
			any?: string[];
			all?: string[];
			none?: string[];
		};
		/**
		 * Controls whether nested list-item matches should be kept or suppressed.
		 * - "all" (default): keep all matching list items.
		 * - "outermost-match": suppress a match if any ancestor list item also matches.
		 * - "root-only": only keep root list items (no parent).
		 */
		hierarchy?: HierarchyFilterMode;
	};
	group?: {
		by?: "none" | "day(date)" | "file" | "field";
		field?: string;
	};
	sort?: {
		by?: SortBy;
		order?: SortOrder;
	};
	render?: {
		type?: RenderType;
		mode?: RenderMode;
		columns?: ColumnConfig[];
	};
}

export interface BlpViewCandidate {
	path: string;
	line: number;
	blockId: string;
	date: DateTime;
	item: any;
	ancestorTags: string[];
	ancestorLines: number[];
}

export interface BlpViewGroup {
	key: string;
	title: string;
	items: BlpViewCandidate[];
}

type FieldFilter = NonNullable<NonNullable<BlpViewConfig["filters"]>["fields"]>[number];

interface BlpViewResolvedConfig {
	source?: BlpViewConfig["source"];
	filters?: BlpViewConfig["filters"];
	group: { by: NonNullable<BlpViewConfig["group"]>["by"]; field: string };
	sort: { by: SortBy; order: SortOrder };
	render: { type: RenderType; mode?: RenderMode; columns: ColumnConfig[] };
}

function normalizeTag(tag: string): string {
	const trimmed = tag.trim();
	if (!trimmed) return "";
	return trimmed.startsWith("#") ? trimmed : `#${trimmed}`;
}

function normalizeTagList(tags?: string[]): string[] {
	if (!tags) return [];
	return tags.map(normalizeTag).filter(Boolean);
}

export function parseConfig(source: string): BlpViewConfig {
	const raw = yaml.load(source);
	if (!raw || typeof raw !== "object") return {};
	return raw as BlpViewConfig;
}

export function resolveConfigDefaults(config: BlpViewConfig): BlpViewResolvedConfig {
	const renderTypeRaw = config.render?.type;
	const renderType: RenderType = renderTypeRaw === "table" || renderTypeRaw === "embed-list" ? renderTypeRaw : "embed-list";

	const renderModeRaw = config.render?.mode;
	if (renderModeRaw && renderModeRaw !== "materialize") {
		throw new Error(`blp-view: unsupported render.mode: ${renderModeRaw}`);
	}

	const columns =
		renderType === "table"
			? config.render?.columns ?? [
					{ name: "File", expr: "file.link" },
					{ name: "Date", field: "date" },
			  ]
			: [];

	return {
		source: config.source,
		filters: config.filters,
		group: {
			by: config.group?.by ?? "none",
			field: config.group?.field ?? "",
		},
		sort: {
			by: config.sort?.by ?? "date",
			order: config.sort?.order ?? "desc",
		},
		render: {
			type: renderType,
			mode: renderModeRaw,
			columns,
		},
	};
}

function isPathInFolder(path: string, folder: string): boolean {
	const normalizedFolder = folder.replace(/\\/g, "/").replace(/^\/+/, "").replace(/\/+$/, "");
	if (!normalizedFolder) return true;
	return path === normalizedFolder || path.startsWith(normalizedFolder + "/");
}

export function resolveSourceFilesOrError(
	plugin: BlockLinkPlus,
	dv: DataviewApi,
	currentFile: TFile,
	source: BlpViewConfig["source"]
): {
	files: TFile[];
	nonEnabledPaths: string[];
	missingPaths: string[];
	ambiguousFiles: Array<{ input: string; matches: string[] }>;
} {
	const allMarkdownFiles = plugin.app.vault
		.getFiles()
		.filter((f): f is TFile => f instanceof TFile && f.extension?.toLowerCase() === "md");
	const enabledFiles = getEnhancedListEnabledMarkdownFiles(plugin);
	const enabledPathSet = new Set(enabledFiles.map((f) => f.path));

	if (!source) {
		return { files: enabledFiles, nonEnabledPaths: [], missingPaths: [], ambiguousFiles: [] };
	}

	const folders = source.folders ?? [];
	const files = source.files ?? [];
	const dvSource = source.dv?.trim();

	if (dvSource && (folders.length > 0 || files.length > 0)) {
		throw new Error("blp-view: `source.dv` cannot be combined with `source.folders`/`source.files`.");
	}

	let candidatePaths: string[] = [];
	const missingPaths: string[] = [];
	const ambiguousFiles: Array<{ input: string; matches: string[] }> = [];

	if (dvSource) {
		const pages = dv.pages(dvSource, currentFile.path);
		for (const p of pages) {
			const path = (p as any)?.file?.path;
			if (typeof path === "string" && path.endsWith(".md")) {
				candidatePaths.push(path);
			}
		}
	} else {
		const folderMatches = folders.length
			? allMarkdownFiles.filter((f) => folders.some((folder) => isPathInFolder(f.path, folder))).map((f) => f.path)
			: [];

		const markdownPaths = new Set(allMarkdownFiles.map((f) => f.path));
		const basenameToPaths = new Map<string, string[]>();
		for (const f of allMarkdownFiles) {
			const base = f.basename || f.path.split("/").pop()?.replace(/\.md$/i, "") || "";
			if (!base) continue;
			const list = basenameToPaths.get(base) ?? [];
			list.push(f.path);
			basenameToPaths.set(base, list);
		}

		const normalizeInput = (raw: string): string => {
			let s = raw.trim();
			if (s.startsWith("[[") && s.endsWith("]]")) {
				s = s.slice(2, -2);
			}
			s = s.split("|")[0].trim();
			return s.replace(/\\/g, "/").replace(/^\/+/, "");
		};

		const resolveFileInput = (raw: unknown): string | null => {
			if (typeof raw !== "string") {
				throw new Error("blp-view: source.files entries must be strings.");
			}

			const cleaned = normalizeInput(raw);
			if (!cleaned) return null;

			const resolved = (plugin.app.metadataCache as any)?.getFirstLinkpathDest?.(cleaned, currentFile.path)?.path;
			if (typeof resolved === "string" && resolved) {
				return resolved;
			}

			const isPathLike = cleaned.includes("/") || cleaned.toLowerCase().endsWith(".md");
			if (isPathLike) {
				const path = cleaned.toLowerCase().endsWith(".md") ? cleaned : `${cleaned}.md`;
				if (markdownPaths.has(path)) {
					return path;
				}
				missingPaths.push(cleaned);
				return null;
			}

			const matches = basenameToPaths.get(cleaned) ?? [];
			if (matches.length === 1) {
				return matches[0];
			}
			if (matches.length > 1) {
				ambiguousFiles.push({ input: cleaned, matches: [...matches].sort() });
				return null;
			}

			missingPaths.push(cleaned);
			return null;
		};

		const fileMatches = files.map(resolveFileInput).filter((p): p is string => typeof p === "string" && p.length > 0);

		candidatePaths = [...folderMatches, ...fileMatches].filter(Boolean);
	}

	const uniqueCandidatePaths = [...new Set(candidatePaths)];

	const resolvedFiles: TFile[] = [];
	const resolvedPaths: string[] = [];
	for (const path of uniqueCandidatePaths) {
		const af = plugin.app.vault.getAbstractFileByPath(path);
		if (af instanceof TFile) {
			resolvedFiles.push(af);
			resolvedPaths.push(path);
		} else {
			missingPaths.push(path);
		}
	}

	const nonEnabledPaths = resolvedPaths.filter((p) => !enabledPathSet.has(p));

	return {
		files: resolvedFiles,
		nonEnabledPaths,
		missingPaths: [...new Set(missingPaths)].sort(),
		ambiguousFiles,
	};
}

function flattenListItems(
	items: any[],
	ancestorTags: string[],
	ancestorLines: number[],
	out: Array<{ item: any; ancestorTags: string[]; ancestorLines: number[] }>
) {
	for (const item of items) {
		const tags: string[] = Array.isArray(item?.tags) ? item.tags : [];
		const nextAncestors = [...ancestorTags, ...tags];
		out.push({ item, ancestorTags, ancestorLines });

		const children: any[] = Array.isArray(item?.children) ? item.children : [];
		if (children.length > 0) {
			const line = typeof item?.line === "number" ? item.line : undefined;
			const nextAncestorLines = typeof line === "number" ? [...ancestorLines, line] : ancestorLines;
			flattenListItems(children, nextAncestors, nextAncestorLines, out);
		}
	}
}

function parseDateFilterOrThrow(dv: DataviewApi, raw: unknown): DateTime {
	if (typeof raw !== "string") {
		throw new Error("blp-view: date filter value must be a string.");
	}
	const parsed = dv.date(raw);
	if (!parsed) {
		throw new Error(`blp-view: invalid date value: ${raw}`);
	}
	return parsed;
}

function resolveOutlinkTargets(
	plugin: BlockLinkPlus,
	currentFile: TFile,
	outlinks: NonNullable<BlpViewConfig["filters"]>["outlinks"]
): { any: Set<string>; all: Set<string>; none: Set<string>; requireCurrentFile: boolean } {
	const any = new Set<string>();
	const all = new Set<string>();
	const none = new Set<string>();
	const requireCurrentFile = Boolean(outlinks?.link_to_current_file);
	if (!outlinks) return { any, all, none, requireCurrentFile };

	const addPathLike = (raw: string, target: Set<string>) => {
		const cleaned = raw.replace(/^\[\[|\]\]$/g, "").split("|")[0].trim();
		if (!cleaned) return;
		const resolved = plugin.app.metadataCache.getFirstLinkpathDest(cleaned, currentFile.path)?.path;
		target.add(resolved ?? cleaned);
	};

	for (const raw of outlinks.any ?? []) addPathLike(raw, any);
	for (const raw of outlinks.all ?? []) addPathLike(raw, all);
	for (const raw of outlinks.none ?? []) addPathLike(raw, none);

	return { any, all, none, requireCurrentFile };
}

export function matchesFieldFilter(dv: DataviewApi, item: any, filter: FieldFilter): boolean {
	if (!filter.field) return true;
	const value = (item as any)?.[filter.field];
	if (value === undefined || value === null) return false;

	if (filter.op === "has") {
		return dv.value.isTruthy(dv.literal(value));
	}

	const expected = dv.literal(filter.value);
	const actual = dv.literal(value);

	switch (filter.op) {
		case "=":
			return dv.equal(actual, expected);
		case "!=":
			return !dv.equal(actual, expected);
		case ">":
			return dv.compare(actual, expected) > 0;
		case ">=":
			return dv.compare(actual, expected) >= 0;
		case "<":
			return dv.compare(actual, expected) < 0;
		case "<=":
			return dv.compare(actual, expected) <= 0;
		case "in": {
			if (!Array.isArray(filter.value)) return false;
			return (filter.value as any[]).some((v) => dv.equal(actual, dv.literal(v)));
		}
		case "contains": {
			if (typeof value === "string" && typeof filter.value === "string") {
				return value.includes(filter.value);
			}
			if (Array.isArray(value)) {
				return value.some((v) => dv.equal(dv.literal(v), expected));
			}
			return false;
		}
		default:
			return false;
	}
}

export function matchesTagFilter(item: any, tagsFilter: NonNullable<BlpViewConfig["filters"]>["tags"], ancestorTags: string[]): boolean {
	if (!tagsFilter) return true;

	const itemTags = new Set<string>(normalizeTagList(item?.tags));
	const ancestors = new Set<string>(normalizeTagList(ancestorTags));

	const any = normalizeTagList(tagsFilter.any);
	const all = normalizeTagList(tagsFilter.all);
	const none = normalizeTagList(tagsFilter.none);
	const noneInAncestors = normalizeTagList(tagsFilter.none_in_ancestors);

	if (any.length > 0 && !any.some((t) => itemTags.has(t))) return false;
	if (all.length > 0 && !all.every((t) => itemTags.has(t))) return false;
	if (none.length > 0 && none.some((t) => itemTags.has(t))) return false;
	if (noneInAncestors.length > 0 && noneInAncestors.some((t) => ancestors.has(t))) return false;

	return true;
}

export function matchesOutlinksFilter(
	plugin: BlockLinkPlus,
	item: any,
	outlinksFilter: NonNullable<BlpViewConfig["filters"]>["outlinks"],
	targets: ReturnType<typeof resolveOutlinkTargets>,
	currentFilePath: string
): boolean {
	if (!outlinksFilter) return true;

	const outlinks: Link[] = Array.isArray(item?.outlinks) ? item.outlinks : [];

	// Dataview list item outlinks are not always normalized to vault-relative paths (can be basename / alias).
	// Normalize via Obsidian metadataCache, and also fall back to basename matching for loose link formats.
	const normalizePathForCompare = (p: string): string => p.replace(/\\/g, "/").replace(/^\/+/, "").replace(/\.md$/i, "");
	const getBasenameForCompare = (p: string): string => {
		const normalized = normalizePathForCompare(p);
		const parts = normalized.split("/");
		return parts[parts.length - 1] ?? normalized;
	};

	const originFilePath = typeof item?.path === "string" && item.path ? item.path : currentFilePath;

	const outlinkPaths = new Set<string>();
	const outlinkBasenames = new Set<string>();
	const addOutlinkCandidate = (p: unknown) => {
		if (typeof p !== "string" || !p) return;
		outlinkPaths.add(normalizePathForCompare(p));
		outlinkBasenames.add(getBasenameForCompare(p));
	};

	for (const l of outlinks) {
		addOutlinkCandidate(l.path);
		const resolved = (plugin.app.metadataCache as any)?.getFirstLinkpathDest?.(l.path, originFilePath)?.path;
		addOutlinkCandidate(resolved);
	}

	const hasPath = (path: string): boolean => {
		const normalized = normalizePathForCompare(path);
		if (outlinkPaths.has(normalized)) return true;

		const basename = getBasenameForCompare(path);
		return basename ? outlinkBasenames.has(basename) : false;
	};

	if (targets.requireCurrentFile && !hasPath(currentFilePath)) return false;
	if (targets.any.size > 0 && ![...targets.any].some(hasPath)) return false;
	if (targets.all.size > 0 && ![...targets.all].every(hasPath)) return false;
	if (targets.none.size > 0 && [...targets.none].some(hasPath)) return false;

	return true;
}

export function applyHierarchyFilter(
	candidates: BlpViewCandidate[],
	mode: NonNullable<NonNullable<BlpViewConfig["filters"]>["hierarchy"]> | undefined
): BlpViewCandidate[] {
	const resolved: HierarchyFilterMode = mode ?? "all";
	if (resolved === "all") return candidates;

	if (resolved === "root-only") {
		return candidates.filter((c) => (c.ancestorLines?.length ?? 0) === 0);
	}

	// Keep only the outermost match in a list-item subtree:
	// suppress a match if any ancestor list item is also a match.
	const matched = new Set<string>();
	for (const c of candidates) {
		if (typeof c.path === "string" && typeof c.line === "number" && c.line > 0) {
			matched.add(`${c.path}:${c.line}`);
		}
	}

	return candidates.filter((c) => {
		const ancestors = Array.isArray(c.ancestorLines) ? c.ancestorLines : [];
		if (ancestors.length === 0) return true;
		if (typeof c.path !== "string" || typeof c.line !== "number" || c.line <= 0) return true;

		return !ancestors.some((line) => typeof line === "number" && matched.has(`${c.path}:${line}`));
	});
}

export function matchesSectionFilter(item: any, sectionFilter: NonNullable<BlpViewConfig["filters"]>["section"]): boolean {
	if (!sectionFilter) return true;

	const section: Link | undefined = item?.section;
	const sectionName =
		section && section.type === "header" && typeof section.subpath === "string" ? section.subpath : undefined;

	const any = sectionFilter.any ?? sectionFilter.all ?? [];
	const none = sectionFilter.none ?? [];

	if (any.length > 0) {
		if (!sectionName) return false;
		return any.includes(sectionName);
	}

	if (none.length > 0) {
		if (!sectionName) return true;
		return !none.includes(sectionName);
	}

	return true;
}

export function matchesDateFilter(dv: DataviewApi, date: DateTime, dateFilter: NonNullable<BlpViewConfig["filters"]>["date"]): boolean {
	if (!dateFilter) return true;

	if (typeof dateFilter.within_days === "number") {
		const threshold = dv.luxon.DateTime.now().minus({ days: dateFilter.within_days });
		if (date < threshold) return false;
	}

	if (dateFilter.after) {
		const after = parseDateFilterOrThrow(dv, dateFilter.after);
		if (!(date > after)) return false;
	}

	if (dateFilter.before) {
		const before = parseDateFilterOrThrow(dv, dateFilter.before);
		if (!(date < before)) return false;
	}

	if (dateFilter.between) {
		const between = dateFilter.between as any;
		const afterRaw = Array.isArray(between) ? between[0] : between.after;
		const beforeRaw = Array.isArray(between) ? between[1] : between.before;
		const after = parseDateFilterOrThrow(dv, afterRaw);
		const before = parseDateFilterOrThrow(dv, beforeRaw);
		if (!(after < date && date < before)) return false;
	}

	return true;
}

export function buildGroups(dv: DataviewApi, items: BlpViewCandidate[], config: BlpViewResolvedConfig): BlpViewGroup[] {
	const by = config.group.by;
	if (by === "none") {
		return [{ key: "__all__", title: "", items }];
	}

	const groups = new Map<string, BlpViewGroup>();

	const ensureGroup = (key: string, title: string) => {
		const existing = groups.get(key);
		if (existing) return existing;
		const created: BlpViewGroup = { key, title, items: [] };
		groups.set(key, created);
		return created;
	};

	for (const candidate of items) {
		if (by === "day(date)") {
			const day = candidate.date.toFormat("yyyy-MM-dd");
			ensureGroup(day, day).items.push(candidate);
			continue;
		}

		if (by === "file") {
			const path = candidate.path;
			ensureGroup(path, `[[${path}]]`).items.push(candidate);
			continue;
		}

		if (by === "field") {
			const field = config.group.field;
			if (!field) continue;

			const rawValue = (candidate.item as any)?.[field];
			if (rawValue === undefined || rawValue === null) continue;

			const values = Array.isArray(rawValue) ? rawValue : [rawValue];
			for (const v of values) {
				const key = dv.value.toString(dv.literal(v));
				ensureGroup(key, key).items.push(candidate);
			}

			continue;
		}
	}

	const grouped = [...groups.values()];

	const sortDirection = config.sort.order === "desc" ? -1 : 1;
	if (by === "day(date)" && config.sort.by === "date") {
		return grouped.sort((a, b) => a.key.localeCompare(b.key) * sortDirection);
	}
	if (by === "file" && config.sort.by === "file.path") {
		return grouped.sort((a, b) => a.key.localeCompare(b.key) * sortDirection);
	}
	return grouped.sort((a, b) => a.key.localeCompare(b.key));
}

export function stableSortItems(dv: DataviewApi, items: BlpViewCandidate[], sort: BlpViewResolvedConfig["sort"]): BlpViewCandidate[] {
	const order = sort.order;

	const comparePrimary = (a: BlpViewCandidate, b: BlpViewCandidate) => {
		switch (sort.by) {
			case "file.path":
				return a.path.localeCompare(b.path);
			case "line":
				return a.line - b.line;
			case "date":
			default:
				return dv.compare(a.date, b.date);
		}
	};

	const dir = order === "asc" ? 1 : -1;

	return [...items].sort((a, b) => {
		const primary = comparePrimary(a, b) * dir;
		if (primary !== 0) return primary;

		const pathCmp = a.path.localeCompare(b.path);
		if (pathCmp !== 0) return pathCmp;

		const lineCmp = a.line - b.line;
		if (lineCmp !== 0) return lineCmp;

		return a.blockId.localeCompare(b.blockId);
	});
}

function renderEmbedList(groups: BlpViewGroup[]): string {
	const lines: string[] = [];

	for (const group of groups) {
		if (group.title) {
			lines.push(`### ${group.title}`);
		}

		for (const item of group.items) {
			lines.push(`![[${item.path}#^${item.blockId}]]`);
		}

		if (group.title) {
			lines.push("");
		}
	}

	return lines.join("\n").trim();
}

const INTERNAL_EMBED_SRC_BLOCK_REF_RE = /^([^#]+)#\^([a-zA-Z0-9_-]+)$/;

/**
 * Enhance rendered blp-view output with a lightweight "peek" affordance on block embeds.
 * This keeps the main renderer pure-markdown while still enabling block-first workflows.
 */
export function attachEnhancedListBlockPeekToRenderedBlpViewOutput(
	plugin: BlockLinkPlus,
	el: HTMLElement,
	args: { sourcePath: string }
): void {
	if (plugin.settings?.enhancedListBlockPeekEnabled === false) return;

	const app: any = plugin.app as any;
	const sourcePath = args.sourcePath ?? "";

	// Obsidian renders `![[file#^id]]` as `.internal-embed` with `src="file#^id"`.
	const embeds = el.querySelectorAll<HTMLElement>('.internal-embed[src*="#^"]');
	for (const embed of embeds) {
		if (!embed || (embed as any).dataset?.blpPeekBound === "1") continue;

		const src = embed.getAttribute("src") ?? "";
		const m = src.match(INTERNAL_EMBED_SRC_BLOCK_REF_RE);
		if (!m?.[1] || !m?.[2]) continue;

		const linkpath = m[1];
		const id = m[2];

		let dest: any = null;
		try {
			dest = app.metadataCache?.getFirstLinkpathDest?.(linkpath, sourcePath) ?? null;
		} catch {
			dest = null;
		}
		if (!dest) continue;

		(embed as any).dataset.blpPeekBound = "1";
		embed.classList.add("blp-block-peek-host");

		// Avoid duplicating the button if Obsidian reuses DOM nodes.
		if (embed.querySelector(".blp-block-peek-btn")) continue;

		const btn = document.createElement("span");
		btn.className = "blp-block-peek-btn";
		btn.textContent = "peek";
		btn.setAttribute("aria-label", "Block Peek");
		btn.addEventListener("click", (ev) => {
			ev.preventDefault();
			ev.stopPropagation();
			openEnhancedListBlockPeek(plugin, { file: dest, blockId: id });
		});
		embed.appendChild(btn);
	}
}

function renderTable(
	dv: DataviewApi,
	groups: BlpViewGroup[],
	config: BlpViewResolvedConfig,
	pageFileByPath: Map<string, any>,
	originFilePath: string
): string {
	const columns = config.render.columns ?? [];
	if (columns.length === 0) {
		return "";
	}

	const headers = columns.map((c) => c.name);
	const parts: string[] = [];

	for (const group of groups) {
		if (group.title) {
			parts.push(`### ${group.title}`);
			parts.push("");
		}

		const rows: any[][] = [];
		for (const candidate of group.items) {
			const pageFile = pageFileByPath.get(candidate.path) ?? { path: candidate.path, link: dv.fileLink(candidate.path) };
			pageFileByPath.set(candidate.path, pageFile);

			const context = { ...candidate.item, file: pageFile };
			const row: any[] = [];

			for (const col of columns) {
				if (col.field) {
					row.push((candidate.item as any)?.[col.field]);
					continue;
				}

				if (col.expr) {
					const result = dv.evaluate(col.expr, context as any, originFilePath);
					if (!result.successful) {
						throw new Error(`blp-view: expr failed (${col.name}): ${result.error}`);
					}
					row.push(result.value);
					continue;
				}

				throw new Error(`blp-view: invalid column '${col.name}' (must specify field or expr).`);
			}

			rows.push(row);
		}

		parts.push(dv.markdownTable(headers, rows));
		parts.push("");
	}

	return parts.join("\n").trim();
}

export async function materializeOutput(
	plugin: BlockLinkPlus,
	file: TFile,
	el: HTMLElement,
	ctx: MarkdownPostProcessorContext,
	markdown: string
): Promise<void> {
	const sectionInfo = ctx.getSectionInfo(el);
	if (!sectionInfo) {
		throw new Error("blp-view: could not resolve code block position.");
	}

	const codeBlockEndLine = sectionInfo.lineEnd;
	const fileContent = await plugin.app.vault.read(file);
	const originalLines = fileContent.split("\n");
	const region = findManagedRegion(fileContent, codeBlockEndLine);

	const contentBlock = markdown.trimEnd();
	const newHash = crypto.createHash("sha256").update(contentBlock).digest("hex");

	if (region) {
		const existingContentBlock = originalLines.slice(region.regionStartLine + 1, region.regionEndLine).join("\n").trimEnd();
		const existingContentHash = crypto.createHash("sha256").update(existingContentBlock).digest("hex");
		if (region.existingHash === newHash && existingContentHash === newHash) {
			return;
		}
	}

	const newStartMarker = `${REGION_START_MARKER_PREFIX} data-hash="${newHash}" %%`;

	let newFileContent: string;
	if (region) {
		const beforeRegion = originalLines.slice(0, region.regionStartLine).join("\n");
		const afterRegion = originalLines.slice(region.regionEndLine + 1).join("\n");
		newFileContent = `${beforeRegion}\n${newStartMarker}\n${contentBlock}\n${REGION_END_MARKER}${afterRegion ? `\n${afterRegion}` : ""}`;
	} else {
		const beforeRegion = originalLines.slice(0, codeBlockEndLine + 1).join("\n");
		const afterRegion = originalLines.slice(codeBlockEndLine + 1).join("\n");
		newFileContent = `${beforeRegion}\n${newStartMarker}\n${contentBlock}\n${REGION_END_MARKER}${afterRegion ? `\n${afterRegion}` : ""}`;
	}

	if (newFileContent.trim() !== fileContent.trim()) {
		await plugin.app.vault.modify(file, newFileContent);
	}
}

export async function handleBlpView(
	plugin: BlockLinkPlus,
	source: string,
	el: HTMLElement,
	ctx: MarkdownPostProcessorContext
) {
	el.empty();

	try {
		const startMs = Date.now();

		const dv = getDataviewApi();
		if (!dv) {
			el.createEl("pre", { text: "Error: Dataview plugin is not installed or enabled." });
			return;
		}

		const file = plugin.app.vault.getAbstractFileByPath(ctx.sourcePath);
		if (!(file instanceof TFile)) {
			return;
		}

		const config = resolveConfigDefaults(parseConfig(source));

		const allowMaterialize = plugin.settings.blpViewAllowMaterialize;
		const maxSourceFiles = plugin.settings.blpViewMaxSourceFiles ?? 0;
		const maxResults = plugin.settings.blpViewMaxResults ?? 0;
		const showDiagnostics = plugin.settings.blpViewShowDiagnostics;

		const { files: sourceFiles, nonEnabledPaths, missingPaths, ambiguousFiles } = resolveSourceFilesOrError(
			plugin,
			dv,
			file,
			config.source
		);

		if (missingPaths.length > 0) {
			el.createEl("pre", {
				text:
					`Error: blp-view source includes missing/unresolved files:\n` +
					missingPaths.map((p) => `- ${p}`).join("\n") +
					`\n\nTip: use vault-relative paths (right click file → Copy path) or ensure the files exist.`,
			});
			return;
		}

		if (ambiguousFiles.length > 0) {
			const lines: string[] = ["Error: blp-view source includes ambiguous file names:"];
			for (const a of ambiguousFiles) {
				lines.push(`- ${a.input}`);
				for (const p of a.matches) {
					lines.push(`  - ${p}`);
				}
			}
			lines.push("");
			lines.push("Tip: use a full vault-relative path in `source.files` to disambiguate.");
			el.createEl("pre", { text: lines.join("\n") });
			return;
		}

		if (nonEnabledPaths.length > 0) {
			el.createEl("pre", {
				text:
					`Error: blp-view source includes non-enabled files:\n` +
					nonEnabledPaths.map((p) => `- ${p}`).join("\n") +
					`\n\nEnable them via settings folders/files (vault-relative) or frontmatter \`${"blp_enhanced_list: true"}\`.`,
			});
			return;
		}

		if (maxSourceFiles > 0 && sourceFiles.length > maxSourceFiles) {
			el.createEl("pre", {
				text:
					`Error: blp-view would scan ${sourceFiles.length} files (limit: ${maxSourceFiles}).\n` +
					`Narrow \`source\` in the code block or increase the limit in settings.`,
			});
			return;
		}

		// Candidate extraction
		const flattened: Array<{ item: any; ancestorTags: string[]; ancestorLines: number[] }> = [];
		const pageFileByPath = new Map<string, any>();
		let filesScanned = 0;
		for (const f of sourceFiles) {
			if (!isEnhancedListEnabledFile(plugin, f)) {
				// Should not happen due to scope enforcement; fail-safe.
				continue;
			}

			filesScanned++;
			const page = dv.page(f.path, file.path) as any;
			const pageFile = page?.file;
			if (pageFile) {
				if (!pageFile.link) {
					pageFile.link = dv.fileLink(f.path);
				}
				pageFileByPath.set(f.path, pageFile);
			}
			const lists = page?.file?.lists;
			if (!Array.isArray(lists) || lists.length === 0) continue;

			// Dataview's file.lists is already a flat list; traverse only roots to avoid double-counting children.
			const rootsByParent = lists.filter((li: any) => li?.parent == null);
			let roots = rootsByParent.length > 0 ? rootsByParent : lists;

			// Some Dataview versions may not populate `.parent` on list items; fall back to excluding known children.
			if (roots.length === lists.length) {
				const childSet = new Set<any>();
				for (const li of lists) {
					const children: any[] = Array.isArray(li?.children) ? li.children : [];
					for (const c of children) childSet.add(c);
				}

				const rootsByChildren = lists.filter((li: any) => !childSet.has(li));
				if (rootsByChildren.length > 0 && rootsByChildren.length < roots.length) {
					roots = rootsByChildren;
				}
			}

			flattenListItems(roots, [], [], flattened);
		}

		const targets = resolveOutlinkTargets(plugin, file, config.filters?.outlinks);

		const candidatesByKey = new Map<string, BlpViewCandidate>();
		for (const { item, ancestorTags, ancestorLines } of flattened) {
			const blockId = item?.blockId;
			if (typeof blockId !== "string" || !blockId) continue;

			const rawDate = item?.date;
			if (!dv.value.isDate(rawDate)) continue;

			const date = rawDate as DateTime;
			const path = typeof item?.path === "string" ? item.path : file.path;
			const line = typeof item?.line === "number" ? item.line : 0;

			if (!matchesDateFilter(dv, date, config.filters?.date)) continue;

			if (config.filters?.fields?.length) {
				const ok = config.filters.fields.every((f) => matchesFieldFilter(dv, item, f));
				if (!ok) continue;
			}

			if (!matchesTagFilter(item, config.filters?.tags, ancestorTags)) continue;
			if (!matchesOutlinksFilter(plugin, item, config.filters?.outlinks, targets, file.path)) continue;
			if (!matchesSectionFilter(item, config.filters?.section)) continue;

			const candidate: BlpViewCandidate = {
				path,
				line,
				blockId,
				date,
				item,
				ancestorTags,
				ancestorLines: Array.isArray(ancestorLines) ? ancestorLines : [],
			};

			const key = `${path}:${line}:${blockId}`;
			const existing = candidatesByKey.get(key);
			// If a list item was double-counted, prefer the candidate with more hierarchy context.
			if (!existing || candidate.ancestorLines.length > existing.ancestorLines.length) {
				candidatesByKey.set(key, candidate);
			}
		}

		const candidates = [...candidatesByKey.values()];

		const hierarchyMode = config.filters?.hierarchy;
		if (hierarchyMode && hierarchyMode !== "all" && hierarchyMode !== "outermost-match" && hierarchyMode !== "root-only") {
			throw new Error(`blp-view: unsupported filters.hierarchy: ${hierarchyMode}`);
		}

		const filtered = applyHierarchyFilter(candidates, hierarchyMode);
		const sorted = stableSortItems(dv, filtered, config.sort);

		const totalMatches = sorted.length;
		const limited = maxResults > 0 && totalMatches > maxResults ? sorted.slice(0, maxResults) : sorted;
		const truncated = limited.length !== totalMatches;

		const groups = buildGroups(dv, limited, config);

		let markdown =
			config.render.type === "table"
				? renderTable(dv, groups, config, pageFileByPath, file.path)
				: renderEmbedList(groups);

		if (truncated) {
			markdown =
				`> [!warning] blp-view output truncated\n` +
				`> Showing ${limited.length} of ${totalMatches} items (settings max results = ${maxResults}).\n\n` +
				markdown;
		}

		const endMs = Date.now();
		const diagnosticsText =
			`blp-view diagnostics:\n` +
			`- scannedFiles: ${filesScanned}\n` +
			`- listItems: ${flattened.length}\n` +
			`- matched: ${totalMatches}\n` +
			`- rendered: ${limited.length}\n` +
			`- durationMs: ${Math.max(0, endMs - startMs)}`;

		if (config.render.mode === "materialize") {
			if (!allowMaterialize) {
				el.createEl("pre", { text: "Error: render.mode=materialize is disabled in settings." });
				return;
			}
			if (!isEnhancedListEnabledFile(plugin, file)) {
				el.createEl("pre", { text: "Error: render.mode=materialize requires the current file to be enabled." });
				return;
			}

			await materializeOutput(plugin, file, el, ctx, markdown);
			el.empty();
			el.createEl("pre", { text: "blp-view output is materialized below." });
			if (showDiagnostics) {
				el.createEl("pre", { text: diagnosticsText });
			}
			return;
		}

		if (!markdown.trim()) {
			el.createEl("pre", { text: "No items found." });
			if (showDiagnostics) {
				el.createEl("pre", { text: diagnosticsText });
			}
			return;
		}

		await MarkdownRenderer.renderMarkdown(markdown, el, ctx.sourcePath, plugin);
		attachEnhancedListBlockPeekToRenderedBlpViewOutput(plugin, el, { sourcePath: ctx.sourcePath });
		if (showDiagnostics) {
			el.createEl("pre", { text: diagnosticsText });
		}
	} catch (error: any) {
		console.error("Block Link Plus blp-view Error:", error);
		el.empty();
		el.createEl("pre", { text: `blp-view Error: ${error?.message ?? String(error)}` });
	}
}
