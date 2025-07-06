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
  ReadOnlyEmbed = 3,
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

    const multiLineBlockRegex = /#\^([a-z0-9]+)-\1$/;
    
    for (const match of str.matchAll(/(?<!!)!\[\[([^\]]+)\]\]/g)) {
      const link = match[1];
      if (multiLineBlockRegex.test(link) && match.index !== undefined) {
        const existingLinks = previous.filter((f) => f.link == link);
        const offset = usedContainers.filter((f) => f == link).length;
        const existingInfo = existingLinks[offset];
        const id = existingInfo ? existingInfo.id : genId();
        usedContainers.push(link);
        const cachedHeight = tr.annotation(cacheFlowEditorHeight);
        const height = existingInfo
          ? cachedHeight?.[0] == id && cachedHeight?.[1] != 0
            ? (cachedHeight[1] || -1)
            : existingInfo.height
          : -1;
        
        const info: FlowEditorInfo = {
          id: id,
          link: match[1],
          from: match.index + 3,
          to: match.index + 3 + match[1].length,
          type: FlowEditorLinkType.ReadOnlyEmbed,
          height: height,
          expandedState: existingInfo
            ? tr.annotation(toggleFlowEditor)?.[0] == id
              ? reverseExpandedState(existingInfo.expandedState)
              : existingInfo.expandedState
            : 1,
        };
        newValues.push(info);
      }
    }

    newValues.sort(compareByField("from", true));
    return newValues;
  },
});

class FlowEditorWidget extends WidgetType {
  public root: Root;
  private externalIconRoot: Root | null = null;
  private externalIconContainer: HTMLElement | null = null;

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
    if (this.info.link && view.state.field(editorInfoField, false)) {
      const infoField = view.state.field(editorInfoField, false);
      if (!infoField) return div;
      
      const file = infoField.file;
      if (!file) return div;

      const isReadOnly = this.info.type === FlowEditorLinkType.ReadOnlyEmbed;

      this.root = createRoot(div);
      this.root.render(
        <UINote
          load={true}
          plugin={this.plugin}
          path={this.info.link}
          source={file.path}
          isReadOnly={isReadOnly}
          view={view}
          info={this.info}
        ></UINote>
      );

      // Create external edit icon for read-only embeds (multi-line blocks)
      if (isReadOnly) {
        // Use setTimeout to ensure DOM structure is stable
        setTimeout(() => {
          this.createExternalEditIcon(view, div);
        }, 0);
      }
    }
    return div;
  }

  private createExternalEditIcon(view: EditorView, widgetDiv: HTMLElement) {
    // Find the CodeMirror root container
    const cmRoot = view.dom.closest('.cm-editor') as HTMLElement;
    if (!cmRoot) return;

    // Clean up any existing external icon
    this.cleanupExternalIcon();

    // Create external icon container
    this.externalIconContainer = document.createElement('div');
    this.externalIconContainer.className = 'mk-floweditor-selector mk-external-icon';
    this.externalIconContainer.style.position = 'absolute';
    this.externalIconContainer.style.zIndex = 'var(--layer-popover)';
    this.externalIconContainer.style.visibility = 'hidden'; // Initially hidden, shown on hover

    // Calculate position relative to widget
    const updatePosition = () => {
      if (!this.externalIconContainer || !widgetDiv) return;
      
      const widgetRect = widgetDiv.getBoundingClientRect();
      const cmRect = cmRoot.getBoundingClientRect();
      
      // Position icon at top-right of widget, with offset
      const left = widgetRect.right - cmRect.left - 40; // 40px from right edge
      const top = widgetRect.top - cmRect.top - 34;     // 34px above widget
      
      this.externalIconContainer.style.left = left + 'px';
      this.externalIconContainer.style.top = top + 'px';
    };

    // Initial positioning
    updatePosition();

    // Attach to CodeMirror root
    cmRoot.appendChild(this.externalIconContainer);

    // Create React root and render edit icon
    this.externalIconRoot = createRoot(this.externalIconContainer);
    
    const infoField = view.state.field(editorInfoField, false);
    const file = infoField?.file;

    if (file) {
      this.externalIconRoot.render(
        <FlowEditorHover
          app={this.plugin.app}
          plugin={this.plugin}
          toggle={true}
          path={this.info.link}
          source={file.path}
          toggleState={false}
          view={view}
          pos={{ from: this.info.from, to: this.info.to }}
          dom={widgetDiv}
        />
      );
    }

    // Handle hover events to show/hide icon
    const showIcon = () => {
      if (this.externalIconContainer) {
        this.externalIconContainer.style.visibility = 'visible';
      }
    };

    const hideIcon = () => {
      if (this.externalIconContainer) {
        this.externalIconContainer.style.visibility = 'hidden';
      }
    };

    // Add hover listeners to widget and icon
    widgetDiv.addEventListener('mouseenter', showIcon);
    widgetDiv.addEventListener('mouseleave', hideIcon);
    this.externalIconContainer.addEventListener('mouseenter', showIcon);
    this.externalIconContainer.addEventListener('mouseleave', hideIcon);

    // Store event handlers for cleanup
    (this.externalIconContainer as any)._showIcon = showIcon;
    (this.externalIconContainer as any)._hideIcon = hideIcon;
    (widgetDiv as any)._showIcon = showIcon;
    (widgetDiv as any)._hideIcon = hideIcon;

    // Update position on scroll or resize
    const updatePositionThrottled = this.throttle(updatePosition, 16); // ~60fps
    window.addEventListener('scroll', updatePositionThrottled, true);
    window.addEventListener('resize', updatePositionThrottled);
    
    // Store handlers for cleanup
    (this.externalIconContainer as any)._updatePosition = updatePositionThrottled;
  }

  private cleanupExternalIcon() {
    if (this.externalIconContainer) {
      // Remove event listeners
      const showIcon = (this.externalIconContainer as any)._showIcon;
      const hideIcon = (this.externalIconContainer as any)._hideIcon;
      const updatePosition = (this.externalIconContainer as any)._updatePosition;

      if (showIcon && hideIcon) {
        this.externalIconContainer.removeEventListener('mouseenter', showIcon);
        this.externalIconContainer.removeEventListener('mouseleave', hideIcon);
      }

      if (updatePosition) {
        window.removeEventListener('scroll', updatePosition, true);
        window.removeEventListener('resize', updatePosition);
      }

      // Cleanup React root
      if (this.externalIconRoot) {
        this.externalIconRoot.unmount();
        this.externalIconRoot = null;
      }

      // Remove from DOM
      if (this.externalIconContainer.parentNode) {
        this.externalIconContainer.parentNode.removeChild(this.externalIconContainer);
      }
      this.externalIconContainer = null;
    }
  }

  private throttle(func: Function, limit: number) {
    let inThrottle: boolean;
    return function(this: any, ...args: any[]) {
      if (!inThrottle) {
        func.apply(this, args);
        inThrottle = true;
        setTimeout(() => inThrottle = false, limit);
      }
    };
  }

  get estimatedHeight(): number {
    return this.info.height;
  }

  destroy(dom: HTMLElement): void {
    // Clean up external icon first
    this.cleanupExternalIcon();
    
    // Clean up widget hover handlers
    const showIcon = (dom as any)._showIcon;
    const hideIcon = (dom as any)._hideIcon;
    if (showIcon && hideIcon) {
      dom.removeEventListener('mouseenter', showIcon);
      dom.removeEventListener('mouseleave', hideIcon);
    }

    // Clean up main React root
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
      if (!infoField) return div;
      
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
