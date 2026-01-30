import { BetterListsStyles } from "../../../vendor/vslinko/obsidian-outliner/features/BetterListsStyles";
import { VerticalLines } from "../../../vendor/vslinko/obsidian-outliner/features/VerticalLines";
import { Settings } from "../../../vendor/vslinko/obsidian-outliner/services/Settings";

function resetBodyClass() {
	document.body.classList.remove("outliner-plugin-better-lists", "outliner-plugin-vertical-lines");
}

async function createSettings(partial: Record<string, any> = {}) {
	const storage = {
		loadData: async () => partial,
		saveData: async () => {},
	};
	const settings = new Settings(storage as any);
	await settings.load();
	return settings;
}

describe("vendored obsidian-outliner body classes", () => {
	beforeEach(() => {
		resetBodyClass();
	});

	test("BetterListsStyles updates body class via Settings.onChange (no polling)", async () => {
		const settings = await createSettings();
		const feature = new BetterListsStyles(settings as any, {} as any);

		await feature.load();
		expect(document.body.classList.contains("outliner-plugin-better-lists")).toBe(true);

		settings.betterListsStyles = false;
		expect(document.body.classList.contains("outliner-plugin-better-lists")).toBe(false);

		settings.betterListsStyles = true;
		expect(document.body.classList.contains("outliner-plugin-better-lists")).toBe(true);

		settings.setEnabled(false);
		expect(document.body.classList.contains("outliner-plugin-better-lists")).toBe(false);

		await feature.unload();

		// Callback removed on unload; further changes should not re-add the class.
		settings.setEnabled(true);
		settings.betterListsStyles = true;
		expect(document.body.classList.contains("outliner-plugin-better-lists")).toBe(false);
	});

	test("VerticalLines updates body class via Settings.onChange (no polling)", async () => {
		const settings = await createSettings();
		const plugin = { registerEditorExtension: jest.fn() } as any;
		const feature = new VerticalLines(plugin, settings as any, {} as any, {} as any);

		await feature.load();
		expect(document.body.classList.contains("outliner-plugin-vertical-lines")).toBe(false);
		expect(plugin.registerEditorExtension).toHaveBeenCalledTimes(1);

		settings.verticalLines = true;
		expect(document.body.classList.contains("outliner-plugin-vertical-lines")).toBe(true);

		settings.setEnabled(false);
		expect(document.body.classList.contains("outliner-plugin-vertical-lines")).toBe(false);

		await feature.unload();

		// Callback removed on unload; further changes should not re-add the class.
		settings.setEnabled(true);
		settings.verticalLines = true;
		expect(document.body.classList.contains("outliner-plugin-vertical-lines")).toBe(false);
	});
});

