import { Notice } from "obsidian";
import { isThirdPartyPluginEnabled, syncBuiltInEnabledSettingWithExternalConflict } from "../gating";

describe("built-in-vslinko gating", () => {
	beforeEach(() => {
		(Notice as any).instances.length = 0;
	});

	test("desiredEnabled follows built-in setting when no conflict", () => {
		const plugin: any = {
			app: { plugins: { enabledPlugins: new Set<string>() } },
			settings: { builtInObsidianOutlinerEnabled: true },
			saveSettings: jest.fn(),
		};

		const result = syncBuiltInEnabledSettingWithExternalConflict({
			plugin,
			externalPluginId: "obsidian-outliner",
			settingsFlagKey: "builtInObsidianOutlinerEnabled",
			showNotice: true,
			noticeText: "should not show",
		});

		expect(result.externalEnabled).toBe(false);
		expect(result.desiredEnabled).toBe(true);
		expect(result.didAutoDisable).toBe(false);
		expect(plugin.settings.builtInObsidianOutlinerEnabled).toBe(true);
		expect(plugin.saveSettings).not.toHaveBeenCalled();
		expect((Notice as any).instances).toHaveLength(0);
	});

	test("auto-disables built-in toggle when external plugin is enabled", () => {
		const plugin: any = {
			app: { plugins: { enabledPlugins: new Set<string>(["obsidian-outliner"]) } },
			settings: { builtInObsidianOutlinerEnabled: true },
			saveSettings: jest.fn(),
		};

		const result = syncBuiltInEnabledSettingWithExternalConflict({
			plugin,
			externalPluginId: "obsidian-outliner",
			settingsFlagKey: "builtInObsidianOutlinerEnabled",
			showNotice: true,
			noticeText: "Block Link Plus: Built-in Outliner is disabled because external plugin 'obsidian-outliner' is enabled.",
		});

		expect(result.externalEnabled).toBe(true);
		expect(result.desiredEnabled).toBe(false);
		expect(result.didAutoDisable).toBe(true);
		expect(plugin.settings.builtInObsidianOutlinerEnabled).toBe(false);
		expect(plugin.saveSettings).toHaveBeenCalledTimes(1);
		expect((Notice as any).instances).toHaveLength(1);
		expect((Notice as any).instances[0].message).toMatch(/Built-in Outliner/i);
	});

	test("does not auto-disable when built-in toggle already false", () => {
		const plugin: any = {
			app: { plugins: { enabledPlugins: new Set<string>(["obsidian-zoom"]) } },
			settings: { builtInObsidianZoomEnabled: false },
			saveSettings: jest.fn(),
		};

		const result = syncBuiltInEnabledSettingWithExternalConflict({
			plugin,
			externalPluginId: "obsidian-zoom",
			settingsFlagKey: "builtInObsidianZoomEnabled",
			showNotice: true,
			noticeText: "should not show",
		});

		expect(result.externalEnabled).toBe(true);
		expect(result.desiredEnabled).toBe(false);
		expect(result.didAutoDisable).toBe(false);
		expect(plugin.saveSettings).not.toHaveBeenCalled();
		expect((Notice as any).instances).toHaveLength(0);
	});

	test("showNotice=false suppresses notice", () => {
		const plugin: any = {
			app: { plugins: { enabledPlugins: new Set<string>(["obsidian-zoom"]) } },
			settings: { builtInObsidianZoomEnabled: true },
			saveSettings: jest.fn(),
		};

		const result = syncBuiltInEnabledSettingWithExternalConflict({
			plugin,
			externalPluginId: "obsidian-zoom",
			settingsFlagKey: "builtInObsidianZoomEnabled",
			showNotice: false,
			noticeText: "Block Link Plus: Built-in Zoom is disabled because external plugin 'obsidian-zoom' is enabled.",
		});

		expect(result.externalEnabled).toBe(true);
		expect(result.desiredEnabled).toBe(false);
		expect(result.didAutoDisable).toBe(true);
		expect((Notice as any).instances).toHaveLength(0);
	});

	test("isThirdPartyPluginEnabled tolerates missing plugin manager", () => {
		expect(isThirdPartyPluginEnabled({} as any, "obsidian-outliner")).toBe(false);
		expect(isThirdPartyPluginEnabled({ app: {} } as any, "obsidian-outliner")).toBe(false);
	});
});
