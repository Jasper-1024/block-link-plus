import { App, Plugin, PluginSettingTab, Setting, DropdownComponent } from "obsidian";
import t from "shared/i18n";
import { KeysOfType, PluginSettings } from "../types";
import BlockLinkPlus from "main";

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
		// title
		containerEl.empty();
		containerEl.createEl("h2", { text: "Block link Plus" });

		this.addDropdownSetting(
			//@ts-ignore
			"mult_line_handle",
			["0", "1", "2"],
			(option) => {
				const optionsSet = new Map([
					["0", "Default"],
					["1", "Add new heading"],
					["2", "Add multi block"],
				]);
				return optionsSet.get(option) || "Unknown";
			}
		)
			.setName("Multi-line block behavior")
			.setDesc(
				"Define how multi-line selections generate block ids. 'Default' treats them as a single line."
			);

		// Block link	
		this.addHeading("Block link").setDesc("Link: [[file#block_id]]");
		this.addToggleSetting("enable_right_click_block").setName("Enable block link in right click menu");
		this.addToggleSetting("enable_block_notification").setName("Show notification when block link is copied");

		this.addDropdownSetting(
			//@ts-ignore
			"alias_type",
			["0", "1", "2", "3"],
			(option) => {
				const optionsSet = new Map([
					["0", "No alias"],
					["1", "First X chars"],
					["2", "Parent heading"],
					["3", "Selected text"]
				]);
				return optionsSet.get(option) || "Unknown";
			}
		)
			.setName("Alias style")
			.setDesc(
				"Choose how to generate aliases for block links." +
				"For heading blocks, alias will always be the heading text unless 'No alias' is selected."
			);

		this.addSliderSetting("alias_length", 1, 100, 1)
			.setName("Alias length")
			.setDesc("Set the length of the alias (1-100). Only used when alias style is 'First X chars'.");

		this.addToggleSetting("heading_id_newline")
			.setName("Experimental: Heading block ID style")
			.setDesc("Place block ID in new line when selecting a single heading line only");

		// Embed link
		this.addHeading("Embed link").setDesc("Link: ![[file#block_id]]");
		this.addToggleSetting("enable_right_click_embed").setName("Enable embed link in right click menu");
		this.addToggleSetting("enable_embed_notification").setName("Show notification when embed link is copied");

		// Obsidian URI
		this.addHeading("Obsidian URI link").setDesc("Link: obsidian://open?vault=${vault}&file=${filePath}${encodedBlockId} ");
		this.addToggleSetting("enable_right_click_url").setName("Enable Obsidian URI link in right click menu");
		this.addToggleSetting("enable_url_notification").setName("Show notification when URI link is copied");

		// block id
		this.addHeading("Block Id").setDesc("Custom block_id");
		this.addSliderSetting("id_length", 3, 7, 1)
			.setName("Max block id Length")
			.setDesc("Set the maximum number of characters for a block id.");

		this.addToggleSetting("enble_prefix").setName("Custom id prefix");

		this.addTextInputSetting("id_prefix", "")
			.setName("Block id prefix")
			.setDesc("Block id will be: prefix-random_str");

		// 时间章节设置
		this.addHeading("Time Section").setDesc("Insert time-based headings");

		this.addToggleSetting("enable_time_section")
			.setName("Enable time section feature");

		this.addToggleSetting("enable_time_section_in_menu")
			.setName("Show in context menu")
			.setDesc("If enabled, adds time section option to the right-click menu");

		this.addTextInputSetting("time_section_format", "HH:mm")
			.setName("Time format")
			.setDesc("Format for the time section (HH:mm = 24-hour format)");

		this.addToggleSetting("insert_heading_level")
			.setName("Insert as heading")
			.setDesc("If enabled, inserts time with heading marks (#), otherwise inserts just the time");

		this.addToggleSetting("time_section_plain_style", (value) => {
			// Update view plugin when setting changes
			this.plugin.updateViewPlugin();
		})
			.setName("Plain text style in preview")
			.setDesc("If enabled, time sections will appear as plain text in preview mode, even when inserted as headings");

		this.addTextInputSetting("daily_note_pattern", "\\d{4}-\\d{1,2}-\\d{1,2}")
			.setName("Daily note pattern")
			.setDesc("Regular expression to identify daily note filenames (default: YYYY-MM-DD)");

		this.addSliderSetting("daily_note_heading_level", 1, 6, 1)
			.setName("Daily note heading level")
			.setDesc("Heading level to use in daily notes (1-6, corresponds to #-######)");

		// 内联编辑
		this.addHeading("Embedded Block Editing").setDesc("Settings for inline editing of embedded blocks");
		// 从 SettingsPanel.ts 中提取的设置
		this.addToggleSetting("editorFlow")
			.setName(t.settings.editorFlowReplace.name)
			.setDesc(t.settings.editorFlowReplace.desc);
		// this.addDropdownSetting(
		// 	//@ts-ignore
		// 	"editorFlowStyle",
		// 	["minimal", "seamless"],
		// 	(option) => {
		// 		const optionsMap = new Map([
		// 			["minimal", i18n.settings.editorFlowStyle.minimal],
		// 			["seamless", i18n.settings.editorFlowStyle.seamless],
		// 		]);
		// 		return optionsMap.get(option) || option;
		// 	}
		// )
		// 	.setName(i18n.settings.editorFlowStyle.name)
		// 	.setDesc(i18n.settings.editorFlowStyle.desc);

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
