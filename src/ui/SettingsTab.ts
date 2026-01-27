import { App, PluginSettingTab, Setting, Notice } from "obsidian";
import t from "shared/i18n";
import { KeysOfType, PluginSettings, MultLineHandle, BlockLinkAliasType } from "../types";
import BlockLinkPlus from "main";
import { detectDataviewStatus } from "../utils/dataview-detector";
import {
	BLP_VISUALLY_HIDDEN_CLASS,
	SettingsTabPane,
	SettingsTabsController,
	hideEl,
	unhideEl,
} from "./settings-tabs";

type SettingsTabName = "basics" | "enhanced-list" | "built-in-plugins";

export class BlockLinkPlusSettingsTab extends PluginSettingTab {
	plugin: BlockLinkPlus;
	private selectedTabName: SettingsTabName = "basics";
	private searchQuery = "";

	constructor(app: App, plugin: BlockLinkPlus) {
		super(app, plugin);
		this.plugin = plugin;
	}

	addToggleSetting(
		settingName: KeysOfType<PluginSettings, boolean>,
		extraOnChange?: (value: boolean) => void,
		containerEl?: HTMLElement
	) {
		const rootEl = containerEl ?? this.containerEl;
		return new Setting(rootEl).addToggle((toggle) => {
			toggle
				.setValue(this.plugin.settings[settingName])
				.onChange(async (value) => {
					// @ts-ignore
					this.plugin.settings[settingName] = value;
					await this.plugin.saveSettings();
					extraOnChange?.(value);
				});
		});
	}

	// 文本输入框
	addTextInputSetting(settingName: KeysOfType<PluginSettings, string>, placeholder: string, containerEl?: HTMLElement) {
		const rootEl = containerEl ?? this.containerEl;
		return new Setting(rootEl).addText((text) =>
			text
				.setPlaceholder(placeholder)
				.setValue(this.plugin.settings[settingName])
				.onChange(async (value) => {
					if (value.length > 0) {
						// @ts-ignore
						this.plugin.settings[settingName] = value;
						await this.plugin.saveSettings();
					}
				})
		);
	}

	addDropdownSetting(
		settingName: KeysOfType<PluginSettings, string>,
		options: string[],
		display?: (option: string) => string,
		containerEl?: HTMLElement
	) {
		const rootEl = containerEl ?? this.containerEl;
		return new Setting(rootEl).addDropdown((dropdown) => {
			const displayNames = new Set<string>();
			for (const option of options) {
				const displayName = display?.(option) ?? option;
				if (!displayNames.has(displayName)) {
					dropdown.addOption(option, displayName);
					displayNames.add(displayName);
				}
			}
			dropdown
				.setValue(this.plugin.settings[settingName])
				.onChange(async (value) => {
					// @ts-ignore
					this.plugin.settings[settingName] = value;
					await this.plugin.saveSettings();
				});
		});
	}

	addSliderSetting(
		settingName: KeysOfType<PluginSettings, number>,
		min: number,
		max: number,
		step: number,
		containerEl?: HTMLElement
	) {
		const rootEl = containerEl ?? this.containerEl;
		return new Setting(rootEl).addSlider((slider) => {
			slider
				.setLimits(min, max, step)
				.setValue(this.plugin.settings[settingName])
				.setDynamicTooltip()
				.onChange(async (value) => {
					// @ts-ignore
					this.plugin.settings[settingName] = value;
					await this.plugin.saveSettings();
				});
		});
	}

	addHeading(heading: string, containerEl?: HTMLElement) {
		const rootEl = containerEl ?? this.containerEl;
		return new Setting(rootEl).setName(heading).setHeading();
	}

