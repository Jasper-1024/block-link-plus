import { Settings } from "luxon";
import { preprocessEnhancedListContentForSave } from "../save-preprocessor-core";

describe("enhanced-list-blocks/save-preprocessor-core", () => {
	const originalNow = Settings.now;
	const originalZone = Settings.defaultZone;
	const originalRandom = Math.random;

	afterEach(() => {
		Settings.now = originalNow;
		Settings.defaultZone = originalZone;
		Math.random = originalRandom;
	});

	test("normalizes on save (touched ranges) then repairs duplicate system line ids", () => {
		Settings.defaultZone = "utc";
		Settings.now = () => Date.parse("2026-01-09T10:20:30Z");
		Math.random = () => 0.111111;

		const plugin = {
			app: { vault: { config: { tabSize: 2 } } },
			settings: {
				enhancedListNormalizeOnSave: true,
				enhancedListNormalizeTabsToSpaces: false,
				enhancedListNormalizeTabSize: 2,
				enhancedListNormalizeCleanupInvalidSystemLines: false,
				enhancedListNormalizeMergeSplitSystemLine: false,
				enhancedListNormalizeSystemLineIndent: true,
				enhancedListNormalizeEnsureSystemLineForTouchedItems: false,
				enable_prefix: false,
				id_prefix: "",
				id_length: 4,
			},
		} as any;

		const content = [
			"- a",
			"[date:: 2026-01-26T16:01:21] ^abcd",
			"- b",
			"  [date:: 2026-01-26T16:02:00] ^abcd",
		].join("\n");

		const to = Math.max(0, content.indexOf("\n- b") - 1);
		const out = preprocessEnhancedListContentForSave(content, plugin, { dirtyRanges: [{ from: 0, to }] });

		expect(out).toContain("  [date:: 2026-01-26T16:01:21] ^abcd");
		expect(out).not.toContain("\n[date:: 2026-01-26T16:01:21] ^abcd\n");

		// Duplicate rewritten with a new id and current save-time date.
		expect(out).toContain("[date:: 2026-01-09T10:20:30]");
		expect(out).toContain("^3zzz");
	});
});
