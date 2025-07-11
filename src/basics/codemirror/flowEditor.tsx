import {
  Annotation,
  EditorState,
  StateField,
  Transaction,
  TransactionSpec,
} from "@codemirror/state";
import {
  Decoration,
  EditorView,
  ViewPlugin,
  WidgetType,
  PluginValue,
  ViewUpdate,
} from "@codemirror/view";
import { iterateTreeInSelection } from "basics/codemirror";
import { hoverTooltip } from "basics/tooltip";
import React from "react";
import { flowTypeStateField } from "./flowStateFields";

import i18n from "shared/i18n";

import { FlowEditorHover } from "basics/flow/FlowEditorHover";
import { UINote } from "basics/ui/UINote";
import BlockLinkPlus from "main";
import { uiIconSet } from "shared/assets/icons";

import { compareByField } from "basics/utils/utils";
import { editorInfoField } from "obsidian";
import { createRoot, Root } from "react-dom/client";
import { genId } from "shared/utils/uuid";
import { TFile } from "obsidian";
import { debug } from "console";

//flow editor
export enum FlowEditorState {
  Closed = 0,
  AutoOpen = 1,
  Open = 2,
}
export enum FlowEditorLinkType {
  Link = 0,
  Embed = 1,              // !![[]] embed
  EmbedClosed = 2,
  ReadOnlyEmbed = 3,      // ^![[]] multiline readonly (new)
}

export interface FlowEditorInfo {
  id: string;
  link: string;
  from: number;
  type: FlowEditorLinkType;
  to: number;
  height: number;
  expandedState: FlowEditorState; //0 is closed, 1 is autoopen (prevent infinite nesting), 2 is open, move to enum
}

export const toggleFlowEditor =
  Annotation.define<[id: string, state: number]>();
export const cacheFlowEditorHeight =
  Annotation.define<[id: string, height: number]>();

export const preloadFlowEditor = EditorState.transactionFilter.of(
  (tr: Transaction) => {
    const newTrans = [] as TransactionSpec[];
    const value = tr.state.field(flowEditorInfo, false);
    if (value && !tr.annotation(toggleFlowEditor)) {
      newTrans.push(
        ...value
          .filter((f) => f.expandedState == 1)
          .map((f) => {
            if (tr.state.field(flowTypeStateField, false) == "doc") {
              return {
                annotations: toggleFlowEditor.of([f.id, 2]),
              };
            } else {
              return {
                annotations: toggleFlowEditor.of([f.id, 0]),
              };
            }
          })
      );
    }
    return [tr, ...newTrans];
  }
);

export const flowEditorInfo = StateField.define<FlowEditorInfo[]>({
  create() {
    return [];
  },
  update(value, tr) {
    console.log('⚡ flowEditorInfo UPDATE called:', {
      docChanged: tr.docChanged,
      effects: tr.effects.length
    });

    const newValues = [] as FlowEditorInfo[];
    const previous = value;
    const usedContainers: string[] = [];

    const str = tr.newDoc.sliceString(0);
    console.log('⚡ Document content length:', str.length);

    const reverseExpandedState = (state: FlowEditorState) => {
      const news =
        state != FlowEditorState.Open
          ? FlowEditorState.Open
          : FlowEditorState.Closed;
      return news;
    };

    // Only process embed links, not regular [[xxx]] links
    for (const match of str.matchAll(/!!\[\[([^\]]+)\]\]/g)) {
      console.log('⚡ Found !![[]] pattern:', match[0]);
      const link = match[1];
      const existingLinks = previous.filter((f) => f.link == link);
      const offset = usedContainers.filter((f) => f == link).length;
      const existingInfo = existingLinks[offset];
      const id = existingInfo ? existingInfo.id : genId();
      usedContainers.push(link);
      const info = {
        id: id,
        link: match[1],
        from: match.index + 4,
        to: match.index + 4 + match[1].length,
        type: FlowEditorLinkType.Embed,
        height: existingInfo
          ? tr.annotation(cacheFlowEditorHeight)?.[0] == id &&
            tr.annotation(cacheFlowEditorHeight)?.[1] != 0
            ? tr.annotation(cacheFlowEditorHeight)?.[1]
            : existingInfo.height
          : -1,
        expandedState: existingInfo
          ? tr.annotation(toggleFlowEditor)?.[0] == id
            ? reverseExpandedState(existingInfo.expandedState)
            : existingInfo.expandedState
          : 1,
      };
      newValues.push(info);
    }

    // Step 2: Process ![[]] syntax for multiline block references
    for (const match of str.matchAll(/(?<!!)!\[\[([^\]]+)\]\]/g)) {
      const link = match[1];
      console.log('⚡ Found ![[]] pattern:', match[0], 'link:', link);
      
      if (!link.match(/#\^([a-z0-9]+)-\1$/)) {
        console.log('⚡ Not a multiline block pattern, skipping');
        continue;
      }

      console.log('⚡ Valid multiline block detected, creating FlowEditorInfo');
      
      if (match.index === undefined) continue;
      
      const from = match.index;
      const to = match.index + match[0].length;
      const id = genId();

      newValues.push({
        id,
        link,
        from,
        to,
        type: FlowEditorLinkType.ReadOnlyEmbed,
        height: -1,
        expandedState: FlowEditorState.Open
      });
    }

    newValues.sort(compareByField("from", true));
    console.log('⚡ Total FlowEditorInfo created:', newValues.length);
    return newValues;
  },
});

class FlowEditorWidget extends WidgetType {
  public root: Root;
  constructor(
    private readonly info: FlowEditorInfo,
    public plugin: BlockLinkPlus
  ) {
    super();
  }

