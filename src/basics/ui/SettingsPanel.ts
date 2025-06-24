import BlockLinkPlus from "main";
import { App, DropdownComponent, PluginSettingTab, Setting } from "obsidian";
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

    // Embedded Block Editing Settings
    containerEl.createEl("h3", { text: t.settings.sectionFlow });
    
    // Enable embedded block editing
    new Setting(containerEl)
      .setName(t.settings.editorFlowReplace.name)
      .setDesc(t.settings.editorFlowReplace.desc)
      .addToggle((toggle) =>
        toggle.setValue(this.plugin.settings.editorFlow).onChange((value) => {
          this.plugin.settings.editorFlow = value;
          this.plugin.saveData(this.plugin.settings);
        })
      );

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

  private updateFlowStyleClasses(style: string): void {
    // Remove all flow style classes
    document.body.classList.remove("mk-flow-minimal", "mk-flow-seamless");
    
    // Add the selected style class
    if (style === "minimal") {
      document.body.classList.add("mk-flow-minimal");
    } else if (style === "seamless") {
      document.body.classList.add("mk-flow-seamless");
    }
  }
}
