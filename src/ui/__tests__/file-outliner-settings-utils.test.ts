import { dedupeKeepOrder, normalizePluginId } from "../file-outliner-settings-utils";

describe("file outliner settings utils", () => {
	test("dedupeKeepOrder preserves first occurrence order", () => {
		expect(dedupeKeepOrder(["a", "b", "a", "c", "b"])).toEqual(["a", "b", "c"]);
	});

	test("normalizePluginId trims and lowercases", () => {
		expect(normalizePluginId("  MetaData-Menu  ")).toBe("metadata-menu");
		expect(normalizePluginId("")).toBe("");
	});
});