  eq(other: WidgetType) {
    return (other as unknown as FlowEditorWidget).info.id === this.info.id;
  }

  toDOM(view: EditorView) {
    console.log('🎨 FlowEditorWidget.toDOM called:', {
      infoId: this.info.id,
      infoType: this.info.type,
      infoLink: this.info.link,
      isReadOnlyEmbed: this.info.type === FlowEditorLinkType.ReadOnlyEmbed
    });

    const div = document.createElement("div");
    div.classList.add("mk-floweditor-container");

    // Add different CSS class for multiline readonly
    if (this.info.type === FlowEditorLinkType.ReadOnlyEmbed) {
      console.log('🎨 Adding readonly multiline class');
      div.classList.add("mk-multiline-readonly");
    }

    div.setAttribute("id", "mk-flow-" + this.info.id);
    div.style.setProperty("height", this.info.height + "px");
    
    if (this.info.link && view.state.field(editorInfoField, false)) {
      const infoField = view.state.field(editorInfoField, false);
      const file = infoField.file;

      // Step 2: For ReadOnlyEmbed, show fixed test content
      if (this.info.type === FlowEditorLinkType.ReadOnlyEmbed) {
        console.log('🎨 Rendering ReadOnlyEmbed test content');
        div.innerHTML = `
          <div class="mk-multiline-block-test" style="border: 1px solid #ccc; padding: 10px; background: #f9f9f9;">
            <strong>Multiline Block Test Content (Live Preview)</strong><br>
            This is the first line<br>
            This is the second line<br>
            This is the third line<br>
            <small>Reference: ${this.info.link}</small>
          </div>
        `;
      } else if (file) {
        console.log('🎨 Rendering normal UINote for:', this.info.link);
        // Normal UINote rendering for other types (only if file exists)
        this.root = createRoot(div);
        this.root.render(
          <UINote
            load={true}
            plugin={this.plugin}
            path={this.info.link}
            source={file.path}
          ></UINote>
        );
      }
    }
    
    console.log('🎨 FlowEditorWidget.toDOM completed, returning div');
    return div;
  }
  get estimatedHeight(): number {
    return this.info.height;
  }
  destroy(dom: HTMLElement): void {
    if (this.root) this.root.unmount();
  }
}

export class FlowEditorSelector extends WidgetType {
  flowInfo: FlowEditorInfo;
  plugin: BlockLinkPlus;
  constructor(readonly info: FlowEditorInfo, plugin: BlockLinkPlus) {
    super();
    this.flowInfo = info;
    this.plugin = plugin;
  }

  eq(other: WidgetType) {
    return (other as unknown as FlowEditorSelector).info.id === this.info.id;
  }

  toDOM(view: EditorView) {
    const div = document.createElement("div");
    div.classList.add("mk-floweditor-selector");
    const reactEl = createRoot(div);
    if (this.info.link && view.state.field(editorInfoField, false)) {
      const infoField = view.state.field(editorInfoField, false);
      const file = infoField.file;

      reactEl.render(
        <FlowEditorHover
          app={this.plugin.app}
          plugin={this.plugin}
          toggle={true}
          path={this.info.link}
          source={file?.path}
          toggleState={true}
          view={view}
          pos={{ from: this.info.from, to: this.info.to }}
          dom={div}
        ></FlowEditorHover>
      );
    }
    return div;
  }
}

export const flowEditorSelector = (
  info: FlowEditorInfo,
  plugin: BlockLinkPlus
) =>
  Decoration.replace({
    widget: new FlowEditorSelector(info, plugin),
    inclusive: true,
    block: false,
  });

export const flowEditorDecoration = (
  info: FlowEditorInfo,
  plugin: BlockLinkPlus
) =>
  Decoration.replace({
    widget: new FlowEditorWidget(info, plugin),
    inclusive: true,
    block: false,
  });

export const flowEditorWidgetDecoration = (
  info: FlowEditorInfo,
  plugin: BlockLinkPlus
) =>
  Decoration.replace({
    widget: new FlowEditorWidget(info, plugin),
    inclusive: true,
    block: true,
  });

const flowEditorDecorations = (view: EditorView, plugin: BlockLinkPlus) => {
  console.log('🛠️ flowEditorDecorations CALLED');
  const builder = new RangeSetBuilder<Decoration>();
  if (!view.state.field(editorInfoField, false)) {
    console.log('🛠️ No infoField, finishing');
    return builder.finish();
  }
  const infoField = view.state.field(editorInfoField, false);
  console.log(`🛠️ Processing ${infoField.infos.length} infos`);

  for (const info of infoField.infos) {
    console.log(`🛠️  - Info: type=${info.type}, link=${info.link}, from=${info.from}, to=${info.to}, state=${info.expandedState}`);
    if (info.expandedState != FlowEditorState.Open) {
      console.log(`🛠️  - SKIPPING decoration: not open`);
      continue;
    }

    if (
      (view.state.selection.main.from == info.from - 4 &&
        view.state.selection.main.to == info.to + 2) ||
      (view.state.selection.main.from >= info.from - 3 &&
        view.state.selection.main.to <= info.to + 1)
    ) {
      console.log(`🛠️  - SKIPPING decoration: selection overlap`);
      continue;
    }
    
    console.log(`🛠️  - ADDING decoration for ${info.id}`);
    builder.add(
      info.from,
      info.to,
      Decoration.replace({
        widget: new FlowEditorWidget(info, plugin),
        inclusive: true,
        block: false,
      })
    );
  }
  const finalDecorations = builder.finish();
  console.log(`🛠️ flowEditorDecorations COMPLETED, returning ${finalDecorations.size} decorations`);
  return finalDecorations;
};
