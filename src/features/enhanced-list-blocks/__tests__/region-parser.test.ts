import { findManagedRegion, REGION_END_MARKER, REGION_START_MARKER_PREFIX } from "../region-parser";

describe("enhanced-list-blocks/region-parser", () => {
	test("finds managed region after code block", () => {
		const content = [
			"# Note",
			"",
			"```blp-view",
			"render: { mode: materialize }",
			"```",
			"",
			`${REGION_START_MARKER_PREFIX} data-hash=\"abc\" %%`,
			"generated",
			REGION_END_MARKER,
			"tail",
		].join("\n");

		const region = findManagedRegion(content, 4);
		expect(region).not.toBeNull();
		expect(region?.regionStartLine).toBe(6);
		expect(region?.regionEndLine).toBe(8);
		expect(region?.existingHash).toBe("abc");
	});
});

