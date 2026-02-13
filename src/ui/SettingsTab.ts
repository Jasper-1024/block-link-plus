import { App, PluginSettingTab, Setting } from "obsidian";
import t from "shared/i18n";
import { KeysOfType, PluginSettings, MultLineHandle, BlockLinkAliasType } from "../types";
import BlockLinkPlus from "main";
import { detectDataviewStatus } from "../utils/dataview-detector";
import { getFileOutlinerCommandLabels } from "features/file-outliner-view/labels";
import {
	BLP_VISUALLY_HIDDEN_CLASS,
	SettingsTabPane,
	SettingsTabsController,
	hideEl,
	unhideEl,
} from "./settings-tabs";

type SettingsTabName = "basics" | "outliner";

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

	// Text input
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
			outliner: new SettingsTabPane({ navEl, contentRootEl, name: "outliner", label: uiText.tabs.outliner }),
		};

		const allTabs = Object.values(tabs);
		for (const tab of allTabs) controller.addTab(tab);

		if (!controller.getTab(this.selectedTabName)) {
			this.selectedTabName = "basics";
		}
		controller.init(this.selectedTabName);

		this.renderBasicsTab(tabs.basics.contentEl);
		this.renderFileOutlinerTab(tabs.outliner.contentEl);

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
		tabs: { basics: string; outliner: string };
	} {
		switch (t.lang) {
			case "zh":
				return {
					searchPlaceholder: "搜索设置...",
					emptyState: "没有匹配的设置。",
					tabs: {
						basics: "基础",
						outliner: "Outliner",
					},
				};
			case "zh-TW":
				return {
					searchPlaceholder: "搜尋設定...",
					emptyState: "沒有匹配的設定。",
					tabs: {
						basics: "基礎",
						outliner: "Outliner",
					},
				};
			default:
				return {
					searchPlaceholder: "Search settings...",
					emptyState: "No matching settings.",
					tabs: {
						basics: "Basics",
						outliner: "Outliner",
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

	private renderFileOutlinerTab(rootEl: HTMLElement) {
		const ui = t.settings.fileOutliner;
		this.addHeading(ui.title, rootEl).setDesc(ui.desc);

		const parseScopeLines = (value: string): string[] =>
			value
				.split(/\r?\n/)
				.map((l) => l.trim())
				.filter(Boolean)
				.map((l) => l.replace(/\\/g, "/"));

		this.addHeading(ui.groups.scope.title, rootEl);

		new Setting(rootEl)
			.setName(ui.enabledFolders.name)
			.setDesc(ui.enabledFolders.desc)
			.addTextArea((text) => {
				text
					.setPlaceholder("Daily\nProjects")
					.setValue((this.plugin.settings.fileOutlinerEnabledFolders ?? []).join("\n"))
					.onChange(async (value) => {
						this.plugin.settings.fileOutlinerEnabledFolders = parseScopeLines(value);
						await this.plugin.saveSettings();
					});
				text.inputEl.rows = 3;
			});

		new Setting(rootEl)
			.setName(ui.enabledFiles.name)
			.setDesc(ui.enabledFiles.desc)
			.addTextArea((text) => {
				text
					.setPlaceholder("Daily/2026-01-09.md")
					.setValue((this.plugin.settings.fileOutlinerEnabledFiles ?? []).join("\n"))
					.onChange(async (value) => {
						this.plugin.settings.fileOutlinerEnabledFiles = parseScopeLines(value);
						await this.plugin.saveSettings();
					});
				text.inputEl.rows = 3;
			});

		new Setting(rootEl)
			.setName(ui.frontmatterOverride.name)
			.setDesc(ui.frontmatterOverride.desc);

		this.addHeading(ui.groups.behavior.title, rootEl);

		this.addToggleSetting("fileOutlinerViewEnabled", () => this.display(), rootEl)
			.setName(ui.enableRouting.name)
			.setDesc(ui.enableRouting.desc);

		this.addToggleSetting("fileOutlinerHideSystemLine", undefined, rootEl)
			.setName(ui.hideSystemTailLines.name)
			.setDesc(ui.hideSystemTailLines.desc);

		this.addToggleSetting("fileOutlinerDragAndDropEnabled", undefined, rootEl)
			.setName(ui.dragAndDrop.name)
			.setDesc(ui.dragAndDrop.desc);

		this.addToggleSetting("fileOutlinerZoomEnabled", undefined, rootEl)
			.setName(ui.zoom.name)
			.setDesc(ui.zoom.desc);

		this.addToggleSetting("fileOutlinerEmphasisLineEnabled", undefined, rootEl)
			.setName(ui.emphasisLine.name)
			.setDesc(ui.emphasisLine.desc);

		this.addToggleSetting("fileOutlinerEditorContextMenuEnabled", undefined, rootEl)
			.setName(ui.editorContextMenu.enabled.name)
			.setDesc(ui.editorContextMenu.enabled.desc);

		new Setting(rootEl)
			.setName(ui.editorContextMenu.allowedPlugins.name)
			.setDesc(ui.editorContextMenu.allowedPlugins.desc)
			.addTextArea((text) => {
				const parsePluginIds = (value: string): string[] =>
					Array.from(
						new Set(
							value
								.split(/\r?\n/)
								.map((l) => l.trim())
								.filter(Boolean)
						)
					);

				text
					.setPlaceholder("metadata-menu\nhighlightr-plugin\ncore")
					.setValue((this.plugin.settings.fileOutlinerEditorContextMenuAllowedPlugins ?? []).join("\n"))
					.onChange(async (value) => {
						this.plugin.settings.fileOutlinerEditorContextMenuAllowedPlugins = parsePluginIds(value);
						await this.plugin.saveSettings();
					});
				text.inputEl.rows = 3;
			});

		new Setting(rootEl)
			.setName(ui.childrenOnSplit.name)
			.setDesc(ui.childrenOnSplit.desc)
			.addDropdown((dropdown) => {
				dropdown
					.addOption("keep", ui.childrenOnSplit.options.keep)
					.addOption("move", ui.childrenOnSplit.options.move)
					.setValue(this.plugin.settings.fileOutlinerChildrenOnSplit ?? "keep")
					.setDisabled(!this.plugin.settings.fileOutlinerViewEnabled)
					.onChange(async (value: any) => {
						this.plugin.settings.fileOutlinerChildrenOnSplit = value;
						await this.plugin.saveSettings();
					});
			});

		new Setting(rootEl)
			.setName(ui.pasteMultiline.name)
			.setDesc(ui.pasteMultiline.desc)
			.addDropdown((dropdown) => {
				dropdown
					.addOption("split", ui.pasteMultiline.options.split)
					.addOption("multiline", ui.pasteMultiline.options.multiline)
					.setValue(this.plugin.settings.fileOutlinerPasteMultiline ?? "split")
					.setDisabled(!this.plugin.settings.fileOutlinerViewEnabled)
					.onChange(async (value: any) => {
						this.plugin.settings.fileOutlinerPasteMultiline = value;
						await this.plugin.saveSettings();
					});
			});

		new Setting(rootEl)
			.setName(ui.backspaceWithChildren.name)
			.setDesc(ui.backspaceWithChildren.desc)
			.addDropdown((dropdown) => {
				dropdown
					.addOption("merge", ui.backspaceWithChildren.options.merge)
					.addOption("outdent", ui.backspaceWithChildren.options.outdent)
					.setValue(this.plugin.settings.fileOutlinerBackspaceWithChildren ?? "merge")
					.setDisabled(!this.plugin.settings.fileOutlinerViewEnabled)
					.onChange(async (value: any) => {
						this.plugin.settings.fileOutlinerBackspaceWithChildren = value;
						await this.plugin.saveSettings();
					});
			});

		const cmdLabels = getFileOutlinerCommandLabels();
		const tasksHelpDesc = String(ui.tasksHelp.desc ?? "")
			.replace("${toggleTaskStatus}", cmdLabels.toggleTaskStatus)
			.replace("${toggleTaskMarker}", cmdLabels.toggleTaskMarker);
		new Setting(rootEl).setName(ui.tasksHelp.name).setDesc(tasksHelpDesc);

		this.addToggleSetting("fileOutlinerDebugLogging", undefined, rootEl)
			.setName(ui.debug.name)
			.setDesc(ui.debug.desc);

		// blp-view.
		this.addHeading(t.settings.enhancedListBlocks.blpView.title, rootEl).setDesc(
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

		this.addToggleSetting("blpViewAllowMaterialize", undefined, rootEl)
			.setName(t.settings.enhancedListBlocks.blpView.allowMaterialize.name)
			.setDesc(t.settings.enhancedListBlocks.blpView.allowMaterialize.desc);

		new Setting(rootEl)
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

		new Setting(rootEl)
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

		this.addToggleSetting("blpViewShowDiagnostics", undefined, rootEl)
			.setName(t.settings.enhancedListBlocks.blpView.showDiagnostics.name)
			.setDesc(t.settings.enhancedListBlocks.blpView.showDiagnostics.desc);
	}
}

