import moment from "moment";

class T {
  lang: 'en' = 'en';

  all = {
    en: {
      // Flow Editor buttons - 实际使用的按钮文本
      buttons: {
        openFlow: "Open Flow",
        hideFlow: "Hide Flow", 
        toggleFlow: "Toggle Flow",
        // 表格相关按钮 - FlowEditorHover 中使用
        cutTable: "Cut Table",
        deleteTable: "Delete Table",
      },

      // 标签文本 - 实际使用的标签
      labels: {
        noFile: "not found",
        placeholder: "Type ${1} to open the Flow Menu",
        notePlaceholder: "Click to create a new note",
      },

      // 命令面板条目 - flowCommands 中使用
      commandPalette: {
        openFlow: "Open Flow Editor",
        closeFlow: "Close Flow Editor",
      },

      // 通知消息 - FlowEditorHover 中使用
      notice: {
        tableDeleted: "Table deleted",
      },

      // Settings used in SettingsPanel.ts
      settings: {
        sectionFlow: "Embedded Block Editing",
        editorFlowReplace: {
          name: "Enable Embedded Block Editing",
          desc: "Enable editing embedded blocks in place"
        },
        editorFlowStyle: {
          name: "Editing Style",
          desc: "Choose the visual style for inline editing",
          minimal: "Minimal",
          seamless: "Seamless"
        }
      },

      // Only used translations - Commands
      commands: {
        // Flow commands
        h1: "Heading 1",
        h2: "Heading 2", 
        h3: "Heading 3",
        h4: "Heading 4",
        h5: "Heading 5",
        h6: "Heading 6",
        bold: "Bold",
        italic: "Italic",
        strikethrough: "Strikethrough",
        highlight: "Highlight",
        code: "Code",
        codeblock: "Code Block",
        quote: "Quote",
        link: "Link",
        image: "Image",
        table: "Table",
        divider: "Divider",
        embed: "Embed",
        tag: "Tag",
        callout: "Callout",
        list: "List",
        numberList: "Number List",
        task: "Task",
        toggleList: "Toggle List",
        space: "Space",
        newNote: "New Note",
        newFolder: "New Folder",
      },

      // Commands suggest
      commandsSuggest: {
        noResult: "No results found",
      },

      // Metadata types used in metadata.ts
      metadataTypes: {
        fileName: "File Name",
        path: "Path", 
        folder: "Folder",
        created: "Created",
        lastModified: "Last Modified",
        extension: "Extension",
        size: "Size",
        tags: "Tags",
        inlinks: "Inlinks", 
        outlinks: "Outlinks",
        color: "Color",
      },
    },
  };

  constructor() {
    this.lang = "en"
    const lang = moment.locale();

    if ([ "en" ].includes(lang)) {
      this.lang = lang as "en";
    }
  }

  get texts(): typeof this.all.en {
    return this.all.en;
  }

  get commandPalette() {
    return this.all[this.lang].commandPalette;
  }

  get settings() {
    return this.all[this.lang].settings;
  }

  get commands() {
    return this.all[this.lang].commandPalette;
  }

  get buttons() {
    return this.all[this.lang].buttons;
  }

  get labels() {
    return this.all[this.lang].labels;
  }

  get notice() {
    return this.all[this.lang].notice;
  }
}

const i18n = new T();
export default i18n;
