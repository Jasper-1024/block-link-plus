import BlockLinkPlus from "main";
import { App, PluginSettingTab, Setting } from "obsidian";
import t from "shared/i18n";

export class MakeBasicsSettingsTab extends PluginSettingTab {
  plugin: BlockLinkPlus;

  constructor(app: App, plugin: BlockLinkPlus) {
    super(app, plugin);
    this.plugin = plugin;
  }

  display(): void {
    const { containerEl } = this;
    containerEl.empty();

    // Inline Edit Settings
    containerEl.createEl("h3", { text: t.settings.inlineEdit.title });

    new Setting(containerEl)
      .setName(t.settings.inlineEdit.enable.name)
      .setDesc(t.settings.inlineEdit.enable.desc)
      .addToggle((toggle) =>
        toggle.setValue(this.plugin.settings.inlineEditEnabled).onChange((value) => {
          this.plugin.settings.inlineEditEnabled = value;
          this.plugin.saveData(this.plugin.settings);
        })
      );

    new Setting(containerEl)
      .setName(t.settings.inlineEdit.file.name)
      .setDesc(t.settings.inlineEdit.file.desc)
      .addToggle((toggle) =>
        toggle.setValue(this.plugin.settings.inlineEditFile).onChange((value) => {
          this.plugin.settings.inlineEditFile = value;
          this.plugin.saveData(this.plugin.settings);
        })
      );

    new Setting(containerEl)
      .setName(t.settings.inlineEdit.heading.name)
      .setDesc(t.settings.inlineEdit.heading.desc)
      .addToggle((toggle) =>
        toggle.setValue(this.plugin.settings.inlineEditHeading).onChange((value) => {
          this.plugin.settings.inlineEditHeading = value;
          this.plugin.saveData(this.plugin.settings);
        })
      );

    new Setting(containerEl)
      .setName(t.settings.inlineEdit.block.name)
      .setDesc(t.settings.inlineEdit.block.desc)
      .addToggle((toggle) =>
        toggle.setValue(this.plugin.settings.inlineEditBlock).onChange((value) => {
          this.plugin.settings.inlineEditBlock = value;
          this.plugin.saveData(this.plugin.settings);
        })
      );
  }
}
