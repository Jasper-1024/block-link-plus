import { DateTime } from "luxon";
import { App, TFile } from "obsidian";
import crypto from "crypto";
import {
	buildGroups,
	materializeOutput,
	matchesDateFilter,
	matchesFieldFilter,
	matchesOutlinksFilter,
	matchesSectionFilter,
	matchesTagFilter,
	parseConfig,
	resolveSourceFilesOrError,
	resolveConfigDefaults,
	stableSortItems,
} from "../blp-view";

function createTestDv(nowIso = "2026-01-10T00:00:00Z") {
	const now = DateTime.fromISO(nowIso, { zone: "utc" });

	const comparePrimitive = (a: any, b: any) => {
		if (a === b) return 0;
		return a < b ? -1 : 1;
	};

	return {
		luxon: {
			DateTime: {
				now: () => now,
			},
		},
		date: (raw: string) => {
			const parsed = DateTime.fromISO(raw, { zone: "utc" });
			return parsed.isValid ? parsed : null;
		},
		literal: (v: any) => v,
		value: {
			isTruthy: (v: any) => Boolean(v),
			toString: (v: any) => (DateTime.isDateTime(v) ? v.toISO() : String(v)),
			isDate: (v: any) => DateTime.isDateTime(v),
		},
		compare: (a: any, b: any) => {
			if (DateTime.isDateTime(a) && DateTime.isDateTime(b)) {
				return comparePrimitive(a.toMillis(), b.toMillis());
			}
			return comparePrimitive(a, b);
		},
		equal: (a: any, b: any) => {
			if (DateTime.isDateTime(a) && DateTime.isDateTime(b)) {
				return a.toMillis() === b.toMillis();
			}
			if (Array.isArray(a) && Array.isArray(b)) {
				if (a.length !== b.length) return false;
				return a.every((v, i) => v === b[i]);
			}
			return a === b;
		},
	} as any;
}

describe("enhanced-list-blocks/blp-view config", () => {
	test("defaults: render.type=embed-list, sort=date desc, group=none", () => {
		const resolved = resolveConfigDefaults(parseConfig(""));

		expect(resolved.render.type).toBe("embed-list");
		expect(resolved.render.mode).toBeUndefined();
		expect(resolved.render.columns).toEqual([]);

		expect(resolved.sort.by).toBe("date");
		expect(resolved.sort.order).toBe("desc");

		expect(resolved.group.by).toBe("none");
	});

	test("table render defaults to File+Date columns", () => {
		const resolved = resolveConfigDefaults(
			parseConfig(`
render:
  type: table
`)
		);

		expect(resolved.render.type).toBe("table");
		expect(resolved.render.columns.map((c) => c.name)).toEqual(["File", "Date"]);
	});

	test("unsupported render.mode throws", () => {
		expect(() =>
			resolveConfigDefaults(
				parseConfig(`
render:
  mode: invalid
`)
			)
		).toThrow(/unsupported render\.mode/i);
	});
});