	display(): void {
		const { containerEl } = this;
		const uiText = this.getSettingsUiText();

		containerEl.empty();

		const titleEl = containerEl.createDiv({ cls: "blp-settings-title" });
		titleEl.createEl("h2", { text: t.settings.pluginTitle });

		const searchContainerEl = titleEl.createDiv({ cls: "search-input-container" });
		const searchInputEl = searchContainerEl.createEl("input", {
			type: "search",
			placeholder: uiText.searchPlaceholder,
		});
		searchInputEl.classList.add("search-input");

		const headerEl = containerEl.createDiv({ cls: "blp-settings-header" });
		const navEl = headerEl.createDiv({ cls: "blp-settings-tab-group" });

		const contentRootEl = containerEl.createDiv();
		const zeroStateEl = containerEl.createDiv({ cls: "blp-settings-zero-state" });
		zeroStateEl.textContent = uiText.emptyState;

		const controller = new SettingsTabsController({ zeroStateEl });

		const tabs: Record<SettingsTabName, SettingsTabPane> = {
			basics: new SettingsTabPane({ navEl, contentRootEl, name: "basics", label: uiText.tabs.basics }),
			"enhanced-list": new SettingsTabPane({
				navEl,
				contentRootEl,
				name: "enhanced-list",
				label: uiText.tabs.enhancedList,
			}),
			"built-in-plugins": new SettingsTabPane({
				navEl,
				contentRootEl,
				name: "built-in-plugins",
				label: uiText.tabs.builtInPlugins,
			}),
		};

		const allTabs = Object.values(tabs);
		for (const tab of allTabs) controller.addTab(tab);

		if (!controller.getTab(this.selectedTabName)) {
			this.selectedTabName = "basics";
		}
		controller.init(this.selectedTabName);

		this.renderBasicsTab(tabs.basics.contentEl);
		this.renderEnhancedListTab(tabs["enhanced-list"].contentEl);
		this.renderBuiltInPluginsTab(tabs["built-in-plugins"].contentEl);

		for (const tab of allTabs) this.buildSearchIndex(tab);

		const syncSectionHeadings = () => {
			for (const tab of allTabs) this.syncSettingSectionHeadings(tab);
		};

		const applySearch = () => {
			controller.enterSearchMode();
			controller.applySearch(searchInputEl.value);
			syncSectionHeadings();
		};

		for (const tab of allTabs) {
			tab.navButton.addEventListener("click", () => {
				if (controller.isSearchMode()) {
					searchInputEl.value = "";
					this.searchQuery = "";
				}

				this.selectedTabName = tab.name as SettingsTabName;
				controller.selectTab(tab.name);
			});
		}

		searchInputEl.value = this.searchQuery;

		searchInputEl.addEventListener("focus", () => {
			this.searchQuery = searchInputEl.value;
			applySearch();
		});

		searchInputEl.addEventListener("input", () => {
			this.searchQuery = searchInputEl.value;
			applySearch();
		});

		searchInputEl.addEventListener("keydown", (evt) => {
			if (evt.key !== "Escape") return;
			searchInputEl.value = "";
			this.searchQuery = "";
			if (controller.isSearchMode()) controller.leaveSearchMode(this.selectedTabName);
		});

		if (this.searchQuery.trim()) applySearch();
	}

	private getSettingsUiText(): {
		searchPlaceholder: string;
		emptyState: string;
		tabs: { basics: string; enhancedList: string; builtInPlugins: string };
	} {
		switch (t.lang) {
			case "zh":
				return {
					searchPlaceholder: "搜索设置...",
					emptyState: "没有匹配的设置。",
					tabs: {
						basics: "基础",
						enhancedList: "增强列表",
						builtInPlugins: "内置插件",
					},
				};
			case "zh-TW":
				return {
					searchPlaceholder: "搜尋設定...",
					emptyState: "沒有匹配的設定。",
					tabs: {
						basics: "基礎",
						enhancedList: "增強清單",
						builtInPlugins: "內建外掛",
					},
				};
			default:
				return {
					searchPlaceholder: "Search settings...",
					emptyState: "No matching settings.",
					tabs: {
						basics: "Basics",
						enhancedList: "Enhanced List",
						builtInPlugins: "Built-in Plugins",
					},
				};
		}
	}

	private buildSearchIndex(tab: SettingsTabPane) {
		const tabLabel = tab.headingEl.textContent ?? "";
		const items = Array.from(tab.contentEl.querySelectorAll<HTMLElement>(".setting-item"));

		let currentSection = "";
		for (const item of items) {
			const name = item.querySelector<HTMLElement>(".setting-item-name")?.textContent ?? "";
			const desc = item.querySelector<HTMLElement>(".setting-item-description")?.textContent ?? "";

			if (item.classList.contains("setting-item-heading")) {
				currentSection = `${name} ${desc}`.trim();
			}

			// Include tab + section labels so searching for category names works.
			tab.addSearchItem(item, [tabLabel, currentSection, name, desc]);
		}
	}

	private syncSettingSectionHeadings(tab: SettingsTabPane) {
		const items = Array.from(tab.contentEl.querySelectorAll<HTMLElement>(".setting-item"));
		let currentHeading: HTMLElement | null = null;
		let hasVisibleChild = false;

		const flush = () => {
			if (!currentHeading) return;
			if (hasVisibleChild) unhideEl(currentHeading);
			else hideEl(currentHeading);
		};

		for (const item of items) {
			if (item.classList.contains("setting-item-heading")) {
				flush();
				currentHeading = item;
				hasVisibleChild = false;
				continue;
			}

			if (currentHeading && !item.classList.contains(BLP_VISUALLY_HIDDEN_CLASS)) {
				hasVisibleChild = true;
			}
		}

		flush();
	}

