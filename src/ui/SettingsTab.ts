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
		// 时间章节设置
		this.addHeading(t.settings.timeSection.title).setDesc(t.settings.timeSection.desc);

		this.addToggleSetting("enable_time_section")
			.setName(t.settings.timeSection.enable.name);

		this.addToggleSetting("enable_time_section_in_menu")
			.setName(t.settings.timeSection.enableInMenu.name)
			.setDesc(t.settings.timeSection.enableInMenu.desc);

		this.addTextInputSetting("time_section_format", "HH:mm")
			.setName(t.settings.timeSection.timeFormat.name)
			.setDesc(t.settings.timeSection.timeFormat.desc);

		this.addTextInputSetting("time_section_title_pattern", "\\d{1,2}:\\d{1,2}")
			.setName(t.settings.timeSection.titlePattern.name)
			.setDesc(t.settings.timeSection.titlePattern.desc);

		this.addToggleSetting("insert_heading_level")
			.setName(t.settings.timeSection.insertAsHeading.name)
			.setDesc(t.settings.timeSection.insertAsHeading.desc);

		this.addToggleSetting("time_section_plain_style", (value) => {
			// Update view plugin when setting changes
			this.plugin.updateViewPlugin();
		})
			.setName(t.settings.timeSection.plainStyle.name)
			.setDesc(t.settings.timeSection.plainStyle.desc);

		this.addTextInputSetting("daily_note_pattern", "\\d{4}-\\d{1,2}-\\d{1,2}")
			.setName(t.settings.timeSection.dailyNotePattern.name)
			.setDesc(t.settings.timeSection.dailyNotePattern.desc);

		this.addSliderSetting("daily_note_heading_level", 1, 6, 1)
			.setName(t.settings.timeSection.headingLevel.name)
			.setDesc(t.settings.timeSection.headingLevel.desc);

		// Timeline 功能设置
		this.addHeading(t.settings.timeline.title).setDesc(t.settings.timeline.desc);
		
		// 显示 Dataview 插件状态 - 按需检测，不使用缓存
		const dataviewStatus = detectDataviewStatus();
		const statusEl = this.containerEl.createEl("div", {
			cls: dataviewStatus.functioning ? "setting-item-description" : "setting-item-description mod-warning"
		});
		
		statusEl.createEl("span", {
			text: dataviewStatus.functioning 
				? t.settings.timeline.dataviewStatus.available.replace('${version}', dataviewStatus.version || 'unknown')
				: t.settings.timeline.dataviewStatus.unavailable,
		});
		
		this.addToggleSetting("enableTimeline", async (value) => {
			if (value && !dataviewStatus.functioning) {
				new Notice(t.notices.timelineRequiresDataview);
			}
		})
			.setName(t.settings.timeline.enable.name)
			.setDesc(t.settings.timeline.enable.desc);
		
		this.addSliderSetting("timelineDefaultHeadingLevel", 1, 6, 1)
			.setName(t.settings.timeline.defaultHeadingLevel.name)
			.setDesc(t.settings.timeline.defaultHeadingLevel.desc);
		
		
		this.addDropdownSetting(
			"timelineDefaultSortOrder",
			["asc", "desc"],
			(option) => option === "asc" ? t.settings.timeline.defaultSortOrder.options.ascending : t.settings.timeline.defaultSortOrder.options.descending
		)
			.setName(t.settings.timeline.defaultSortOrder.name)
			.setDesc(t.settings.timeline.defaultSortOrder.desc);

		// Enhanced List Blocks
		this.addHeading(t.settings.enhancedListBlocks.title).setDesc(t.settings.enhancedListBlocks.desc);

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

		// Enhanced List Blocks Ops
		this.addHeading(t.settings.enhancedListBlocks.ops.title).setDesc(t.settings.enhancedListBlocks.ops.desc);

		const isThirdPartyPluginEnabled = (pluginId: string): boolean => {
			try {
				return Boolean((this.plugin.app as any)?.plugins?.enabledPlugins?.has?.(pluginId));
			} catch {
				return false;
			}
		};

		const addOpsToggle = (
			settingName: KeysOfType<PluginSettings, boolean>,
			name: string,
			desc: string,
			blockReason?: () => string | null
		) => {
			new Setting(this.containerEl)
				.setName(name)
				.setDesc(desc)
				.addToggle((toggle) => {
					toggle.setValue(this.plugin.settings[settingName]).onChange(async (value) => {
						if (value) {
							const reason = blockReason?.();
							if (reason) {
								new Notice(reason);
								toggle.setValue(false);
								return;
							}
						}

						// @ts-ignore
						this.plugin.settings[settingName] = value;
						await this.plugin.saveSettings();
					});
				});
		};

		addOpsToggle(
			"enhancedListOpsZoom",
			t.settings.enhancedListBlocks.ops.zoom.name,
			t.settings.enhancedListBlocks.ops.zoom.desc,
			() => (isThirdPartyPluginEnabled("obsidian-zoom") ? t.notices.enhancedListZoomConflict : null)
		);

		const outlinerConflictReason = () =>
			isThirdPartyPluginEnabled("obsidian-outliner") ? t.notices.enhancedListOutlinerConflict : null;

		addOpsToggle(
			"enhancedListOpsMove",
			t.settings.enhancedListBlocks.ops.move.name,
			t.settings.enhancedListBlocks.ops.move.desc,
			outlinerConflictReason
		);
		addOpsToggle(
			"enhancedListOpsIndent",
			t.settings.enhancedListBlocks.ops.indent.name,
			t.settings.enhancedListBlocks.ops.indent.desc,
			outlinerConflictReason
		);
		addOpsToggle(
			"enhancedListOpsDragDrop",
			t.settings.enhancedListBlocks.ops.dragDrop.name,
			t.settings.enhancedListBlocks.ops.dragDrop.desc,
			outlinerConflictReason
		);
		addOpsToggle(
			"enhancedListOpsVerticalLines",
			t.settings.enhancedListBlocks.ops.verticalLines.name,
			t.settings.enhancedListBlocks.ops.verticalLines.desc,
			outlinerConflictReason
		);
		addOpsToggle(
			"enhancedListOpsBulletThreading",
			t.settings.enhancedListBlocks.ops.bulletThreading.name,
			t.settings.enhancedListBlocks.ops.bulletThreading.desc,
			outlinerConflictReason
		);
	}

}
