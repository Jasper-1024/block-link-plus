import { EditorState, RangeSetBuilder, StateField } from "@codemirror/state";
import { Decoration, DecorationSet, EditorView } from "@codemirror/view";
import { cmExtensions } from "basics/cmExtensions";
import {
  flowEditorDecoration,
  flowEditorInfo,
  FlowEditorLinkType,
  flowEditorSelector,
  FlowEditorState,
  flowEditorWidgetDecoration,
} from "basics/codemirror/flowEditor";
import { compareByField } from "basics/utils/utils";
import BlockLinkPlus from "main";
import {
  App,
  Editor,
  Notice,
  TFile,
  TFolder,
} from "obsidian";
import { createRoot } from "react-dom/client";
import i18n from "shared/i18n";
import { SelectOption } from "shared/types/menu";
import { SpaceFragmentSchema } from "shared/types/spaceFragment";
import { editableRange } from "shared/utils/codemirror/selectiveEditor";
import { getLineRangeFromRef } from "shared/utils/obsidian";
import { openPathInElement } from "shared/utils/openPathInElement";
import { parseURI } from "shared/utils/uri";

import { BasicDefaultSettings } from "basics/schemas/settings";
import { Command } from "basics/types/command";
import { Enactor } from "./enactor";

const flowEditorRangeset = (state: EditorState, plugin: BlockLinkPlus) => {
  const builder = new RangeSetBuilder<Decoration>();
  const infoFields = state.field(flowEditorInfo, false);
  if (!infoFields) return builder.finish();
  const values = [] as { start: number; end: number; decoration: Decoration }[];
  for (const info of infoFields) {
    const { from, to, type, expandedState } = info;
    const lineFix =
      from - 3 == state.doc.lineAt(from).from &&
      to + 2 == state.doc.lineAt(from).to;
    if (type == FlowEditorLinkType.Link) {
      if (expandedState == FlowEditorState.Open) {
        values.push({
          start: to + 2,
          end: to + 2,
          decoration: flowEditorDecoration(info, plugin),
        });
      }
    } else if (
      expandedState == FlowEditorState.Open &&
      type == FlowEditorLinkType.Embed
    ) {
      if (
        !(
          (state.selection.main.from == from - 4 &&
            state.selection.main.to == to + 2) ||
          (state.selection.main.from >= from - 3 &&
            state.selection.main.to <= to + 1)
        )
      ) {
        values.push({
          start: from - 4,
          end: from - 3,
          decoration: flowEditorSelector(info, plugin),
        });
        if (lineFix) {
          values.push({
            start: from - 3,
            end: to + 2,
            decoration: flowEditorWidgetDecoration(info, plugin),
          });
        } else {
          values.push({
            start: from - 3,
            end: to + 2,
            decoration: flowEditorDecoration(info, plugin),
          });
        }
      }
    }
    // DISABLED: ReadOnlyEmbed now handled by MarkdownPostProcessor only
    /*
    else if (
      expandedState == FlowEditorState.Open &&
      type == FlowEditorLinkType.ReadOnlyEmbed
    ) {
      // Handle ^![[]] multiline readonly blocks
      // Use different selection boundaries due to different syntax (^![[]] vs ![[]])
      const shouldSkip = (
        (state.selection.main.from == from - 3 &&
          state.selection.main.to == to + 2) ||
        (state.selection.main.from >= from - 2 &&
          state.selection.main.to <= to + 1)
      );
      
      if (!shouldSkip) {
        // For ReadOnlyEmbed, replace the entire ^![[]] syntax
        values.push({
          start: from - 3,  // Start from ^
          end: to + 2,      // End after ]]
          decoration: flowEditorWidgetDecoration(info, plugin),
        });
      }
    }
    */
  }
  values.sort(compareByField("start", true));
  for (const value of values) {
    builder.add(value.start, value.end, value.decoration);
  }
  const dec = builder.finish();
  return dec;
};

const flowEditorField = (plugin: BlockLinkPlus) =>
  StateField.define<DecorationSet>({
    create(state) {
      return flowEditorRangeset(state, plugin);
    },
    update(value, tr) {
      return flowEditorRangeset(tr.state, plugin);
    },
    provide: (f) => EditorView.decorations.from(f),
  });

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
