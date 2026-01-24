import { App, Plugin, PluginSettingTab, Setting, Notice } from "obsidian";
import t from "shared/i18n";
import { KeysOfType, PluginSettings, MultLineHandle, BlockLinkAliasType } from "../types";
import BlockLinkPlus from "main";
import { detectDataviewStatus } from "../utils/dataview-detector";

export class BlockLinkPlusSettingsTab extends PluginSettingTab {
	plugin: BlockLinkPlus;

	constructor(app: App, plugin: BlockLinkPlus) {
		super(app, plugin);
		this.plugin = plugin;
	}

	addToggleSetting(
		settingName: KeysOfType<PluginSettings, boolean>,
		extraOnChange?: (value: boolean) => void
	) {
		return new Setting(this.containerEl).addToggle((toggle) => {
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
	addTextInputSetting(
		settingName: KeysOfType<PluginSettings, string>,
		placeholder: string
	) {
		return new Setting(this.containerEl).addText((text) =>
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
		display?: (option: string) => string
	) {
		return new Setting(this.containerEl).addDropdown((dropdown) => {
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
		step: number
	) {
		return new Setting(this.containerEl).addSlider((slider) => {
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

	addHeading(heading: string) {
		return new Setting(this.containerEl).setName(heading).setHeading();
	}

	display(): void {
		const { containerEl } = this;

		containerEl.empty();

		// title
		containerEl.createEl("h2", { text: t.settings.pluginTitle });

		// Multi-line block behavior with dynamic descriptions
		const multiLineHandleSetting = new Setting(this.containerEl)
			.setName(t.settings.multiLineHandle.name)
			.setDesc(t.settings.multiLineHandle.desc);

		// Create a function to get the current description based on the setting value
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

		// Add dropdown with dynamic description updates
		multiLineHandleSetting.addDropdown((dropdown) => {
			const options = [
				{ value: MultLineHandle.oneline.toString(), display: t.settings.multiLineHandle.options.default },
				{ value: MultLineHandle.heading.toString(), display: t.settings.multiLineHandle.options.addHeading },
				{ value: MultLineHandle.multblock.toString(), display: t.settings.multiLineHandle.options.addMultiBlock },
				{ value: MultLineHandle.multilineblock.toString(), display: t.settings.multiLineHandle.options.addMultilineBlock }
			];
			
			options.forEach(option => {
				dropdown.addOption(option.value, option.display);
			});
			
			dropdown
				.setValue(this.plugin.settings.mult_line_handle.toString())
				.onChange(async (value) => {
					this.plugin.settings.mult_line_handle = parseInt(value);
					await this.plugin.saveSettings();
					
					// Update the description dynamically
					const descEl = multiLineHandleSetting.descEl;
					if (descEl) {
						descEl.textContent = getMultiLineDescription(value);
					}
				});
		});

		// Set initial description based on current setting
		const initialDescription = getMultiLineDescription(this.plugin.settings.mult_line_handle.toString());
		if (multiLineHandleSetting.descEl) {
			multiLineHandleSetting.descEl.textContent = initialDescription;
		}

		// Block link	
		this.addHeading(t.settings.blockLink.title).setDesc(t.settings.blockLink.desc);
		this.addToggleSetting("enable_right_click_block").setName(t.settings.blockLink.enableRightClick.name);
		this.addToggleSetting("enable_block_notification").setName(t.settings.blockLink.enableNotification.name);

		// Alias style with dynamic descriptions
		const aliasStyleSetting = new Setting(this.containerEl)
			.setName(t.settings.blockLink.aliasStyle.name)
			.setDesc(t.settings.blockLink.aliasStyle.desc);

		// Create a function to get the current description based on the alias style value
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

		// Add dropdown with dynamic description updates
		aliasStyleSetting.addDropdown((dropdown) => {
			const options = [
				{ value: BlockLinkAliasType.Default.toString(), display: t.settings.blockLink.aliasStyle.options.noAlias },
				{ value: BlockLinkAliasType.FirstChars.toString(), display: t.settings.blockLink.aliasStyle.options.firstChars },
				{ value: BlockLinkAliasType.Heading.toString(), display: t.settings.blockLink.aliasStyle.options.parentHeading },
				{ value: BlockLinkAliasType.SelectedText.toString(), display: t.settings.blockLink.aliasStyle.options.selectedText }
			];
			
			options.forEach(option => {
				dropdown.addOption(option.value, option.display);
			});
			
			dropdown
				.setValue(this.plugin.settings.alias_type.toString())
				.onChange(async (value) => {
					this.plugin.settings.alias_type = parseInt(value);
					await this.plugin.saveSettings();
					
					// Update the description dynamically
					const descEl = aliasStyleSetting.descEl;
					if (descEl) {
						descEl.textContent = getAliasStyleDescription(value);
					}
				});
		});

		// Set initial description based on current setting
		const initialAliasDescription = getAliasStyleDescription(this.plugin.settings.alias_type.toString());
		if (aliasStyleSetting.descEl) {
			aliasStyleSetting.descEl.textContent = initialAliasDescription;
		}

		this.addSliderSetting("alias_length", 1, 100, 1)
			.setName(t.settings.blockLink.aliasLength.name)
			.setDesc(t.settings.blockLink.aliasLength.desc);

		this.addToggleSetting("heading_id_newline")
			.setName(t.settings.blockLink.headingIdNewline.name)
			.setDesc(t.settings.blockLink.headingIdNewline.desc);

		// Embed link
		this.addHeading(t.settings.embedLink.title).setDesc(t.settings.embedLink.desc);
		this.addToggleSetting("enable_right_click_embed").setName(t.settings.embedLink.enableRightClick.name);
		this.addToggleSetting("enable_embed_notification").setName(t.settings.embedLink.enableNotification.name);

		// Obsidian URI
		this.addHeading(t.settings.obsidianUri.title).setDesc(t.settings.obsidianUri.desc);
		this.addToggleSetting("enable_right_click_url").setName(t.settings.obsidianUri.enableRightClick.name);
		this.addToggleSetting("enable_url_notification").setName(t.settings.obsidianUri.enableNotification.name);

		// block id
		this.addHeading(t.settings.blockId.title).setDesc(t.settings.blockId.desc);
		this.addSliderSetting("id_length", 3, 7, 1)
			.setName(t.settings.blockId.maxLength.name)
			.setDesc(t.settings.blockId.maxLength.desc);

		this.addToggleSetting("enable_prefix").setName(t.settings.blockId.enablePrefix.name);

		this.addTextInputSetting("id_prefix", "")
			.setName(t.settings.blockId.prefix.name)
			.setDesc(t.settings.blockId.prefix.desc);

		// Inline edit
		this.addHeading(t.settings.inlineEdit.title).setDesc(t.settings.inlineEdit.desc);
		this.addToggleSetting("inlineEditEnabled")
			.setName(t.settings.inlineEdit.enable.name)
			.setDesc(t.settings.inlineEdit.enable.desc);
		this.addToggleSetting("inlineEditFile")
			.setName(t.settings.inlineEdit.file.name)
			.setDesc(t.settings.inlineEdit.file.desc);
		this.addToggleSetting("inlineEditHeading")
			.setName(t.settings.inlineEdit.heading.name)
			.setDesc(t.settings.inlineEdit.heading.desc);
		this.addToggleSetting("inlineEditBlock")
			.setName(t.settings.inlineEdit.block.name)
			.setDesc(t.settings.inlineEdit.block.desc);

		// Enhanced List Blocks
		this.addHeading(t.settings.enhancedListBlocks.title).setDesc(t.settings.enhancedListBlocks.desc);

		// Dataview status hint (used by blp-view Query/View).
		const dataviewStatus = detectDataviewStatus();
		const statusEl = this.containerEl.createEl("div", {
			cls: dataviewStatus.functioning ? "setting-item-description" : "setting-item-description mod-warning",
		});

		statusEl.createEl("span", {
			text: dataviewStatus.functioning
				? t.settings.enhancedListBlocks.dataviewStatus.available.replace(
						"${version}",
						dataviewStatus.version || "unknown"
				  )
				: t.settings.enhancedListBlocks.dataviewStatus.unavailable,
		});

		const parseScopeLines = (value: string): string[] =>
			value
				.split(/\r?\n/)
				.map((l) => l.trim())
				.filter(Boolean)
				.map((l) => l.replace(/\\/g, "/"));

		new Setting(this.containerEl)
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

		new Setting(this.containerEl)
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

		this.addToggleSetting("enhancedListHideSystemLine")
			.setName(t.settings.enhancedListBlocks.hideSystemLine.name)
			.setDesc(t.settings.enhancedListBlocks.hideSystemLine.desc);

		this.addToggleSetting("enhancedListHandleAffordance")
			.setName(t.settings.enhancedListBlocks.handleAffordance.name)
			.setDesc(t.settings.enhancedListBlocks.handleAffordance.desc);

		this.addToggleSetting("enhancedListHandleActions")
			.setName(t.settings.enhancedListBlocks.handleActions.name)
			.setDesc(t.settings.enhancedListBlocks.handleActions.desc);

		this.addToggleSetting("enhancedListDeleteSubtreeOnListItemDelete")
			.setName(t.settings.enhancedListBlocks.deleteSubtreeOnDelete.name)
			.setDesc(t.settings.enhancedListBlocks.deleteSubtreeOnDelete.desc);

		if (dataviewStatus.functioning) {
			this.addHeading(t.settings.enhancedListBlocks.blpView.title).setDesc(t.settings.enhancedListBlocks.blpView.desc);

			this.addToggleSetting("blpViewAllowMaterialize")
				.setName(t.settings.enhancedListBlocks.blpView.allowMaterialize.name)
				.setDesc(t.settings.enhancedListBlocks.blpView.allowMaterialize.desc);

			new Setting(this.containerEl)
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

			new Setting(this.containerEl)
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

			this.addToggleSetting("blpViewShowDiagnostics")
				.setName(t.settings.enhancedListBlocks.blpView.showDiagnostics.name)
				.setDesc(t.settings.enhancedListBlocks.blpView.showDiagnostics.desc);
		}

		const isThirdPartyPluginEnabled = (pluginId: string): boolean => {
			try {
				return Boolean((this.plugin.app as any)?.plugins?.enabledPlugins?.has?.(pluginId));
			} catch {
				return false;
			}
		};

		// Built-in vslinko plugins (vendored)
		this.addHeading("Built-in Plugins (vslinko)").setDesc(
			"Vendored copies of obsidian-outliner and obsidian-zoom. You can enable them globally (upstream behavior) or optionally scope list UX to Enhanced List Blocks enabled files."
		);

		this.addToggleSetting("builtInVslinkoScopeToEnhancedList")
			.setName("Scope built-in list UX to Enhanced List Blocks")
			.setDesc("When enabled, list styles and interactions from built-in Outliner/Zoom only apply to Enhanced List Blocks enabled files (Live Preview only).");

		// Built-in Outliner
		new Setting(this.containerEl)
			.setName("Enable Built-in Outliner (obsidian-outliner)")
			.setDesc(
				isThirdPartyPluginEnabled("obsidian-outliner")
					? "Disabled because external plugin 'obsidian-outliner' is enabled."
					: "Enables a vendored copy of obsidian-outliner (commands, key overrides, drag-and-drop, vertical lines, styles)."
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
			new Setting(this.containerEl)
				.setName("Stick the cursor to the content")
				.setDesc("Don't let the cursor move to the bullet position.")
				.addDropdown((dropdown) => {
					dropdown
						.addOptions({
							never: "Never",
							"bullet-only": "Stick cursor out of bullets",
							"bullet-and-checkbox": "Stick cursor out of bullets and checkboxes",
						} as any)
						.setValue(outlinerSettings.keepCursorWithinContent)
						.onChange(async (value: any) => {
							outlinerSettings.keepCursorWithinContent = value;
							await outlinerSettings.save();
						});
				});

			new Setting(this.containerEl)
				.setName("Enhance the Tab key")
				.setDesc("Make Tab and Shift-Tab behave the same as other outliners.")
				.addToggle((toggle) => {
					toggle.setValue(outlinerSettings.overrideTabBehaviour).onChange(async (value) => {
						outlinerSettings.overrideTabBehaviour = value;
						await outlinerSettings.save();
					});
				});

			new Setting(this.containerEl)
				.setName("Enhance the Enter key")
				.setDesc("Make the Enter key behave the same as other outliners.")
				.addToggle((toggle) => {
					toggle.setValue(outlinerSettings.overrideEnterBehaviour).onChange(async (value) => {
						outlinerSettings.overrideEnterBehaviour = value;
						await outlinerSettings.save();
					});
				});

			new Setting(this.containerEl)
				.setName("Vim-mode o/O inserts bullets")
				.setDesc("Create a bullet when pressing o or O in Vim mode.")
				.addToggle((toggle) => {
					toggle.setValue(outlinerSettings.overrideVimOBehaviour).onChange(async (value) => {
						outlinerSettings.overrideVimOBehaviour = value;
						await outlinerSettings.save();
					});
				});

			new Setting(this.containerEl)
				.setName("Enhance the Ctrl+A or Cmd+A behavior")
				.setDesc(
					"Press the hotkey once to select the current list item. Press the hotkey twice to select the entire list."
				)
				.addToggle((toggle) => {
					toggle.setValue(outlinerSettings.overrideSelectAllBehaviour).onChange(async (value) => {
						outlinerSettings.overrideSelectAllBehaviour = value;
						await outlinerSettings.save();
					});
				});

			new Setting(this.containerEl)
				.setName("Improve the style of your lists")
				.setDesc("Uses Obsidian CSS variables and should work with most themes (visual results may vary by theme).")
				.addToggle((toggle) => {
					toggle.setValue(outlinerSettings.betterListsStyles).onChange(async (value) => {
						outlinerSettings.betterListsStyles = value;
						await outlinerSettings.save();
					});
				});

			new Setting(this.containerEl).setName("Draw vertical indentation lines").addToggle((toggle) => {
				toggle.setValue(outlinerSettings.verticalLines).onChange(async (value) => {
					outlinerSettings.verticalLines = value;
					await outlinerSettings.save();
				});
			});

			new Setting(this.containerEl).setName("Vertical indentation line click action").addDropdown((dropdown) => {
				dropdown
					.addOptions({
						none: "None",
						"zoom-in": "Zoom In",
						"toggle-folding": "Toggle Folding",
					} as any)
					.setValue(outlinerSettings.verticalLinesAction)
					.onChange(async (value: any) => {
						outlinerSettings.verticalLinesAction = value;
						await outlinerSettings.save();
					});
			});

			new Setting(this.containerEl).setName("Drag-and-Drop").addToggle((toggle) => {
				toggle.setValue(outlinerSettings.dragAndDrop).onChange(async (value) => {
					outlinerSettings.dragAndDrop = value;
					await outlinerSettings.save();
				});
			});

			new Setting(this.containerEl)
				.setName("Debug mode")
				.setDesc("Open DevTools (Command+Option+I or Control+Shift+I) to copy the debug logs.")
				.addToggle((toggle) => {
					toggle.setValue(outlinerSettings.debug).onChange(async (value) => {
						outlinerSettings.debug = value;
						await outlinerSettings.save();
					});
				});
		}

		// Built-in Zoom
		new Setting(this.containerEl)
			.setName("Enable Built-in Zoom (obsidian-zoom)")
			.setDesc(
				isThirdPartyPluginEnabled("obsidian-zoom")
					? "Disabled because external plugin 'obsidian-zoom' is enabled."
					: "Enables a vendored copy of obsidian-zoom (commands, click-to-zoom, header, guardrails)."
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
			new Setting(this.containerEl).setName("Zooming in when clicking on the bullet").addToggle((toggle) => {
				toggle.setValue(zoomSettings.zoomOnClick).onChange(async (value) => {
					zoomSettings.zoomOnClick = value;
					await zoomSettings.save();
				});
			});

			new Setting(this.containerEl)
				.setName("Debug mode")
				.setDesc("Open DevTools (Command+Option+I or Control+Shift+I) to copy the debug logs.")
				.addToggle((toggle) => {
					toggle.setValue(zoomSettings.debug).onChange(async (value) => {
						zoomSettings.debug = value;
						await zoomSettings.save();
					});
				});
		}
	}

}