describe("enhanced-list-blocks/blp-view filtering", () => {
	test("tag filter does not inherit from parent (Roam/Logseq semantics)", () => {
		const tagsFilter = { none: ["#tag1"] };
		const parent = { tags: ["#tag1"] };
		const child = { tags: [] };

		expect(matchesTagFilter(parent, tagsFilter as any, [])).toBe(false);
		expect(matchesTagFilter(child, tagsFilter as any, ["#tag1"])).toBe(true);
	});

	test("tags.none_in_ancestors excludes descendants of tagged ancestors", () => {
		const tagsFilter = { none_in_ancestors: ["#archive"] };
		const child = { tags: [] };
		expect(matchesTagFilter(child, tagsFilter as any, ["#archive"])).toBe(false);
	});

	test("outlinks.link_to_current_file requires a link to current file", () => {
		const item = { outlinks: [{ path: "current.md" }] };
		const targets = { any: new Set<string>(), all: new Set<string>(), none: new Set<string>(), requireCurrentFile: true };

		expect(matchesOutlinksFilter(item, { link_to_current_file: true } as any, targets as any, "current.md")).toBe(true);
		expect(matchesOutlinksFilter(item, { link_to_current_file: true } as any, targets as any, "other.md")).toBe(false);
	});

	test("section filter matches Dataview header subpath", () => {
		const item = { section: { type: "header", subpath: "Log" } };
		expect(matchesSectionFilter(item, { any: ["Log"] } as any)).toBe(true);
		expect(matchesSectionFilter(item, { any: ["Other"] } as any)).toBe(false);
		expect(matchesSectionFilter(item, { none: ["Log"] } as any)).toBe(false);
	});

	test("field filter supports has, in, contains", () => {
		const dv = createTestDv();
		expect(matchesFieldFilter(dv, { state: "todo" }, { field: "state", op: "has" } as any)).toBe(true);
		expect(matchesFieldFilter(dv, { state: "todo" }, { field: "state", op: "in", value: ["todo", "doing"] } as any)).toBe(true);
		expect(matchesFieldFilter(dv, { title: "hello world" }, { field: "title", op: "contains", value: "world" } as any)).toBe(true);
		expect(matchesFieldFilter(dv, { tags: ["a", "b"] }, { field: "tags", op: "contains", value: "b" } as any)).toBe(true);
	});

	test("date filter supports within_days/after/before/between with strict bounds", () => {
		const dv = createTestDv("2026-01-10T00:00:00Z");
		const d1 = DateTime.fromISO("2026-01-09T00:00:00Z");
		const d2 = DateTime.fromISO("2026-01-01T00:00:00Z");

		expect(matchesDateFilter(dv, d1, { within_days: 7 } as any)).toBe(true);
		expect(matchesDateFilter(dv, d2, { within_days: 7 } as any)).toBe(false);

		expect(matchesDateFilter(dv, d1, { after: "2026-01-09T00:00:00Z" } as any)).toBe(false);
		expect(matchesDateFilter(dv, d1, { before: "2026-01-09T00:00:00Z" } as any)).toBe(false);
		expect(matchesDateFilter(dv, d1, { after: "2026-01-08T00:00:00Z" } as any)).toBe(true);
		expect(matchesDateFilter(dv, d1, { before: "2026-01-10T00:00:00Z" } as any)).toBe(true);

		expect(matchesDateFilter(dv, d1, { between: ["2026-01-08T00:00:00Z", "2026-01-10T00:00:00Z"] } as any)).toBe(true);
		expect(matchesDateFilter(dv, d1, { between: { after: "2026-01-09T00:00:00Z", before: "2026-01-10T00:00:00Z" } } as any)).toBe(false);
	});
});

describe("enhanced-list-blocks/blp-view grouping + sorting", () => {
	test("stable sorting breaks ties by path/line/blockId", () => {
		const dv = createTestDv();
		const date = DateTime.fromISO("2026-01-01T00:00:00Z");

		const items = [
			{ path: "b.md", line: 2, blockId: "b", date, item: {}, ancestorTags: [] },
			{ path: "a.md", line: 3, blockId: "c", date, item: {}, ancestorTags: [] },
			{ path: "a.md", line: 2, blockId: "d", date, item: {}, ancestorTags: [] },
			{ path: "a.md", line: 2, blockId: "a", date, item: {}, ancestorTags: [] },
		] as any[];

		const sorted = stableSortItems(dv, items as any, { by: "date", order: "desc" } as any);
		expect(sorted.map((i) => `${i.path}:${i.line}:${i.blockId}`)).toEqual([
			"a.md:2:a",
			"a.md:2:d",
			"a.md:3:c",
			"b.md:2:b",
		]);
	});

	test("group.by=field uses scheme A (multi-value splits into multiple groups)", () => {
		const dv = createTestDv();
		const date = DateTime.fromISO("2026-01-01T00:00:00Z");

		const candidates = [
			{ path: "a.md", line: 1, blockId: "x", date, item: { project: ["A", "B"] }, ancestorTags: [] },
		] as any;

		const config = resolveConfigDefaults(
			parseConfig(`
group:
  by: field
  field: project
`)
		);

		const groups = buildGroups(dv, candidates, config as any);
		const keys = groups.map((g) => g.key).sort();
		expect(keys).toEqual(["A", "B"]);
	});
});

