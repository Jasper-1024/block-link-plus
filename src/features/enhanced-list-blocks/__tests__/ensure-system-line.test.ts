import { Settings } from "luxon";
import { MockEditor } from "../../../test-utils/MockEditor";
import { ensureEnhancedListSystemLineForActiveListItem } from "../ensure-system-line";

describe("enhanced-list-blocks/ensure-system-line", () => {
	const originalNow = Settings.now;
	const originalZone = Settings.defaultZone;

	afterEach(() => {
		Settings.now = originalNow;
		Settings.defaultZone = originalZone;
	});

	test("inserts system line for a single list item at end-of-doc", () => {
		Settings.defaultZone = "utc";
		Settings.now = () => Date.parse("2026-01-10T00:00:00Z");

		const plugin = {
			settings: {
				enable_prefix: false,
				id_prefix: "",
				id_length: 4,
			},
		} as any;

		const editor = new MockEditor("- a");
		editor.setCursor(0, editor.getLine(0).length);

		const link = ensureEnhancedListSystemLineForActiveListItem(plugin, editor as any);
		expect(link).toMatch(/^\^[a-z0-9]{4}$/);

		expect(editor.getValue()).toMatch(
			/^- a\n  \[date:: 2026-01-10T00:00:00\] \^[a-z0-9]{4}$/
		);

		const before = editor.getValue();
		const link2 = ensureEnhancedListSystemLineForActiveListItem(plugin, editor as any);
		expect(link2).toBe(link);
		expect(editor.getValue()).toBe(before);
	});

	test("relocates system line if placed after child lists", () => {
		const plugin = {
			settings: {
				enable_prefix: false,
				id_prefix: "",
				id_length: 4,
			},
		} as any;

		const editor = new MockEditor(
			["- parent", "  - child", "  [date:: 2026-01-01T00:00:00] ^abc"].join("\n")
		);
		editor.setCursor(0, editor.getLine(0).length);

		const link = ensureEnhancedListSystemLineForActiveListItem(plugin, editor as any);
		expect(link).toBe("^abc");
		expect(editor.getValue()).toBe(
			["- parent", "  [date:: 2026-01-01T00:00:00] ^abc", "  - child"].join("\n")
		);
	});
});

