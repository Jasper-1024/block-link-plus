import { BLP_VISUALLY_HIDDEN_CLASS, SettingsTabPane, SettingsTabsController } from "../settings-tabs";

function isHidden(el: HTMLElement): boolean {
	return el.classList.contains(BLP_VISUALLY_HIDDEN_CLASS);
}

describe("SettingsTabsController", () => {
	test("init selects a tab and hides the others", () => {
		const navEl = document.createElement("div");
		const contentRootEl = document.createElement("div");
		const zeroStateEl = document.createElement("div");

		const controller = new SettingsTabsController({ zeroStateEl });
		const tabA = new SettingsTabPane({ navEl, contentRootEl, name: "a", label: "A" });
		const tabB = new SettingsTabPane({ navEl, contentRootEl, name: "b", label: "B" });

		controller.addTab(tabA);
		controller.addTab(tabB);
		controller.init("a");

		expect(tabA.navButton.classList.contains("blp-settings-nav-item-selected")).toBe(true);
		expect(tabB.navButton.classList.contains("blp-settings-nav-item-selected")).toBe(false);

		expect(isHidden(tabA.contentEl)).toBe(false);
		expect(isHidden(tabB.contentEl)).toBe(true);

		expect(isHidden(zeroStateEl)).toBe(true);
	});

	test("search filters items across tabs and shows empty-state when nothing matches", () => {
		const navEl = document.createElement("div");
		const contentRootEl = document.createElement("div");
		const zeroStateEl = document.createElement("div");

		const controller = new SettingsTabsController({ zeroStateEl });
		const tabA = new SettingsTabPane({ navEl, contentRootEl, name: "a", label: "A" });
		const tabB = new SettingsTabPane({ navEl, contentRootEl, name: "b", label: "B" });

		controller.addTab(tabA);
		controller.addTab(tabB);
		controller.init("a");

		const a1 = document.createElement("div");
		const b1 = document.createElement("div");
		tabA.contentEl.appendChild(a1);
		tabB.contentEl.appendChild(b1);

		tabA.addSearchItem(a1, ["Foo setting"]);
		tabB.addSearchItem(b1, ["Bar setting"]);

		controller.enterSearchMode();
		controller.applySearch("foo");

		expect(isHidden(a1)).toBe(false);
		expect(isHidden(b1)).toBe(true);

		expect(isHidden(tabA.headingEl)).toBe(false);
		expect(isHidden(tabB.headingEl)).toBe(true);

		expect(isHidden(tabA.contentEl)).toBe(false);
		expect(isHidden(tabB.contentEl)).toBe(true);

		expect(isHidden(zeroStateEl)).toBe(true);

		controller.applySearch("zzz");

		expect(isHidden(tabA.contentEl)).toBe(true);
		expect(isHidden(tabB.contentEl)).toBe(true);
		expect(isHidden(zeroStateEl)).toBe(false);
	});

	test("clicking a tab while in search mode exits search mode and selects the tab", () => {
		const navEl = document.createElement("div");
		const contentRootEl = document.createElement("div");
		const zeroStateEl = document.createElement("div");

		const controller = new SettingsTabsController({ zeroStateEl });
		const tabA = new SettingsTabPane({ navEl, contentRootEl, name: "a", label: "A" });
		const tabB = new SettingsTabPane({ navEl, contentRootEl, name: "b", label: "B" });

		controller.addTab(tabA);
		controller.addTab(tabB);
		controller.init("a");

		const a1 = document.createElement("div");
		tabA.contentEl.appendChild(a1);
		tabA.addSearchItem(a1, ["Foo setting"]);

		controller.enterSearchMode();
		controller.applySearch("foo");

		expect(controller.isSearchMode()).toBe(true);

		controller.selectTab("b");

		expect(controller.isSearchMode()).toBe(false);
		expect(isHidden(tabA.contentEl)).toBe(true);
		expect(isHidden(tabB.contentEl)).toBe(false);
		expect(isHidden(tabA.headingEl)).toBe(true);
		expect(isHidden(tabB.headingEl)).toBe(true);
		expect(isHidden(zeroStateEl)).toBe(true);
	});

	test("clearing the search query exits search mode and restores the selected tab", () => {
		const navEl = document.createElement("div");
		const contentRootEl = document.createElement("div");
		const zeroStateEl = document.createElement("div");

		const controller = new SettingsTabsController({ zeroStateEl });
		const tabA = new SettingsTabPane({ navEl, contentRootEl, name: "a", label: "A" });
		const tabB = new SettingsTabPane({ navEl, contentRootEl, name: "b", label: "B" });

		controller.addTab(tabA);
		controller.addTab(tabB);
		controller.init("a");

		const a1 = document.createElement("div");
		tabA.contentEl.appendChild(a1);
		tabA.addSearchItem(a1, ["Foo setting"]);

		controller.enterSearchMode();
		controller.applySearch("foo");

		expect(controller.isSearchMode()).toBe(true);

		controller.applySearch("");

		expect(controller.isSearchMode()).toBe(false);
		expect(isHidden(tabA.contentEl)).toBe(false);
		expect(isHidden(tabB.contentEl)).toBe(true);
		expect(isHidden(tabA.headingEl)).toBe(true);
		expect(isHidden(tabB.headingEl)).toBe(true);
		expect(isHidden(zeroStateEl)).toBe(true);
	});
});

