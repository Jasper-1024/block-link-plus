export type SettingSearchInfo = {
	containerEl: HTMLElement;
	haystack: string;
};

export const BLP_VISUALLY_HIDDEN_CLASS = "blp-visually-hidden";

export function hideEl(el: HTMLElement | null | undefined) {
	if (!el) return;
	el.classList.add(BLP_VISUALLY_HIDDEN_CLASS);
}

export function unhideEl(el: HTMLElement | null | undefined) {
	if (!el) return;
	el.classList.remove(BLP_VISUALLY_HIDDEN_CLASS);
}

export class SettingsTabPane {
	readonly name: string;
	readonly navButton: HTMLButtonElement;
	readonly contentEl: HTMLDivElement;
	readonly headingEl: HTMLElement;
	readonly searchItems: SettingSearchInfo[] = [];

	constructor(options: {
		navEl: HTMLElement;
		contentRootEl: HTMLElement;
		name: string;
		label: string;
	}) {
		this.name = options.name;

		this.navButton = document.createElement("button");
		this.navButton.type = "button";
		this.navButton.className = "blp-settings-nav-item";
		this.navButton.textContent = options.label;
		options.navEl.appendChild(this.navButton);

		this.contentEl = document.createElement("div");
		this.contentEl.className = "blp-settings-tab-content";
		this.contentEl.dataset.blpTab = options.name;
		options.contentRootEl.appendChild(this.contentEl);

		this.headingEl = document.createElement("div");
		this.headingEl.className = "blp-settings-tab-heading";
		this.headingEl.textContent = options.label;
		this.contentEl.appendChild(this.headingEl);

		// The heading is only shown in search mode (to indicate which tab the results belong to).
		hideEl(this.headingEl);
	}

	addSearchItem(containerEl: HTMLElement, parts: Array<string | undefined | null>) {
		const haystack = parts
			.filter(Boolean)
			.join(" ")
			.toLowerCase();
		this.searchItems.push({ containerEl, haystack });
	}

	setSelected(isSelected: boolean) {
		if (isSelected) {
			this.navButton.classList.add("blp-settings-nav-item-selected");
			unhideEl(this.contentEl);
		} else {
			this.navButton.classList.remove("blp-settings-nav-item-selected");
			hideEl(this.contentEl);
		}
	}

	enterSearchMode() {
		// Search mode shows all tab contents + headings, then the controller filters setting items.
		unhideEl(this.contentEl);
		unhideEl(this.headingEl);
		for (const item of this.searchItems) {
			unhideEl(item.containerEl);
		}
	}

	leaveSearchMode(isSelected: boolean) {
		hideEl(this.headingEl);
		for (const item of this.searchItems) {
			unhideEl(item.containerEl);
		}
		this.setSelected(isSelected);
	}
}

export class SettingsTabsController {
	private readonly tabs = new Map<string, SettingsTabPane>();
	private selectedTab: string;
	private inSearchMode = false;

	constructor(private readonly options: { zeroStateEl: HTMLElement }) {}

	addTab(tab: SettingsTabPane) {
		this.tabs.set(tab.name, tab);
	}

	isSearchMode(): boolean {
		return this.inSearchMode;
	}

	getTab(name: string): SettingsTabPane | null {
		return this.tabs.get(name) ?? null;
	}

	init(initialTab: string) {
		this.selectedTab = initialTab;
		for (const [name, tab] of this.tabs) {
			tab.setSelected(name === initialTab);
		}
		hideEl(this.options.zeroStateEl);
	}

	enterSearchMode() {
		if (this.inSearchMode) return;
		this.inSearchMode = true;

		for (const tab of this.tabs.values()) {
			tab.enterSearchMode();
		}
	}

	leaveSearchMode(nextSelectedTab: string) {
		this.inSearchMode = false;
		this.selectedTab = nextSelectedTab;

		for (const [name, tab] of this.tabs) {
			tab.leaveSearchMode(name === nextSelectedTab);
		}
		hideEl(this.options.zeroStateEl);
	}

	selectTab(name: string) {
		if (this.inSearchMode) {
			this.leaveSearchMode(name);
			return;
		}
		if (this.selectedTab === name) return;

		const next = this.tabs.get(name);
		const prev = this.tabs.get(this.selectedTab);

		prev?.setSelected(false);
		next?.setSelected(true);

		this.selectedTab = name;
	}

	applySearch(rawQuery: string) {
		const query = rawQuery.trim().toLowerCase();
		// Empty query means "not searching". Exiting search mode avoids the confusing
		// state where all tabs are shown (e.g. when Obsidian auto-focuses the search input
		// after window switches).
		if (query === "") {
			if (this.inSearchMode) this.leaveSearchMode(this.selectedTab);
			return;
		}
		const tabsWithResults = new Set<string>();

		for (const [tabName, tab] of this.tabs) {
			let hasAny = false;

			for (const item of tab.searchItems) {
				const matches = query === "" || item.haystack.includes(query);
				if (matches) {
					unhideEl(item.containerEl);
					hasAny = true;
				} else {
					hideEl(item.containerEl);
				}
			}

			if (hasAny) {
				tabsWithResults.add(tabName);
				unhideEl(tab.contentEl);
			} else {
				hideEl(tab.contentEl);
			}
		}

		// Only show tab headings that have at least one matching setting item.
		for (const [tabName, tab] of this.tabs) {
			if (tabsWithResults.has(tabName)) {
				unhideEl(tab.headingEl);
			} else {
				hideEl(tab.headingEl);
			}
		}

		if (tabsWithResults.size === 0) {
			unhideEl(this.options.zeroStateEl);
		} else {
			hideEl(this.options.zeroStateEl);
		}
	}
}