describe("enhanced-list-blocks/blp-view materialize", () => {
	test("no-op when existing region hash and content match", async () => {
		const markdown = "generated";
		const hash = crypto.createHash("sha256").update(markdown).digest("hex");

		const fileContent = [
			"# Note",
			"",
			"```blp-view",
			"render: { mode: materialize }",
			"```",
			"",
			`%% blp-view-start data-hash=\"${hash}\" %%`,
			markdown,
			"%% blp-view-end %%",
			"tail",
		].join("\n");

		const modify = jest.fn(async () => {});
		const plugin = { app: { vault: { read: jest.fn(async () => fileContent), modify } } } as any;
		const file = new TFile();
		file.path = "note.md";
		const ctx = { getSectionInfo: () => ({ lineEnd: 4 }) } as any;

		await materializeOutput(plugin, file, document.createElement("div"), ctx, markdown);
		expect(modify).not.toHaveBeenCalled();
	});

	test("overwrites when region hash matches but content diverged", async () => {
		const markdown = "generated";
		const hash = crypto.createHash("sha256").update(markdown).digest("hex");

		const fileContent = [
			"# Note",
			"",
			"```blp-view",
			"render: { mode: materialize }",
			"```",
			"",
			`%% blp-view-start data-hash=\"${hash}\" %%`,
			"MANUAL EDIT",
			"%% blp-view-end %%",
			"tail",
		].join("\n");

		let written = "";
		const modify = jest.fn(async (_file: any, next: string) => {
			written = next;
		});

		const plugin = { app: { vault: { read: jest.fn(async () => fileContent), modify } } } as any;
		const file = new TFile();
		file.path = "note.md";
		const ctx = { getSectionInfo: () => ({ lineEnd: 4 }) } as any;

		await materializeOutput(plugin, file, document.createElement("div"), ctx, markdown);
		expect(modify).toHaveBeenCalledTimes(1);
		expect(written).toContain(markdown);
		expect(written).not.toContain("MANUAL EDIT");
	});

	test("inserts region when missing", async () => {
		const markdown = "generated";

		const fileContent = [
			"# Note",
			"",
			"```blp-view",
			"render: { mode: materialize }",
			"```",
			"tail",
		].join("\n");

		let written = "";
		const modify = jest.fn(async (_file: any, next: string) => {
			written = next;
		});

		const plugin = { app: { vault: { read: jest.fn(async () => fileContent), modify } } } as any;
		const file = new TFile();
		file.path = "note.md";
		const ctx = { getSectionInfo: () => ({ lineEnd: 4 }) } as any;

		await materializeOutput(plugin, file, document.createElement("div"), ctx, markdown);
		expect(modify).toHaveBeenCalledTimes(1);
		expect(written).toContain("%% blp-view-start");
		expect(written).toContain(markdown);
		expect(written).toContain("%% blp-view-end %%");
	});
});

describe("enhanced-list-blocks/blp-view source resolution", () => {
	test("resolves source.files by basename via vault fallback when metadataCache cannot resolve", () => {
		const app = new App();
		const dataPath = "Review/day/2026/1/BLP/data/BLP Data 01 - Daily Logs A.md";
		(app.vault as any)._addFile(dataPath, "");

		const currentFile = new TFile();
		currentFile.path = "Review/day/2026/1/BLP/10 - blp-view.md";

		(app.metadataCache as any).getFirstLinkpathDest = jest.fn(() => null);

		const plugin = {
			app,
			settings: {
				enhancedListEnabledFolders: ["Review"],
				enhancedListEnabledFiles: [],
			},
		} as any;

		const res = resolveSourceFilesOrError(plugin, {} as any, currentFile as any, {
			files: ["[[BLP Data 01 - Daily Logs A]]"],
		} as any);

		expect(res.missingPaths).toEqual([]);
		expect(res.ambiguousFiles).toEqual([]);
		expect(res.nonEnabledPaths).toEqual([]);
		expect(res.files.map((f: any) => f.path)).toEqual([dataPath]);
	});

	test("reports missingPaths when source.files cannot be resolved", () => {
		const app = new App();
		const currentFile = new TFile();
		currentFile.path = "Review/day/2026/1/BLP/10 - blp-view.md";
		(app.metadataCache as any).getFirstLinkpathDest = jest.fn(() => null);

		const plugin = {
			app,
			settings: {
				enhancedListEnabledFolders: ["Review"],
				enhancedListEnabledFiles: [],
			},
		} as any;

		const res = resolveSourceFilesOrError(plugin, {} as any, currentFile as any, {
			files: ["[[Does Not Exist]]"],
		} as any);

		expect(res.files).toEqual([]);
		expect(res.ambiguousFiles).toEqual([]);
		expect(res.missingPaths).toEqual(["Does Not Exist"]);
	});

	test("reports ambiguousFiles when basename matches multiple files", () => {
		const app = new App();
		(app.vault as any)._addFile("Review/A/Same Name.md", "");
		(app.vault as any)._addFile("Review/B/Same Name.md", "");

		const currentFile = new TFile();
		currentFile.path = "Review/day/2026/1/BLP/10 - blp-view.md";
		(app.metadataCache as any).getFirstLinkpathDest = jest.fn(() => null);

		const plugin = {
			app,
			settings: {
				enhancedListEnabledFolders: ["Review"],
				enhancedListEnabledFiles: [],
			},
		} as any;

		const res = resolveSourceFilesOrError(plugin, {} as any, currentFile as any, {
			files: ["[[Same Name]]"],
		} as any);

		expect(res.files).toEqual([]);
		expect(res.missingPaths).toEqual([]);
		expect(res.ambiguousFiles).toEqual([
			{
				input: "Same Name",
				matches: ["Review/A/Same Name.md", "Review/B/Same Name.md"],
			},
		]);
	});
});
