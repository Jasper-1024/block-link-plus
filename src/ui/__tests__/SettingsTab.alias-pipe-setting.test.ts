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

describe("SettingsTab alias pipe escaping setting", () => {
	test("defaults alias pipe escaping to enabled", () => {
		expect(DEFAULT_SETTINGS.escape_alias_pipe).toBe(true);
	});

	test("shows alias pipe escaping in Basics block link settings", () => {
		const plugin = createPlugin();
		const tab = new BlockLinkPlusSettingsTab(plugin.app, plugin);
		const rootEl = document.createElement("div");

		(tab as any).renderBasicsTab(rootEl);

		expect(rootEl.textContent).toContain(t.settings.blockLink.escapeAliasPipe.name);
		expect(rootEl.textContent).toContain(t.settings.blockLink.escapeAliasPipe.desc);
	});
});
