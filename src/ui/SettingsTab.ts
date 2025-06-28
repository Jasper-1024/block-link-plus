import { App, Plugin, PluginSettingTab, Setting, DropdownComponent, Notice } from "obsidian";
import t from "shared/i18n";
import { KeysOfType, PluginSettings } from "../types";
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

		this.addDropdownSetting(
			//@ts-ignore
			"mult_line_handle",
			["0", "1", "2"],
			(option) => {
				const optionsSet = new Map([
					["0", t.settings.multiLineHandle.options.default],
					["1", t.settings.multiLineHandle.options.addHeading],
					["2", t.settings.multiLineHandle.options.addMultiBlock],
				]);
				return optionsSet.get(option) || "Unknown";
			}
		)
			.setName(t.settings.multiLineHandle.name)
			.setDesc(t.settings.multiLineHandle.desc);

		// Block link	
		this.addHeading(t.settings.blockLink.title).setDesc(t.settings.blockLink.desc);
		this.addToggleSetting("enable_right_click_block").setName(t.settings.blockLink.enableRightClick.name);
		this.addToggleSetting("enable_block_notification").setName(t.settings.blockLink.enableNotification.name);

		this.addDropdownSetting(
			//@ts-ignore
			"alias_type",
			["0", "1", "2", "3"],
			(option) => {
				const optionsSet = new Map([
					["0", t.settings.blockLink.aliasStyle.options.noAlias],
					["1", t.settings.blockLink.aliasStyle.options.firstChars],
					["2", t.settings.blockLink.aliasStyle.options.parentHeading],
					["3", t.settings.blockLink.aliasStyle.options.selectedText]
				]);
				return optionsSet.get(option) || "Unknown";
			}
		)
			.setName(t.settings.blockLink.aliasStyle.name)
			.setDesc(t.settings.blockLink.aliasStyle.desc);

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

		this.addToggleSetting("enble_prefix").setName(t.settings.blockId.enablePrefix.name);

		this.addTextInputSetting("id_prefix", "")
			.setName(t.settings.blockId.prefix.name)
			.setDesc(t.settings.blockId.prefix.desc);

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
			"timelineDefaultEmbedFormat",
			["!![[]]", "![[]]"],
			(option) => option === "!![[]]" ? t.settings.timeline.defaultEmbedFormat.options.expanded : t.settings.timeline.defaultEmbedFormat.options.collapsed
		)
			.setName(t.settings.timeline.defaultEmbedFormat.name)
			.setDesc(t.settings.timeline.defaultEmbedFormat.desc);
		
		this.addDropdownSetting(
			"timelineDefaultSortOrder",
			["asc", "desc"],
			(option) => option === "asc" ? t.settings.timeline.defaultSortOrder.options.ascending : t.settings.timeline.defaultSortOrder.options.descending
		)
			.setName(t.settings.timeline.defaultSortOrder.name)
			.setDesc(t.settings.timeline.defaultSortOrder.desc);

		// 内联编辑
		this.addHeading(t.settings.sectionFlow).setDesc(t.settings.embeddedBlockDesc);
		// 从 SettingsPanel.ts 中提取的设置
		this.addToggleSetting("editorFlow")
			.setName(t.settings.editorFlowReplace.name)
			.setDesc(t.settings.editorFlowReplace.desc);

		// Embedded editing style
		new Setting(containerEl)
			.setName(t.settings.editorFlowStyle.name)
			.setDesc(t.settings.editorFlowStyle.desc)
			.addDropdown((dropdown: DropdownComponent) => {
				dropdown.addOption("minimal", t.settings.editorFlowStyle.minimal);
				dropdown.addOption("seamless", t.settings.editorFlowStyle.seamless);
				dropdown
					.setValue(this.plugin.settings.editorFlowStyle)
					.onChange(async (value) => {
						this.plugin.settings.editorFlowStyle = value;
						this.updateFlowStyleClasses(value);
						await this.plugin.saveData(this.plugin.settings);
					});
			});
	}

	// 添加 updateFlowStyleClasses 方法
	private updateFlowStyleClasses(style: string): void {
		// 移除所有 flow 样式类
		document.body.classList.remove("mk-flow-minimal", "mk-flow-seamless");

		// 添加选定的样式类
		if (style === "minimal") {
			document.body.classList.add("mk-flow-minimal");
		} else if (style === "seamless") {
			document.body.classList.add("mk-flow-seamless");
		}
	}
}
