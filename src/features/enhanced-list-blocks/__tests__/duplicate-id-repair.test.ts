import { Settings } from "luxon";
import { repairDuplicateEnhancedListIds } from "../duplicate-id-repair";

describe("enhanced-list-blocks/duplicate-id-repair", () => {
	const originalNow = Settings.now;
	const originalZone = Settings.defaultZone;
	const originalRandom = Math.random;

	afterEach(() => {
		Settings.now = originalNow;
		Settings.defaultZone = originalZone;
		Math.random = originalRandom;
	});

	test("keeps first id and rewrites duplicates", () => {
		Settings.defaultZone = "utc";
		Settings.now = () => Date.parse("2026-01-09T10:20:30Z");
		let calls = 0;
		Math.random = () => {
			calls += 1;
			return calls === 1 ? 0.111111 : 0.222222;
		};

		const plugin = {
			settings: {
				enable_prefix: false,
				id_prefix: "",
				id_length: 4,
			},
		} as any;

		const content = [
			"- foo",
			"  [date:: 2026-01-01T00:00:00] ^abcd",
			"- bar",
			"  [date:: 2026-01-02T00:00:00] ^abcd",
		].join("\n");

		const repaired = repairDuplicateEnhancedListIds(content, plugin);

		// First occurrence remains.
		expect(repaired).toContain("^abcd");

		// Duplicate rewritten to a new id and date.
		const systemLines = repaired
			.split("\n")
			.filter((l) => l.includes("[date::") && l.includes("^"));
		expect(systemLines.length).toBe(2);
		expect(systemLines[0]).toContain("^abcd");
		expect(systemLines[1]).not.toContain("^abcd");
		expect(systemLines[1]).toContain("[date:: 2026-01-09T10:20:30]");
	});

	test("no duplicates is a no-op", () => {
		const plugin = {
			settings: {
				enable_prefix: false,
				id_prefix: "",
				id_length: 4,
			},
		} as any;

		const content = [
			"- foo",
			"  [date:: 2026-01-01T00:00:00] ^a1b2",
			"- bar",
			"  [date:: 2026-01-02T00:00:00] ^c3d4",
		].join("\n");

		expect(repairDuplicateEnhancedListIds(content, plugin)).toBe(content);
	});
});
