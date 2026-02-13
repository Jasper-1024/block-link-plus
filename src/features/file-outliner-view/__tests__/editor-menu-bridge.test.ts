import { extractPluginIdFromStack, withPluginFilteredMenu, type MenuLike } from "../editor-menu-bridge";

describe("file outliner view editor-menu bridge", () => {
	test("extractPluginIdFromStack prefers plugin: frames", () => {
		const id = extractPluginIdFromStack("Error\n  at x (plugin:metadata-menu:12:34)\n  at y (foo)");
		expect(id).toBe("metadata-menu");
	});

	test("extractPluginIdFromStack falls back to /plugins/<id>/ paths", () => {
		const id = extractPluginIdFromStack(
			"Error\n  at x (C:\\\\vault\\\\.obsidian\\\\plugins\\\\highlightr-plugin\\\\main.js:1:1)"
		);
		expect(id).toBe("highlightr-plugin");
	});

	test("withPluginFilteredMenu filters addItem/addSeparator by allowlist", () => {
		const calls: string[] = [];
		const menu: MenuLike = {
			addItem: () => calls.push("item"),
			addSeparator: () => calls.push("sep"),
			addSubmenu: () => calls.push("submenu"),
		};

		withPluginFilteredMenu(
			menu,
			{
				allowedPluginIds: new Set(["metadata-menu"]),
				getStack: () => "Error\n  at x (plugin:metadata-menu:1:1)",
			},
			() => {
				menu.addItem(() => null);
				menu.addSeparator();
				menu.addSubmenu?.(() => null);
			}
		);

		expect(calls).toEqual(["item", "sep", "submenu"]);
	});

	test("withPluginFilteredMenu blocks non-allowlisted plugins (fail closed)", () => {
		const calls: string[] = [];
		const menu: MenuLike = {
			addItem: () => calls.push("item"),
			addSeparator: () => calls.push("sep"),
		};

		withPluginFilteredMenu(
			menu,
			{
				allowedPluginIds: new Set(["metadata-menu"]),
				getStack: () => "Error\n  at x (plugin:highlightr-plugin:1:1)",
			},
			() => {
				menu.addItem(() => null);
				menu.addSeparator();
			}
		);

		expect(calls).toEqual([]);
	});

	test("withPluginFilteredMenu skips blocked plugin ids and attributes to the next plugin frame", () => {
		const calls: string[] = [];
		const menu: MenuLike = {
			addItem: () => calls.push("item"),
			addSeparator: () => calls.push("sep"),
		};

		withPluginFilteredMenu(
			menu,
			{
				allowedPluginIds: new Set(["metadata-menu"]),
				blockedPluginIds: new Set(["block-link-plus"]),
				getStack: () =>
					[
						"Error",
						"  at x (plugin:block-link-plus:1:1)",
						"  at y (plugin:metadata-menu:2:2)",
					].join("\n"),
			},
			() => {
				menu.addItem(() => null);
				menu.addSeparator();
			}
		);

		expect(calls).toEqual(["item", "sep"]);
	});
});
