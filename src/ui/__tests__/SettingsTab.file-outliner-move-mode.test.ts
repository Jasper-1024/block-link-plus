jest.mock("main", () => ({
	__esModule: true,
	default: class BlockLinkPlus {},
}));

import { App, Setting } from "obsidian";
import t from "shared/i18n";
import { DEFAULT_SETTINGS } from "../../types";
import { BlockLinkPlusSettingsTab } from "../SettingsTab";

function createPlugin(overrides: Partial<any> = {}) {
	const app = new App();
	return {
		app,
		settings: { ...DEFAULT_SETTINGS, ...overrides },
		saveSettings: jest.fn(async () => undefined),
	} as any;
}

type DropdownRecord = {
	name: string;
	options: Array<{ value: string; display: string }>;
	onChange: ((value: string) => void) | null;
};

function renderOutlinerAndCaptureDropdowns(plugin: any): DropdownRecord[] {
	plugin.settings.fileOutlinerEditorCommandAllowedPlugins = [];
	const records: DropdownRecord[] = [];
	const originalAddDropdown = (Setting.prototype as any).addDropdown;
	(Setting.prototype as any).addDropdown = function (callback: (dropdown: any) => void) {
		const record: DropdownRecord = { name: this.nameEl.textContent ?? "", options: [], onChange: null };
		const dropdown = {
			addOption: (value: string, display: string) => {
				record.options.push({ value, display });
				return dropdown;
			},
			setValue: () => dropdown,
			setDisabled: () => dropdown,
			onChange: (handler: (value: string) => void) => {
				record.onChange = handler;
				return dropdown;
			},
		};
		callback(dropdown);
		records.push(record);
		return this;
	};

	try {
		const tab = new BlockLinkPlusSettingsTab(plugin.app, plugin);
		(tab as any).renderFileOutlinerMoveModeSetting(tab.containerEl);
		return records;
	} finally {
		(Setting.prototype as any).addDropdown = originalAddDropdown;
	}
}

describe("SettingsTab file outliner move mode", () => {
	test("defaults to same-level and persists exactly the two movement modes", async () => {
		const plugin = createPlugin();
		expect(DEFAULT_SETTINGS.fileOutlinerMoveMode).toBe("same-level");

		const records = renderOutlinerAndCaptureDropdowns(plugin);
		const setting = records.find((record) => record.name === t.settings.fileOutliner.moveMode.name);
		expect(setting).toBeDefined();
		expect(setting?.options.map((option) => option.value)).toEqual(["same-level", "cross-level-align"]);

		await setting?.onChange?.("cross-level-align");
		expect(plugin.settings.fileOutlinerMoveMode).toBe("cross-level-align");
		expect(plugin.saveSettings).toHaveBeenCalledTimes(1);
	});

	test.each(["en", "zh", "zh-TW"] as const)("has movement labels in %s", (lang) => {
		const previousLang = t.lang;
		t.lang = lang;
		try {
			const records = renderOutlinerAndCaptureDropdowns(createPlugin());
			const setting = records.find((record) => record.name === t.settings.fileOutliner.moveMode.name);
			expect(setting?.name).toBe(t.settings.fileOutliner.moveMode.name);
			expect(setting?.options.map((option) => option.display)).toEqual([
				t.settings.fileOutliner.moveMode.options.sameLevel,
				t.settings.fileOutliner.moveMode.options.crossLevelAlign,
			]);
		} finally {
			t.lang = previousLang;
		}
	});
});
