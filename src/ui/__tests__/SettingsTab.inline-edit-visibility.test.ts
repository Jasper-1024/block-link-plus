jest.mock("main", () => ({
	__esModule: true,
	default: class BlockLinkPlus {},
}));

import { App } from "obsidian";
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

describe("SettingsTab inline edit visibility", () => {
	test("hides inline edit sub-settings when inline edit is disabled", () => {
		const plugin = createPlugin({ inlineEditEnabled: false });
		const tab = new BlockLinkPlusSettingsTab(plugin.app, plugin);
		const rootEl = document.createElement("div");
		(tab as any).renderBasicsTab(rootEl);

		expect(rootEl.textContent).toContain(t.settings.inlineEdit.enable.name);
		expect(rootEl.textContent).not.toContain(t.settings.inlineEdit.file.name);
		expect(rootEl.textContent).not.toContain(t.settings.inlineEdit.heading.name);
		expect(rootEl.textContent).not.toContain(t.settings.inlineEdit.block.name);
	});

	test("shows inline edit sub-settings when inline edit is enabled", () => {
		const plugin = createPlugin({ inlineEditEnabled: true });
		const tab = new BlockLinkPlusSettingsTab(plugin.app, plugin);
		const rootEl = document.createElement("div");
		(tab as any).renderBasicsTab(rootEl);

		expect(rootEl.textContent).toContain(t.settings.inlineEdit.enable.name);
		expect(rootEl.textContent).toContain(t.settings.inlineEdit.file.name);
		expect(rootEl.textContent).toContain(t.settings.inlineEdit.heading.name);
		expect(rootEl.textContent).toContain(t.settings.inlineEdit.block.name);
	});
});