	private renderBasicsTab(rootEl: HTMLElement) {
		const multiLineHandleSetting = new Setting(rootEl)
			.setName(t.settings.multiLineHandle.name)
			.setDesc(t.settings.multiLineHandle.desc);

		const getMultiLineDescription = (value: string) => {
			switch (parseInt(value)) {
				case MultLineHandle.oneline:
					return t.settings.multiLineHandle.descriptions.default;
				case MultLineHandle.heading:
					return t.settings.multiLineHandle.descriptions.addHeading;
				case MultLineHandle.multblock:
					return t.settings.multiLineHandle.descriptions.addMultiBlock;
				case MultLineHandle.multilineblock:
					return t.settings.multiLineHandle.descriptions.addMultilineBlock;
				default:
					return t.settings.multiLineHandle.desc;
			}
		};

		multiLineHandleSetting.addDropdown((dropdown) => {
			const options = [
				{ value: MultLineHandle.oneline.toString(), display: t.settings.multiLineHandle.options.default },
				{ value: MultLineHandle.heading.toString(), display: t.settings.multiLineHandle.options.addHeading },
				{ value: MultLineHandle.multblock.toString(), display: t.settings.multiLineHandle.options.addMultiBlock },
				{
					value: MultLineHandle.multilineblock.toString(),
					display: t.settings.multiLineHandle.options.addMultilineBlock,
				},
			];

			options.forEach((option) => {
				dropdown.addOption(option.value, option.display);
			});

			dropdown.setValue(this.plugin.settings.mult_line_handle.toString()).onChange(async (value) => {
				this.plugin.settings.mult_line_handle = parseInt(value);
				await this.plugin.saveSettings();

				const descEl = multiLineHandleSetting.descEl;
				if (descEl) descEl.textContent = getMultiLineDescription(value);
			});
		});

		const initialDescription = getMultiLineDescription(this.plugin.settings.mult_line_handle.toString());
		if (multiLineHandleSetting.descEl) multiLineHandleSetting.descEl.textContent = initialDescription;

		// Block link
		this.addHeading(t.settings.blockLink.title, rootEl).setDesc(t.settings.blockLink.desc);
		this.addToggleSetting("enable_right_click_block", undefined, rootEl).setName(t.settings.blockLink.enableRightClick.name);
		this.addToggleSetting("enable_block_notification", undefined, rootEl).setName(t.settings.blockLink.enableNotification.name);

		const aliasStyleSetting = new Setting(rootEl)
			.setName(t.settings.blockLink.aliasStyle.name)
			.setDesc(t.settings.blockLink.aliasStyle.desc);

		const getAliasStyleDescription = (value: string) => {
			switch (parseInt(value)) {
				case BlockLinkAliasType.Default:
					return t.settings.blockLink.aliasStyle.descriptions.noAlias;
				case BlockLinkAliasType.FirstChars:
					return t.settings.blockLink.aliasStyle.descriptions.firstChars;
				case BlockLinkAliasType.Heading:
					return t.settings.blockLink.aliasStyle.descriptions.parentHeading;
				case BlockLinkAliasType.SelectedText:
					return t.settings.blockLink.aliasStyle.descriptions.selectedText;
				default:
					return t.settings.blockLink.aliasStyle.desc;
			}
		};

		aliasStyleSetting.addDropdown((dropdown) => {
			const options = [
				{ value: BlockLinkAliasType.Default.toString(), display: t.settings.blockLink.aliasStyle.options.noAlias },
				{ value: BlockLinkAliasType.FirstChars.toString(), display: t.settings.blockLink.aliasStyle.options.firstChars },
				{ value: BlockLinkAliasType.Heading.toString(), display: t.settings.blockLink.aliasStyle.options.parentHeading },
				{ value: BlockLinkAliasType.SelectedText.toString(), display: t.settings.blockLink.aliasStyle.options.selectedText },
			];

			options.forEach((option) => {
				dropdown.addOption(option.value, option.display);
			});

			dropdown.setValue(this.plugin.settings.alias_type.toString()).onChange(async (value) => {
				this.plugin.settings.alias_type = parseInt(value);
				await this.plugin.saveSettings();

				const descEl = aliasStyleSetting.descEl;
				if (descEl) descEl.textContent = getAliasStyleDescription(value);
			});
		});

		const initialAliasDescription = getAliasStyleDescription(this.plugin.settings.alias_type.toString());
		if (aliasStyleSetting.descEl) aliasStyleSetting.descEl.textContent = initialAliasDescription;

		this.addSliderSetting("alias_length", 1, 100, 1, rootEl)
			.setName(t.settings.blockLink.aliasLength.name)
			.setDesc(t.settings.blockLink.aliasLength.desc);

		this.addToggleSetting("heading_id_newline", undefined, rootEl)
			.setName(t.settings.blockLink.headingIdNewline.name)
			.setDesc(t.settings.blockLink.headingIdNewline.desc);

		// Embed link
		this.addHeading(t.settings.embedLink.title, rootEl).setDesc(t.settings.embedLink.desc);
		this.addToggleSetting("enable_right_click_embed", undefined, rootEl).setName(t.settings.embedLink.enableRightClick.name);
		this.addToggleSetting("enable_embed_notification", undefined, rootEl).setName(t.settings.embedLink.enableNotification.name);

		// Obsidian URI
		this.addHeading(t.settings.obsidianUri.title, rootEl).setDesc(t.settings.obsidianUri.desc);
		this.addToggleSetting("enable_right_click_url", undefined, rootEl).setName(t.settings.obsidianUri.enableRightClick.name);
		this.addToggleSetting("enable_url_notification", undefined, rootEl).setName(t.settings.obsidianUri.enableNotification.name);

		// Block ID
		this.addHeading(t.settings.blockId.title, rootEl).setDesc(t.settings.blockId.desc);
		this.addSliderSetting("id_length", 3, 7, 1, rootEl)
			.setName(t.settings.blockId.maxLength.name)
			.setDesc(t.settings.blockId.maxLength.desc);

		this.addToggleSetting("enable_prefix", undefined, rootEl).setName(t.settings.blockId.enablePrefix.name);
		this.addTextInputSetting("id_prefix", "", rootEl).setName(t.settings.blockId.prefix.name).setDesc(t.settings.blockId.prefix.desc);

		// Inline edit
		this.addHeading(t.settings.inlineEdit.title, rootEl).setDesc(t.settings.inlineEdit.desc);
		this.addToggleSetting("inlineEditEnabled", undefined, rootEl).setName(t.settings.inlineEdit.enable.name).setDesc(t.settings.inlineEdit.enable.desc);
		this.addToggleSetting("inlineEditFile", undefined, rootEl).setName(t.settings.inlineEdit.file.name).setDesc(t.settings.inlineEdit.file.desc);
		this.addToggleSetting("inlineEditHeading", undefined, rootEl).setName(t.settings.inlineEdit.heading.name).setDesc(t.settings.inlineEdit.heading.desc);
		this.addToggleSetting("inlineEditBlock", undefined, rootEl).setName(t.settings.inlineEdit.block.name).setDesc(t.settings.inlineEdit.block.desc);
	}

