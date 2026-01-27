import { Settings } from "luxon";
import { normalizeEnhancedListContentOnSave } from "../normalize-on-save";

describe("enhanced-list-blocks/normalize-on-save", () => {
	const originalNow = Settings.now;
	const originalZone = Settings.defaultZone;

	afterEach(() => {
		Settings.now = originalNow;
		Settings.defaultZone = originalZone;
	});

	test("merges split system line only for touched list items", () => {
		const plugin = {
			app: { vault: { config: { tabSize: 2 } } },
			settings: {
				enhancedListNormalizeOnSave: true,
				enhancedListNormalizeTabsToSpaces: false,
				enhancedListNormalizeMergeSplitSystemLine: true,
				enhancedListNormalizeSystemLineIndent: false,
				enhancedListNormalizeEnsureSystemLineForTouchedItems: false,
				enable_prefix: false,
				id_prefix: "",
				id_length: 4,
			},
		} as any;

		const content = [
			"- a",
			"  [date:: 2026-01-26T16:01:21]",
			"  ^7fp1",
			"- b",
			"  [date:: 2026-01-26T16:02:22]",
			"  ^zzzz",
		].join("\n");

		const to = Math.max(0, content.indexOf("\n- b") - 1);
		const out = normalizeEnhancedListContentOnSave(content, plugin, {
			dirtyRanges: [{ from: 0, to }],
		});

		expect(out).toBe(
			[
				"- a",
				"  [date:: 2026-01-26T16:01:21] ^7fp1",
				"- b",
				"  [date:: 2026-01-26T16:02:22]",
				"  ^zzzz",
			].join("\n")
		);
	});

	test("converts leading tabs to spaces only within touched list items", () => {
		const plugin = {
			app: { vault: { config: { tabSize: 2 } } },
			settings: {
				enhancedListNormalizeOnSave: true,
				enhancedListNormalizeTabsToSpaces: true,
				enhancedListNormalizeTabSize: 2,
				enhancedListNormalizeMergeSplitSystemLine: false,
				enhancedListNormalizeSystemLineIndent: false,
				enhancedListNormalizeEnsureSystemLineForTouchedItems: false,
				enable_prefix: false,
				id_prefix: "",
				id_length: 4,
			},
		} as any;

		const content = ["- parent", "\t- a", "\t\tcontinued", "- b", "\t- c"].join("\n");
		const from = content.indexOf("\t- a");
		const to = from + "\t- a".length;

		const out = normalizeEnhancedListContentOnSave(content, plugin, {
			dirtyRanges: [{ from, to }],
		});

		expect(out).toBe(["- parent", "  - a", "    continued", "- b", "\t- c"].join("\n"));
	});

	test("does not change list nesting when converting tabs to spaces", () => {
		const plugin = {
			app: { vault: { config: { tabSize: 2 } } },
			settings: {
				enhancedListNormalizeOnSave: true,
				enhancedListNormalizeTabsToSpaces: true,
				enhancedListNormalizeTabSize: 2,
				enhancedListNormalizeCleanupInvalidSystemLines: false,
				enhancedListNormalizeMergeSplitSystemLine: false,
				enhancedListNormalizeSystemLineIndent: false,
				enhancedListNormalizeEnsureSystemLineForTouchedItems: false,
				enable_prefix: false,
				id_prefix: "",
				id_length: 4,
			},
		} as any;

		const content = ["- top", "  - parent", "\t- child"].join("\n");
		const from = content.indexOf("\t- child");
		const to = from + "\t- child".length;

		const out = normalizeEnhancedListContentOnSave(content, plugin, {
			dirtyRanges: [{ from, to }],
		});

		// Preserve nesting: `\t- child` under `  - parent` stays nested after normalization.
		expect(out).toBe(["- top", "  - parent", "    - child"].join("\n"));
	});

	test("converts tab-indented system line to continuation indent (tab=4 columns)", () => {
		const plugin = {
			app: { vault: { config: { tabSize: 2 } } },
			settings: {
				enhancedListNormalizeOnSave: true,
				enhancedListNormalizeTabsToSpaces: true,
				enhancedListNormalizeMergeSplitSystemLine: false,
				enhancedListNormalizeSystemLineIndent: true,
				enhancedListNormalizeEnsureSystemLineForTouchedItems: false,
				enable_prefix: false,
				id_prefix: "",
				id_length: 4,
			},
		} as any;

		const content = ["- parent", "  - child", "\t[date:: 2026-01-26T18:46:24] ^338t"].join("\n");
		const from = content.indexOf("  - child");
		const to = from + "  - child".length;

		const out = normalizeEnhancedListContentOnSave(content, plugin, {
			dirtyRanges: [{ from, to }],
		});

		expect(out).toBe(
			["- parent", "  - child", "    [date:: 2026-01-26T18:46:24] ^338t"].join("\n")
		);
	});

	test("fixes existing system line indentation to continuation indent", () => {
		const plugin = {
			app: { vault: { config: { tabSize: 2 } } },
			settings: {
				enhancedListNormalizeOnSave: true,
				enhancedListNormalizeTabsToSpaces: false,
				enhancedListNormalizeMergeSplitSystemLine: false,
				enhancedListNormalizeSystemLineIndent: true,
				enhancedListNormalizeEnsureSystemLineForTouchedItems: false,
				enable_prefix: false,
				id_prefix: "",
				id_length: 4,
			},
		} as any;

		const content = ["- a", "[date:: 2026-01-26T16:01:21] ^7fp1", "- b"].join("\n");
		const to = Math.max(0, content.indexOf("\n- b") - 1);

		const out = normalizeEnhancedListContentOnSave(content, plugin, {
			dirtyRanges: [{ from: 0, to }],
		});

		expect(out).toBe(["- a", "  [date:: 2026-01-26T16:01:21] ^7fp1", "- b"].join("\n"));
	});

	test("inserts missing system line for touched list item and keeps others unchanged", () => {
		Settings.defaultZone = "utc";
		Settings.now = () => Date.parse("2026-01-10T00:00:00Z");

		const plugin = {
			app: { vault: { config: { tabSize: 2 } } },
			settings: {
				enhancedListNormalizeOnSave: true,
				enhancedListNormalizeTabsToSpaces: false,
				enhancedListNormalizeMergeSplitSystemLine: false,
				enhancedListNormalizeSystemLineIndent: false,
				enhancedListNormalizeEnsureSystemLineForTouchedItems: true,
				enable_prefix: false,
				id_prefix: "",
				id_length: 4,
			},
		} as any;

		const content = ["- a", "  - child", "- b", "  - child2"].join("\n");
		const from = content.indexOf("- b");
		const to = from + "- b".length;

		const out = normalizeEnhancedListContentOnSave(content, plugin, {
			dirtyRanges: [{ from, to }],
		});

		expect(out).toMatch(
			/^- a\n  - child\n- b\n  \[date:: 2026-01-10T00:00:00\] \^[a-zA-Z0-9_-]+\n  - child2$/
		);
	});

	test("moves misplaced system line above child lists for touched item", () => {
		const plugin = {
			app: { vault: { config: { tabSize: 2 } } },
			settings: {
				enhancedListNormalizeOnSave: true,
				enhancedListNormalizeTabsToSpaces: false,
				enhancedListNormalizeMergeSplitSystemLine: false,
				enhancedListNormalizeSystemLineIndent: false,
				enhancedListNormalizeEnsureSystemLineForTouchedItems: true,
				enable_prefix: false,
				id_prefix: "",
				id_length: 4,
			},
		} as any;

		const content = [
			"- a",
			"  - child",
			"  [date:: 2026-01-01T00:00:00] ^abc",
			"- b",
		].join("\n");
		const to = "- a".length;

		const out = normalizeEnhancedListContentOnSave(content, plugin, {
			dirtyRanges: [{ from: 0, to }],
		});

		expect(out).toBe(
			[
				"- a",
				"  [date:: 2026-01-01T00:00:00] ^abc",
				"  - child",
				"- b",
			].join("\n")
		);
	});

	test("keeps an already-normalized nested list unchanged", () => {
		const plugin = {
			app: { vault: { config: { tabSize: 2 } } },
			settings: {
				enhancedListNormalizeOnSave: true,
				enhancedListNormalizeTabsToSpaces: true,
				enhancedListNormalizeCleanupInvalidSystemLines: true,
				enhancedListNormalizeMergeSplitSystemLine: true,
				enhancedListNormalizeSystemLineIndent: true,
				enhancedListNormalizeEnsureSystemLineForTouchedItems: true,
				enable_prefix: false,
				id_prefix: "",
				id_length: 4,
			},
		} as any;

		const content = [
			"- [[clixon 接管 OS 内存]]",
			"  [date:: 2026-01-26T15:48:26] ^nw4p",
			"  - 但是",
			"    [date:: 2026-01-26T18:46:24] ^338t",
			"  - 这就轻松多了, 只管大页配置...也没有内置模板",
			"    [date:: 2026-01-26T18:46:51] ^b6bd",
			"  - Yang-General Settings 增加大页的统一管理 [[clixon 接管 OS 内存]] #memo",
			"    [date:: 2026-01-26T18:46:51] ^fks6",
			"  - 做到 vpp prestart 脚本, 干掉 `apps/x86_64_COTS/prestart/prestart.sh` [[clixon 接管 OS 内存]] #memo",
			"    [date:: 2026-01-26T18:46:51] ^kqk9",
			"    - 23",
			"      [date:: 2026-01-26T18:46:24] ^b4pm",
			"  - 232",
			"    [date:: 2026-01-26T18:44:48] ^cmrd",
		].join("\n");

		const out = normalizeEnhancedListContentOnSave(content, plugin, {
			dirtyRanges: [{ from: 0, to: content.length }],
		});

		expect(out).toBe(content);
	});

	test("fixes broken-indentation system line (indent=0) when only the system line was touched", () => {
		const plugin = {
			app: { vault: { config: { tabSize: 2 } } },
			settings: {
				enhancedListNormalizeOnSave: true,
				enhancedListNormalizeTabsToSpaces: false,
				enhancedListNormalizeCleanupInvalidSystemLines: false,
				enhancedListNormalizeMergeSplitSystemLine: false,
				enhancedListNormalizeSystemLineIndent: true,
				enhancedListNormalizeEnsureSystemLineForTouchedItems: false,
				enable_prefix: false,
				id_prefix: "",
				id_length: 4,
			},
		} as any;

		const content = ["- a", "[date:: 2026-01-26T16:01:21] ^7fp1", "- b"].join("\n");
		const from = content.indexOf("[date::");
		const to = from + "[date:: 2026-01-26T16:01:21] ^7fp1".length;

		const out = normalizeEnhancedListContentOnSave(content, plugin, {
			dirtyRanges: [{ from, to }],
		});

		expect(out).toBe(["- a", "  [date:: 2026-01-26T16:01:21] ^7fp1", "- b"].join("\n"));
	});

	test("cleans up orphan and duplicate system lines for touched list item", () => {
		const plugin = {
			app: { vault: { config: { tabSize: 2 } } },
			settings: {
				enhancedListNormalizeOnSave: true,
				enhancedListNormalizeTabsToSpaces: false,
				enhancedListNormalizeCleanupInvalidSystemLines: true,
				enhancedListNormalizeMergeSplitSystemLine: false,
				enhancedListNormalizeSystemLineIndent: true,
				enhancedListNormalizeEnsureSystemLineForTouchedItems: false,
				enable_prefix: false,
				id_prefix: "",
				id_length: 4,
			},
		} as any;

		const content = [
			"----",
			"  [date:: 2026-01-27T10:54:31] ^j8m6",
			"- 内存故障",
			"  [date:: 2026-01-27T10:58:27] ^2ujj",
			"  [date:: 2026-01-27T10:58:27] ^qgxx",
		].join("\n");

		const from = content.indexOf("- 内存故障");
		const to = from + "- 内存故障".length;

		const out = normalizeEnhancedListContentOnSave(content, plugin, {
			dirtyRanges: [{ from, to }],
		});

		expect(out).toBe(["----", "- 内存故障", "  [date:: 2026-01-27T10:58:27] ^2ujj"].join("\n"));
	});

	test("treats parents as touched when editing a child list item", () => {
		Settings.defaultZone = "utc";
		Settings.now = () => Date.parse("2026-01-10T00:00:00Z");

		const plugin = {
			app: { vault: { config: { tabSize: 2 } } },
			settings: {
				enhancedListNormalizeOnSave: true,
				enhancedListNormalizeTabsToSpaces: false,
				enhancedListNormalizeCleanupInvalidSystemLines: false,
				enhancedListNormalizeMergeSplitSystemLine: false,
				enhancedListNormalizeSystemLineIndent: true,
				enhancedListNormalizeEnsureSystemLineForTouchedItems: true,
				enable_prefix: false,
				id_prefix: "",
				id_length: 4,
			},
		} as any;

		const content = ["- parent", "  - child"].join("\n");
		const from = content.indexOf("  - child");
		const to = from + "  - child".length;

		const out = normalizeEnhancedListContentOnSave(content, plugin, {
			dirtyRanges: [{ from, to }],
		});

		expect(out).toMatch(
			/^- parent\n  \[date:: 2026-01-10T00:00:00\] \^[a-zA-Z0-9_-]+\n  - child\n    \[date:: 2026-01-10T00:00:00\] \^[a-zA-Z0-9_-]+$/
		);
	});
});
