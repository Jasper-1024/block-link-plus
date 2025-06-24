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
    this.plugin.commands = this.loadCommands();
  }
  loadCommands() {
    this.plugin.addCommand({
      id: "mk-flow-editor",
      name: "Toggle Flow Editor",
      callback: () => {
        this.plugin.settings.editorFlow = !this.plugin.settings.editorFlow;
        this.plugin.saveData(this.plugin.settings);
        this.plugin.reloadExtensions(false);
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
    if (this.plugin.settings.editorFlow) {
      this.plugin.registerEditorExtension(flowEditorField(this.plugin));
    }
  }
  uriByString(uri: string, source?: string) {
    if (!uri) return null;
    if (source) {
      uri = this.plugin.app.metadataCache.getFirstLinkpathDest(uri, source)?.path;
      if (!uri) return null;
    }
    return parseURI(uri);
  }
  openPath(path: string, source?: HTMLElement) {
    const uri = this.uriByString(path);
    openPathInElement(
      this.plugin.app,
      this.plugin.app.workspace.getLeaf(),
      source,
      null,
      async (editor) => {
        const leaf = editor.attachLeaf();
        if (this.plugin.app.vault.getAbstractFileByPath(uri.basePath) instanceof TFile) {
          await leaf.openFile(this.plugin.app.vault.getAbstractFileByPath(uri.basePath) as TFile);
          const selectiveRange = getLineRangeFromRef(uri.basePath, uri.refStr, this.plugin.app);
          if (!leaf.view?.editor) return;
          if (selectiveRange[0] && selectiveRange[1]) {
            leaf.view.editor?.cm.dispatch({
              annotations: [editableRange.of(selectiveRange)],
            });
          }
        }
      }
    );
  }
}