	private renderEnhancedListTab(rootEl: HTMLElement) {
		this.addHeading(t.settings.enhancedListBlocks.title, rootEl).setDesc(t.settings.enhancedListBlocks.desc);

		const parseScopeLines = (value: string): string[] =>
			value
				.split(/\r?\n/)
				.map((l) => l.trim())
				.filter(Boolean)
				.map((l) => l.replace(/\\/g, "/"));

		// Scope.
		this.addHeading(t.settings.enhancedListBlocks.groups.scope.title, rootEl);

		const enabledFoldersSetting = new Setting(rootEl)
			.setName(t.settings.enhancedListBlocks.enabledFolders.name)
			.setDesc(t.settings.enhancedListBlocks.enabledFolders.desc)
			.addTextArea((text) => {
				text
					.setPlaceholder("Daily\nProjects")
					.setValue((this.plugin.settings.enhancedListEnabledFolders ?? []).join("\n"))
					.onChange(async (value) => {
						this.plugin.settings.enhancedListEnabledFolders = parseScopeLines(value);
						await this.plugin.saveSettings();
					});

				text.inputEl.rows = 3;
			});

		const enabledFilesSetting = new Setting(rootEl)
			.setName(t.settings.enhancedListBlocks.enabledFiles.name)
			.setDesc(t.settings.enhancedListBlocks.enabledFiles.desc)
			.addTextArea((text) => {
				text
					.setPlaceholder("Daily/2026-01-09.md")
					.setValue((this.plugin.settings.enhancedListEnabledFiles ?? []).join("\n"))
					.onChange(async (value) => {
						this.plugin.settings.enhancedListEnabledFiles = parseScopeLines(value);
						await this.plugin.saveSettings();
					});

				text.inputEl.rows = 3;
			});

		// Behavior.
		this.addHeading(t.settings.enhancedListBlocks.groups.behavior.title, rootEl);

		const hideSystemLineSetting = this.addToggleSetting("enhancedListHideSystemLine", undefined, rootEl)
			.setName(t.settings.enhancedListBlocks.hideSystemLine.name)
			.setDesc(t.settings.enhancedListBlocks.hideSystemLine.desc);

		const handleAffordanceSetting = this.addToggleSetting("enhancedListHandleAffordance", undefined, rootEl)
			.setName(t.settings.enhancedListBlocks.handleAffordance.name)
			.setDesc(t.settings.enhancedListBlocks.handleAffordance.desc);

		let handleClickActionDropdown: any | null = null;

		const handleActionsSetting = this.addToggleSetting(
			"enhancedListHandleActions",
			(enabled) => {
				// Keep the dropdown in sync without a full re-render.
				handleClickActionDropdown?.setDisabled?.(!enabled);
			},
			rootEl
		)
			.setName(t.settings.enhancedListBlocks.handleActions.name)
			.setDesc(t.settings.enhancedListBlocks.handleActions.desc);

		const handleClickActionSetting = new Setting(rootEl)
			.setName(t.settings.enhancedListBlocks.handleActions.clickAction.name)
			.setDesc(t.settings.enhancedListBlocks.handleActions.clickAction.desc)
			.addDropdown((dropdown) => {
				handleClickActionDropdown = dropdown;

				dropdown
					.addOptions({
						"toggle-folding": t.settings.enhancedListBlocks.handleActions.clickAction.options.toggleFolding,
						menu: t.settings.enhancedListBlocks.handleActions.clickAction.options.menu,
						none: t.settings.enhancedListBlocks.handleActions.clickAction.options.none,
					} as any)
					.setValue(this.plugin.settings.enhancedListHandleClickAction ?? "toggle-folding")
					.setDisabled(!this.plugin.settings.enhancedListHandleActions)
					.onChange(async (value: any) => {
						this.plugin.settings.enhancedListHandleClickAction = value;
						await this.plugin.saveSettings();
					});
			});

		const indentCodeBlocksSetting = this.addToggleSetting("enhancedListIndentCodeBlocks", undefined, rootEl)
			.setName(t.settings.enhancedListBlocks.indentCodeBlocks.name)
			.setDesc(t.settings.enhancedListBlocks.indentCodeBlocks.desc);

		const deleteSubtreeSetting = this.addToggleSetting("enhancedListDeleteSubtreeOnListItemDelete", undefined, rootEl)
			.setName(t.settings.enhancedListBlocks.deleteSubtreeOnDelete.name)
			.setDesc(t.settings.enhancedListBlocks.deleteSubtreeOnDelete.desc);

		// Normalization.
		this.addHeading(t.settings.enhancedListBlocks.groups.normalization.title, rootEl);

		const normalizeOnSaveSetting = new Setting(rootEl)
			.setName(t.settings.enhancedListBlocks.normalizeOnSave.name)
			.setDesc(t.settings.enhancedListBlocks.normalizeOnSave.desc)
			.addToggle((toggle) => {
				toggle
					.setValue(this.plugin.settings.enhancedListNormalizeOnSave)
					.onChange(async (value) => {
						this.plugin.settings.enhancedListNormalizeOnSave = value;
						await this.plugin.saveSettings();
						// Re-render to show/hide rule details (and keep search index consistent).
						this.display();
					});
			});
		normalizeOnSaveSetting.settingEl.classList.add("blp-settings-master-toggle");

		if (this.plugin.settings.enhancedListNormalizeOnSave === true) {
			const normalizeTabsSetting = new Setting(rootEl)
				.setName(t.settings.enhancedListBlocks.normalizeOnSave.rules.tabsToSpaces.name)
				.setDesc(t.settings.enhancedListBlocks.normalizeOnSave.rules.tabsToSpaces.desc)
				.addToggle((toggle) => {
					toggle
						.setValue(this.plugin.settings.enhancedListNormalizeTabsToSpaces)
						.onChange(async (value) => {
							this.plugin.settings.enhancedListNormalizeTabsToSpaces = value;
							await this.plugin.saveSettings();
							// Re-render to show/hide tab size configuration.
							this.display();
						});
				});

			if (this.plugin.settings.enhancedListNormalizeTabsToSpaces === true) {
				new Setting(rootEl)
					.setName(t.settings.enhancedListBlocks.normalizeOnSave.rules.tabsToSpaces.tabSize.name)
					.setDesc(t.settings.enhancedListBlocks.normalizeOnSave.rules.tabsToSpaces.tabSize.desc)
					.addText((text) => {
						text.inputEl.type = "number";
						text.inputEl.min = "1";
						text.inputEl.max = "16";
						text.inputEl.step = "1";
						text.inputEl.style.width = "72px";

						text
							.setPlaceholder("2")
							.setValue(String(this.plugin.settings.enhancedListNormalizeTabSize ?? 2))
							.onChange(async (value) => {
								const trimmed = value.trim();
								const next = trimmed ? Number.parseInt(trimmed, 10) : NaN;
								if (!Number.isFinite(next) || next <= 0) return;

								this.plugin.settings.enhancedListNormalizeTabSize = next;
								await this.plugin.saveSettings();
							});
					});
			}

			new Setting(rootEl)
				.setName(t.settings.enhancedListBlocks.normalizeOnSave.rules.cleanupInvalidSystemLines.name)
				.setDesc(t.settings.enhancedListBlocks.normalizeOnSave.rules.cleanupInvalidSystemLines.desc)
				.addToggle((toggle) => {
					toggle
						.setValue(this.plugin.settings.enhancedListNormalizeCleanupInvalidSystemLines)
						.onChange(async (value) => {
							this.plugin.settings.enhancedListNormalizeCleanupInvalidSystemLines = value;
							await this.plugin.saveSettings();
						});
				});

			const normalizeMergeSetting = new Setting(rootEl)
				.setName(t.settings.enhancedListBlocks.normalizeOnSave.rules.mergeSplitSystemLine.name)
				.setDesc(t.settings.enhancedListBlocks.normalizeOnSave.rules.mergeSplitSystemLine.desc)
				.addToggle((toggle) => {
					toggle
						.setValue(this.plugin.settings.enhancedListNormalizeMergeSplitSystemLine)
						.onChange(async (value) => {
							this.plugin.settings.enhancedListNormalizeMergeSplitSystemLine = value;
						await this.plugin.saveSettings();
					});
				});

			const normalizeIndentSetting = new Setting(rootEl)
				.setName(t.settings.enhancedListBlocks.normalizeOnSave.rules.systemLineIndent.name)
				.setDesc(t.settings.enhancedListBlocks.normalizeOnSave.rules.systemLineIndent.desc)
				.addToggle((toggle) => {
					toggle
						.setValue(this.plugin.settings.enhancedListNormalizeSystemLineIndent)
						.onChange(async (value) => {
							this.plugin.settings.enhancedListNormalizeSystemLineIndent = value;
						await this.plugin.saveSettings();
					});
				});

			const normalizeEnsureSetting = new Setting(rootEl)
				.setName(t.settings.enhancedListBlocks.normalizeOnSave.rules.ensureSystemLineForTouchedItems.name)
				.setDesc(t.settings.enhancedListBlocks.normalizeOnSave.rules.ensureSystemLineForTouchedItems.desc)
				.addToggle((toggle) => {
					toggle
						.setValue(this.plugin.settings.enhancedListNormalizeEnsureSystemLineForTouchedItems)
						.onChange(async (value) => {
							this.plugin.settings.enhancedListNormalizeEnsureSystemLineForTouchedItems = value;
						await this.plugin.saveSettings();
					});
				});
		}

		// blp-view.
		const blpViewHeading = this.addHeading(t.settings.enhancedListBlocks.blpView.title, rootEl).setDesc(
			t.settings.enhancedListBlocks.blpView.desc
		);

		// Dataview status hint (used by blp-view Query/View).
		const dataviewStatus = detectDataviewStatus();
		const statusText = dataviewStatus.functioning
			? t.settings.enhancedListBlocks.dataviewStatus.available.replace(
					"${version}",
					dataviewStatus.version || "unknown"
			  )
			: t.settings.enhancedListBlocks.dataviewStatus.unavailable;

		const statusSetting = new Setting(rootEl).setDesc(statusText);
		statusSetting.settingEl.classList.add("blp-settings-dataview-status");
		hideEl(statusSetting.nameEl);
		if (!dataviewStatus.functioning) statusSetting.descEl.classList.add("mod-warning");

		const allowMaterializeSetting = this.addToggleSetting("blpViewAllowMaterialize", undefined, rootEl)
			.setName(t.settings.enhancedListBlocks.blpView.allowMaterialize.name)
			.setDesc(t.settings.enhancedListBlocks.blpView.allowMaterialize.desc);

		const maxSourceFilesSetting = new Setting(rootEl)
			.setName(t.settings.enhancedListBlocks.blpView.maxSourceFiles.name)
			.setDesc(t.settings.enhancedListBlocks.blpView.maxSourceFiles.desc)
			.addText((text) => {
				text.inputEl.type = "number";
				text
					.setPlaceholder("0")
					.setValue(String(this.plugin.settings.blpViewMaxSourceFiles ?? 0))
					.onChange(async (value) => {
						const trimmed = value.trim();
						const next = trimmed ? Number.parseInt(trimmed, 10) : 0;
						if (!Number.isFinite(next) || next < 0) return;
						this.plugin.settings.blpViewMaxSourceFiles = next;
						await this.plugin.saveSettings();
					});
			});

		const maxResultsSetting = new Setting(rootEl)
			.setName(t.settings.enhancedListBlocks.blpView.maxResults.name)
			.setDesc(t.settings.enhancedListBlocks.blpView.maxResults.desc)
			.addText((text) => {
				text.inputEl.type = "number";
				text
					.setPlaceholder("0")
					.setValue(String(this.plugin.settings.blpViewMaxResults ?? 0))
					.onChange(async (value) => {
						const trimmed = value.trim();
						const next = trimmed ? Number.parseInt(trimmed, 10) : 0;
						if (!Number.isFinite(next) || next < 0) return;
						this.plugin.settings.blpViewMaxResults = next;
						await this.plugin.saveSettings();
					});
			});

		const showDiagnosticsSetting = this.addToggleSetting("blpViewShowDiagnostics", undefined, rootEl)
			.setName(t.settings.enhancedListBlocks.blpView.showDiagnostics.name)
			.setDesc(t.settings.enhancedListBlocks.blpView.showDiagnostics.desc);
	}

