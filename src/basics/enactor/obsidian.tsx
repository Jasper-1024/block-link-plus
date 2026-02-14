import { cmExtensions } from "basics/cmExtensions";
import BlockLinkPlus from "main";
import {
  Notice,
  TFile,
} from "obsidian";
import { editableRange } from "shared/utils/codemirror/selectiveEditor";
import { getLineRangeFromRef } from "shared/utils/obsidian";
import { openPathInElement } from "shared/utils/openPathInElement";
import { parseURI } from "shared/utils/uri";

import { BasicDefaultSettings } from "basics/schemas/settings";
import { Command } from "basics/types/command";
import { Enactor } from "./enactor";

export class ObsidianEnactor implements Enactor {
  constructor(public plugin: BlockLinkPlus) {}

  name = "Obsidian";
  load() {
    this.plugin.settings = Object.assign(
      {},
      BasicDefaultSettings,
      this.plugin.settings
    );
    this.loadCommands();
  }
  loadCommands() {
    this.plugin.addCommand({
      id: "mk-flow-editor",
      name: "Toggle Inline Edit",
      callback: () => {
        this.plugin.settings.inlineEditEnabled = !this.plugin.settings.inlineEditEnabled;
        void this.plugin.saveSettings();
        this.plugin.flowEditorManager.reloadExtensions(false);
      },
    });
    return [
      {
        label: "embed",
        value: `![[]]`,
        icon: "mk-make-embed",
      },
      {
        label: "link",
        value: `[[]]`,
        icon: "mk-make-link",
      },
    ] as Command[];
  }
  loadExtensions(firstLoad: boolean) {
    const extensions = cmExtensions(this.plugin);
    if (firstLoad) {
      this.plugin.registerEditorExtension(extensions);
    }
  }
  uriByString(uri: string, source?: string) {
    if (!uri) return null;

    let basePath = uri;
    let subpath: string | undefined;

    if (uri.includes('#')) {
        const parts = uri.split('#');
        basePath = parts[0];
        subpath = '#' + parts.slice(1).join('#');
    }

    if (source) {
        const file = this.plugin.app.metadataCache.getFirstLinkpathDest(basePath, source);
        // If the file is not found, we can't proceed.
        if (!file) return null;
        basePath = file.path;
    }

    const finalUri = subpath ? `${basePath}${subpath}` : basePath;
    return parseURI(finalUri);
  }
  openPath(path: string, source?: HTMLElement, isReadOnly?: boolean) {
    const uri = this.uriByString(path);
	if (!uri) {
		new Notice(`File not found: ${path}`);
		return;
	}
    openPathInElement(
      this.plugin.app,
      this.plugin.app.workspace.getLeaf(),
      source,
      undefined,
      async (editor) => {
        const leaf = editor.attachLeaf();
        if (this.plugin.app.vault.getAbstractFileByPath(uri.basePath) instanceof TFile) {
          await leaf.openFile(this.plugin.app.vault.getAbstractFileByPath(uri.basePath) as TFile);
          const selectiveRange = getLineRangeFromRef(uri.basePath, uri.refStr, this.plugin.app);
          if (!leaf.view?.editor) return;
          
          // 无论是否只读，都需要设置范围来限制显示的行
          if (selectiveRange[0] && selectiveRange[1]) {
            leaf.view.editor?.cm.dispatch({
              annotations: [editableRange.of(selectiveRange)],
            });
          }
          
          // 如果是只读模式，设置编辑器为只读
          if (isReadOnly && leaf.view?.editor) {
            // 使用 CSS 类和编辑器设置确保只读
            leaf.view.editor.cm.contentDOM.contentEditable = 'false';
            leaf.view.editor.cm.dom.classList.add('mk-readonly-editor');
          }
        }
      }
    );
  }
}
