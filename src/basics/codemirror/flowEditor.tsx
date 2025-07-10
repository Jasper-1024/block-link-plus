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

//flow editor
export enum FlowEditorState {
  Closed = 0,
  AutoOpen = 1,
  Open = 2,
}
export enum FlowEditorLinkType {
  Link = 0,
  Embed = 1,
  EmbedClosed = 2,
  ReadOnlyEmbed = 3,      // ^![[]] readonly embed
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
    const newValues = [] as FlowEditorInfo[];
    const previous = value;
    const usedContainers: string[] = [];

    const str = tr.newDoc.sliceString(0);

    const reverseExpandedState = (state: FlowEditorState) => {
      const news =
        state != FlowEditorState.Open
          ? FlowEditorState.Open
          : FlowEditorState.Closed;
      return news;
    };

    // Only process embed links, not regular [[xxx]] links
    for (const match of str.matchAll(/!!\[\[([^\]]+)\]\]/g)) {
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

    // step1: detect ^![[]] readonly embed
    for (const match of str.matchAll(/\^!\[\[([^\]]+)\]\]/g)) {
      if (match.index === undefined) continue;
      
      const link = match[1];
      console.log('🔍 found readonly embed:', link);
      
      // validate if it is a valid multiline block reference format #^xyz-xyz
      if (!link.match(/#\^([a-z0-9]+)-\1$/)) {
        console.log('❌ invalid multiline block reference format:', link);
        console.log('💡 correct format should be: file#^abc-abc (where abc is the same identifier)');
        continue;
      }
      
      console.log('✅ valid multiline block reference format:', link);
      
      // step2: create FlowEditorInfo object
      const id = genId();
      const info: FlowEditorInfo = {
        id: id,
        link: link,
        from: match.index + 3,  // 跳过 "^![["
        to: match.index + 3 + link.length,
        type: FlowEditorLinkType.ReadOnlyEmbed,
        height: -1,
        expandedState: FlowEditorState.Open  // 默认展开
      };
      
      newValues.push(info);
      console.log('🎯 created readonly embed info:', { id, link, type: 'ReadOnlyEmbed' });
    }

    newValues.sort(compareByField("from", true));
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
    const div = document.createElement("div");
    div.classList.add("mk-floweditor-container");

    div.setAttribute("id", "mk-flow-" + this.info.id);
    div.style.setProperty("height", this.info.height + "px");
    
    // step2: handle readonly embed
    if (this.info.type === FlowEditorLinkType.ReadOnlyEmbed) {
      div.classList.add("mk-multiline-readonly");
      div.innerHTML = `
        <div style="border: 1px solid #ccc; padding: 10px; background: #f9f9f9; border-radius: 4px;">
          <strong>MULTILINE BLOCK TEST (Live Preview)</strong><br>
          This is the first line<br>
          This is the second line<br>
          This is the third line<br>
          <small>Reference: ${this.info.link}</small>
        </div>
      `;
      return div;
    }
    
    // handle other types
    if (this.info.link && view.state.field(editorInfoField, false)) {
      const infoField = view.state.field(editorInfoField, false);
      const file = infoField.file;

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
  Decoration.widget({
    widget: new FlowEditorWidget(info, plugin),
    inclusiveStart: true,
    block: true,
  });
