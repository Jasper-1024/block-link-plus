import { TFile, Vault } from "obsidian";
import moment from "moment";

import { chooseStartIndex, resolveDailySources } from "../daily-sources";

function makeFile(path: string): TFile {
	// Obsidian's type defs do not expose TFile's constructor args; use `any` for tests.
	return new (TFile as any)(path) as TFile;
}

describe("journal-feed-view daily sources", () => {
	test("resolveDailySources returns error when Daily Notes disabled", () => {
		const app: any = {
			internalPlugins: {
				getPluginById: () => ({ enabled: false, instance: null }),
			},
		};

		expect(resolveDailySources(app)).toEqual({ ok: false, reason: "Daily Notes is disabled or unavailable." });
	});

	test("resolveDailySources sorts descending and filters invalid entries", () => {
		const f1 = makeFile("Daily/2026-04-07.md");
		const f2 = makeFile("Daily/2026-04-06.md");
		const f3 = makeFile("Daily/ignore.txt");

		const inst: any = {
			getFolder: () => ({ path: "Daily" }),
			getFormat: () => "YYYY-MM-DD",
			iterateDailyNotes: (cb: any) => {
				cb(f2, 2000);
				cb(f1, 3000);
				cb(f3, 4000); // filtered by extension
				cb(f1, "not-a-number"); // filtered by ts
			},
		};

		const app: any = {
			internalPlugins: {
				getPluginById: () => ({ enabled: true, instance: inst }),
			},
		};

		const resolved = resolveDailySources(app);
		expect(resolved.ok).toBe(true);
		if (!resolved.ok) return;

		expect(resolved.folderPath).toBe("Daily");
		expect(resolved.format).toBe("YYYY-MM-DD");
		expect(resolved.sources.map((s) => [s.file.path, s.ts])).toEqual([
			["Daily/2026-04-07.md", 3000],
			["Daily/2026-04-06.md", 2000],
		]);
	});

	test("resolveDailySources scans nested daily notes when format includes subfolders", () => {
		const vault = new Vault() as any;
		vault._addFile("Review/Daily/2026/2/2026-2-22.md", "# 22");
		vault._addFile("Review/Daily/2026/2/2026-2-23.md", "# 23");
		vault._addFile("Review/Other/2026/2/2026-2-24.md", "# ignore");
		vault._addFile("Review/Daily/2026/2/not-a-day.md", "# ignore");

		const format = "YYYY/M/YYYY-M-D";
		const inst: any = {
			getFolder: () => ({ path: "Review/Daily" }),
			getFormat: () => format,
			iterateDailyNotes: () => {
				// Simulate upstream iterator missing nested-format notes.
			},
		};

		const app: any = {
			vault,
			internalPlugins: {
				getPluginById: () => ({ enabled: true, instance: inst }),
			},
		};

		const resolved = resolveDailySources(app);
		expect(resolved.ok).toBe(true);
		if (!resolved.ok) return;

		const ts23 = moment("2026/2/2026-2-23", format, true).startOf("day").valueOf();
		const ts22 = moment("2026/2/2026-2-22", format, true).startOf("day").valueOf();

		expect(resolved.sources.map((s) => [s.file.path, s.ts])).toEqual([
			["Review/Daily/2026/2/2026-2-23.md", ts23],
			["Review/Daily/2026/2/2026-2-22.md", ts22],
		]);
	});

	test("chooseStartIndex prefers exact match then first <= today", () => {
		const s0 = { file: makeFile("d0.md"), ts: 3000 };
		const s1 = { file: makeFile("d1.md"), ts: 2000 };
		const s2 = { file: makeFile("d2.md"), ts: 1000 };
		const sources = [s0, s1, s2];

		expect(chooseStartIndex(sources, { todayTs: 2000 })).toBe(1);
		expect(chooseStartIndex(sources, { todayTs: 2500 })).toBe(1);
		expect(chooseStartIndex(sources, { todayTs: 500 })).toBe(0);
	});
});