	private renderBuiltInPluginsTab(rootEl: HTMLElement) {
		const isThirdPartyPluginEnabled = (pluginId: string): boolean => {
			try {
				return Boolean((this.plugin.app as any)?.plugins?.enabledPlugins?.has?.(pluginId));
			} catch {
				return false;
			}
		};

		this.addHeading(t.settings.enhancedListBlocks.builtIn.title, rootEl).setDesc(t.settings.enhancedListBlocks.builtIn.desc);

		this.addToggleSetting("builtInVslinkoScopeToEnhancedList", undefined, rootEl)
			.setName(t.settings.enhancedListBlocks.builtIn.scopeToEnhancedList.name)
			.setDesc(t.settings.enhancedListBlocks.builtIn.scopeToEnhancedList.desc);

		// Built-in Outliner
		this.addHeading(t.settings.enhancedListBlocks.builtIn.outliner.title, rootEl);
		new Setting(rootEl)
			.setName(t.settings.enhancedListBlocks.builtIn.outliner.enable.name)
			.setDesc(
				isThirdPartyPluginEnabled("obsidian-outliner")
					? t.settings.enhancedListBlocks.builtIn.outliner.enable.conflictDesc
					: t.settings.enhancedListBlocks.builtIn.outliner.enable.desc
			)
			.addToggle((toggle) => {
				toggle.setValue(this.plugin.settings.builtInObsidianOutlinerEnabled).onChange(async (value) => {
					if (value && isThirdPartyPluginEnabled("obsidian-outliner")) {
						new Notice(
							"Block Link Plus: Built-in Outliner is disabled because external plugin 'obsidian-outliner' is enabled.",
							5000
						);
						toggle.setValue(false);
						return;
					}

					this.plugin.settings.builtInObsidianOutlinerEnabled = value;
					await this.plugin.saveSettings();
					this.display();
				});
			});

		const outlinerSettings = this.plugin.getBuiltInOutlinerSettings();
		if (this.plugin.settings.builtInObsidianOutlinerEnabled && outlinerSettings) {
			new Setting(rootEl)
				.setName(t.settings.enhancedListBlocks.builtIn.outliner.stickCursor.name)
				.setDesc(t.settings.enhancedListBlocks.builtIn.outliner.stickCursor.desc)
				.addDropdown((dropdown) => {
					dropdown
						.addOptions({
							never: t.settings.enhancedListBlocks.builtIn.outliner.stickCursor.options.never,
							"bullet-only": t.settings.enhancedListBlocks.builtIn.outliner.stickCursor.options.bulletOnly,
							"bullet-and-checkbox":
								t.settings.enhancedListBlocks.builtIn.outliner.stickCursor.options.bulletAndCheckbox,
						} as any)
						.setValue(outlinerSettings.keepCursorWithinContent)
						.onChange(async (value: any) => {
							outlinerSettings.keepCursorWithinContent = value;
							await outlinerSettings.save();
						});
				});

			new Setting(rootEl)
				.setName(t.settings.enhancedListBlocks.builtIn.outliner.enhanceTab.name)
				.setDesc(t.settings.enhancedListBlocks.builtIn.outliner.enhanceTab.desc)
				.addToggle((toggle) => {
					toggle.setValue(outlinerSettings.overrideTabBehaviour).onChange(async (value) => {
						outlinerSettings.overrideTabBehaviour = value;
						await outlinerSettings.save();
					});
				});

			new Setting(rootEl)
				.setName(t.settings.enhancedListBlocks.builtIn.outliner.enhanceEnter.name)
				.setDesc(t.settings.enhancedListBlocks.builtIn.outliner.enhanceEnter.desc)
				.addToggle((toggle) => {
					toggle.setValue(outlinerSettings.overrideEnterBehaviour).onChange(async (value) => {
						outlinerSettings.overrideEnterBehaviour = value;
						await outlinerSettings.save();
					});
				});

			new Setting(rootEl)
				.setName(t.settings.enhancedListBlocks.builtIn.outliner.vimO.name)
				.setDesc(t.settings.enhancedListBlocks.builtIn.outliner.vimO.desc)
				.addToggle((toggle) => {
					toggle.setValue(outlinerSettings.overrideVimOBehaviour).onChange(async (value) => {
						outlinerSettings.overrideVimOBehaviour = value;
						await outlinerSettings.save();
					});
				});

			new Setting(rootEl)
				.setName(t.settings.enhancedListBlocks.builtIn.outliner.enhanceSelectAll.name)
				.setDesc(t.settings.enhancedListBlocks.builtIn.outliner.enhanceSelectAll.desc)
				.addToggle((toggle) => {
					toggle.setValue(outlinerSettings.overrideSelectAllBehaviour).onChange(async (value) => {
						outlinerSettings.overrideSelectAllBehaviour = value;
						await outlinerSettings.save();
					});
				});

			new Setting(rootEl)
				.setName(t.settings.enhancedListBlocks.builtIn.outliner.betterListStyles.name)
				.setDesc(t.settings.enhancedListBlocks.builtIn.outliner.betterListStyles.desc)
				.addToggle((toggle) => {
					toggle.setValue(outlinerSettings.betterListsStyles).onChange(async (value) => {
						outlinerSettings.betterListsStyles = value;
						await outlinerSettings.save();
					});
				});

			new Setting(rootEl)
				.setName(t.settings.enhancedListBlocks.builtIn.outliner.verticalLines.name)
				.setDesc(t.settings.enhancedListBlocks.builtIn.outliner.verticalLines.desc)
				.addToggle((toggle) => {
					toggle.setValue(outlinerSettings.verticalLines).onChange(async (value) => {
						outlinerSettings.verticalLines = value;
						await outlinerSettings.save();
					});
				});

			new Setting(rootEl)
				.setName(t.settings.enhancedListBlocks.builtIn.outliner.verticalLinesAction.name)
				.addDropdown((dropdown) => {
					dropdown
						.addOptions({
							none: t.settings.enhancedListBlocks.builtIn.outliner.verticalLinesAction.options.none,
							"zoom-in": t.settings.enhancedListBlocks.builtIn.outliner.verticalLinesAction.options.zoomIn,
							"toggle-folding": t.settings.enhancedListBlocks.builtIn.outliner.verticalLinesAction.options.toggleFolding,
						} as any)
						.setValue(outlinerSettings.verticalLinesAction)
						.onChange(async (value: any) => {
							outlinerSettings.verticalLinesAction = value;
							await outlinerSettings.save();
						});
				});

			new Setting(rootEl)
				.setName(t.settings.enhancedListBlocks.builtIn.outliner.dragAndDrop.name)
				.setDesc(t.settings.enhancedListBlocks.builtIn.outliner.dragAndDrop.desc)
				.addToggle((toggle) => {
					toggle.setValue(outlinerSettings.dragAndDrop).onChange(async (value) => {
						outlinerSettings.dragAndDrop = value;
						await outlinerSettings.save();
					});
				});

			new Setting(rootEl)
				.setName(t.settings.enhancedListBlocks.builtIn.outliner.debug.name)
				.setDesc(t.settings.enhancedListBlocks.builtIn.outliner.debug.desc)
				.addToggle((toggle) => {
					toggle.setValue(outlinerSettings.debug).onChange(async (value) => {
						outlinerSettings.debug = value;
						await outlinerSettings.save();
					});
				});
		}

		// Built-in Zoom
		this.addHeading(t.settings.enhancedListBlocks.builtIn.zoom.title, rootEl);
		new Setting(rootEl)
			.setName(t.settings.enhancedListBlocks.builtIn.zoom.enable.name)
			.setDesc(
				isThirdPartyPluginEnabled("obsidian-zoom")
					? t.settings.enhancedListBlocks.builtIn.zoom.enable.conflictDesc
					: t.settings.enhancedListBlocks.builtIn.zoom.enable.desc
			)
			.addToggle((toggle) => {
				toggle.setValue(this.plugin.settings.builtInObsidianZoomEnabled).onChange(async (value) => {
					if (value && isThirdPartyPluginEnabled("obsidian-zoom")) {
						new Notice(
							"Block Link Plus: Built-in Zoom is disabled because external plugin 'obsidian-zoom' is enabled.",
							5000
						);
						toggle.setValue(false);
						return;
					}

					this.plugin.settings.builtInObsidianZoomEnabled = value;
					await this.plugin.saveSettings();
					this.display();
				});
			});

		const zoomSettings = this.plugin.getBuiltInZoomSettings();
		if (this.plugin.settings.builtInObsidianZoomEnabled && zoomSettings) {
			new Setting(rootEl)
				.setName(t.settings.enhancedListBlocks.builtIn.zoom.zoomOnClick.name)
				.setDesc(t.settings.enhancedListBlocks.builtIn.zoom.zoomOnClick.desc)
				.addToggle((toggle) => {
					toggle.setValue(zoomSettings.zoomOnClick).onChange(async (value) => {
						zoomSettings.zoomOnClick = value;
						await zoomSettings.save();
					});
				});

			new Setting(rootEl)
				.setName(t.settings.enhancedListBlocks.builtIn.zoom.debug.name)
				.setDesc(t.settings.enhancedListBlocks.builtIn.zoom.debug.desc)
				.addToggle((toggle) => {
					toggle.setValue(zoomSettings.debug).onChange(async (value) => {
						zoomSettings.debug = value;
						await zoomSettings.save();
					});
				});
		}
	}
}
