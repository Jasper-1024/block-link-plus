import { App, TFile } from "obsidian";

import {
	getJournalFeedConfigFromAnchor,
	getJournalFeedConfigFromText,
	isJournalFeedAnchorFile,
	isJournalFeedAnchorFileMaybeRead,
} from "../anchor";

function setFrontmatter(app: App, file: TFile, fm: Record<string, unknown>): void {
	(app.metadataCache as any)._setFileCache(file, { frontmatter: fm } as any);
}

function makeFile(path: string): TFile {
	// Obsidian's type defs do not expose TFile's constructor args; use `any` for tests.
	return new (TFile as any)(path) as TFile;
}

describe("journal-feed-view anchor", () => {
	test("detects blp_journal_view: true", () => {
		const app = new App();
		const plugin = { app } as any;
		const file = makeFile("anchor.md");

		setFrontmatter(app, file, { blp_journal_view: true });
		expect(isJournalFeedAnchorFile(plugin, file)).toBe(true);
	});

	test("supports string/number truthy values", () => {
		const app = new App();
		const plugin = { app } as any;
		const file = makeFile("anchor.md");

		setFrontmatter(app, file, { blp_journal_view: "true" });
		expect(isJournalFeedAnchorFile(plugin, file)).toBe(true);

		setFrontmatter(app, file, { blp_journal_view: 1 });
		expect(isJournalFeedAnchorFile(plugin, file)).toBe(true);
	});

	test("rejects non-markdown files and missing key", () => {
		const app = new App();
		const plugin = { app } as any;
		const file = makeFile("anchor.txt");

		setFrontmatter(app, file, { blp_journal_view: true });
		expect(isJournalFeedAnchorFile(plugin, file)).toBe(false);

		const md = makeFile("anchor.md");
		setFrontmatter(app, md, { other: true });
		expect(isJournalFeedAnchorFile(plugin, md)).toBe(false);
	});

	test("parses per-anchor config with defaults", () => {
		const app = new App();
		const plugin = { app } as any;

		expect(getJournalFeedConfigFromAnchor(plugin, null)).toEqual({ initialDays: 3, pageSize: 7 });
		expect(getJournalFeedConfigFromText(null)).toEqual({ initialDays: 3, pageSize: 7 });

		const file = makeFile("anchor.md");
		setFrontmatter(app, file, { blp_journal_initial_days: 5, blp_journal_page_size: "14" });
		expect(getJournalFeedConfigFromAnchor(plugin, file)).toEqual({ initialDays: 5, pageSize: 14 });
		expect(getJournalFeedConfigFromText("---\nblp_journal_initial_days: 5\nblp_journal_page_size: 14\n---\n")).toEqual({ initialDays: 5, pageSize: 14 });

		setFrontmatter(app, file, { blp_journal_initial_days: 0, blp_journal_page_size: -1 });
		expect(getJournalFeedConfigFromAnchor(plugin, file)).toEqual({ initialDays: 3, pageSize: 7 });
		expect(getJournalFeedConfigFromText("---\nblp_journal_initial_days: 0\nblp_journal_page_size: -1\n---\n")).toEqual({ initialDays: 3, pageSize: 7 });
	});

	test("falls back to parsing frontmatter from text when metadata is missing", async () => {
		const app = new App();
		const plugin = { app } as any;

		const file = (app.vault as any)._addFile("anchor.md", "---\nblp_journal_view: true\n---\n\n# Anchor\n");
		expect(isJournalFeedAnchorFile(plugin, file)).toBe(false);
		await expect(isJournalFeedAnchorFileMaybeRead(plugin, file)).resolves.toBe(true);

		const nonAnchor = (app.vault as any)._addFile("nope.md", "# No frontmatter\n");
		await expect(isJournalFeedAnchorFileMaybeRead(plugin, nonAnchor)).resolves.toBe(false);
	});
});
