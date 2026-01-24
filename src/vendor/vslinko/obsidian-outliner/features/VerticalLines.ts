// @ts-nocheck
import { Plugin } from "obsidian";

import {
  EditorView,
  PluginValue,
  ViewPlugin,
  ViewUpdate,
} from "@codemirror/view";

import { Feature } from "./Feature";

import { MyEditor, getEditorFromState } from "../editor";
import { List, Root } from "../root";
import { ObsidianSettings } from "../services/ObsidianSettings";
import { Parser } from "../services/Parser";
import { Settings } from "../services/Settings";
import { isEditorViewInBlpVslinkoScope } from "../../blp-scope";

const VERTICAL_LINES_BODY_CLASS = "outliner-plugin-vertical-lines";

interface LineData {
  top: number;
  left: number;
  height: string;
  list: List;
}

class VerticalLinesPluginValue implements PluginValue {
  private scheduled: ReturnType<typeof setTimeout>;
  private scroller: HTMLElement;
  private contentContainer: HTMLElement;
  private editor: MyEditor;
  private lastLine: number;
  private lines: LineData[];
  private lineElements: HTMLElement[] = [];
  private parsedRoots: Root[] = [];
  private lineXOffsetPx = 0;
  private activeConnectorSvg: SVGSVGElement | null = null;
  private activeConnectorPath: SVGPathElement | null = null;
  private isActive = false;
  private isDestroyed = false;

  constructor(
    private settings: Settings,
    private obsidianSettings: ObsidianSettings,
    private parser: Parser,
    private view: EditorView,
  ) {
    this.refreshScope();
    setTimeout(this.refreshScope, 0);
  }

  private refreshScope = () => {
    if (this.isDestroyed) return;

    const next = isEditorViewInBlpVslinkoScope(this.view);
    if (next === this.isActive) return;

    this.isActive = next;
    if (next) {
      this.enable();
    } else {
      this.disable();
    }
  };

  private enable() {
    this.view.scrollDOM.addEventListener("scroll", this.onScroll);
    this.settings.onChange(this.scheduleRecalculate);

    this.prepareDom();
    // Obsidian can restore a non-zero scrollTop on editor mount without emitting a
    // scroll event. Sync immediately to avoid "floating" lines until the next scroll.
    try {
      this.scroller.scrollTo(this.view.scrollDOM.scrollLeft, this.view.scrollDOM.scrollTop);
    } catch {
      // ignore
    }
    this.waitForEditor();
  }

  private disable() {
    try {
      this.settings.removeCallback(this.scheduleRecalculate);
    } catch {
      // ignore
    }
    try {
      this.view.scrollDOM.removeEventListener("scroll", this.onScroll);
    } catch {
      // ignore
    }

    try {
      clearTimeout(this.scheduled);
    } catch {
      // ignore
    }

    // Remove injected DOM to avoid affecting out-of-scope editors when CSS is scoped.
    try {
      if (this.scroller && this.scroller.parentElement === this.view.dom) {
        this.view.dom.removeChild(this.scroller);
      }
    } catch {
      // ignore
    }

    this.scroller = null;
    this.contentContainer = null;
    this.lineElements = [];
    this.lines = [];
    this.parsedRoots = [];
    this.lineXOffsetPx = 0;
    this.activeConnectorSvg = null;
    this.activeConnectorPath = null;
    try {
      this.view?.dom?.style?.removeProperty?.("--blp-outliner-line-x-offset");
    } catch {
      // ignore
    }
    this.editor = null;
  }

  private waitForEditor = () => {
    if (this.isDestroyed || !this.isActive) {
      return;
    }

    const editor = getEditorFromState(this.view.state);
    if (!editor) {
      setTimeout(this.waitForEditor, 0);
      return;
    }
    this.editor = editor;
    this.scheduleRecalculate();
  };

  private prepareDom() {
    this.contentContainer = document.createElement("div");
    this.contentContainer.classList.add(
      "outliner-plugin-list-lines-content-container",
    );

    this.scroller = document.createElement("div");
    this.scroller.classList.add("outliner-plugin-list-lines-scroller");

    // Active block connector (Logseq-like): a rounded elbow that highlights the
    // current list item against the vertical lines overlay.
    this.activeConnectorSvg = document.createElementNS(
      "http://www.w3.org/2000/svg",
      "svg",
    );
    this.activeConnectorSvg.classList.add("blp-outliner-active-connector");
    this.activeConnectorSvg.setAttribute("width", "100%");
    this.activeConnectorSvg.setAttribute("height", "100%");

    this.activeConnectorPath = document.createElementNS(
      "http://www.w3.org/2000/svg",
      "path",
    );
    this.activeConnectorPath.classList.add("blp-outliner-active-connector-path");
    this.activeConnectorSvg.appendChild(this.activeConnectorPath);

    this.scroller.appendChild(this.contentContainer);
    this.view.dom.appendChild(this.scroller);
    this.contentContainer.appendChild(this.activeConnectorSvg);
  }

  private onScroll = (e: Event) => {
    if (!this.isActive || !this.scroller) return;
    const { scrollLeft, scrollTop } = e.target as HTMLElement;
    this.scroller.scrollTo(scrollLeft, scrollTop);
  };

  private scheduleRecalculate = () => {
    if (this.isDestroyed || !this.isActive) return;
    clearTimeout(this.scheduled);
    this.scheduled = setTimeout(this.calculate, 0);
  };

  update(update: ViewUpdate) {
    this.refreshScope();
    if (!this.isActive) return;

    if (
      update.docChanged ||
      update.viewportChanged ||
      update.geometryChanged ||
      update.transactions.some((tr) => tr.reconfigured)
    ) {
      this.scheduleRecalculate();
      return;
    }

    // Cursor/selection moves don't change the document, but we still need to:
    // - keep vertical lines aligned to the active bullet
    // - update the active block connector highlight
    if (update.selectionSet) {
      this.syncLineXOffset();
      this.updateActiveConnector();
    }
  }

  private calculate = () => {
    if (this.isDestroyed || !this.isActive || !this.editor) return;
    this.lines = [];
    this.parsedRoots = [];

    if (
      this.settings.verticalLines &&
      this.view.viewportLineBlocks.length > 0 &&
      this.view.visibleRanges.length > 0
    ) {
      const fromLine = this.editor.offsetToPos(this.view.viewport.from).line;
      const toLine = this.editor.offsetToPos(this.view.viewport.to).line;
      const lists = this.parser.parseRange(this.editor, fromLine, toLine);
      // Keep parsed roots so we can map cursor -> list -> parent line for active connector.
      this.parsedRoots = lists;

      for (const list of lists) {
        this.lastLine = list.getContentEnd().line;

        for (const c of list.getChildren()) {
          this.recursive(c);
        }
      }

      this.lines.sort((a, b) =>
        a.top === b.top ? a.left - b.left : a.top - b.top,
      );
    }

    this.updateDom();
  };

  private getActiveList(): List | null {
    try {
      const cursor = this.editor?.getCursor?.();
      const cursorLine = cursor?.line;
      if (typeof cursorLine !== "number") return null;

      for (const root of this.parsedRoots ?? []) {
        try {
          const startLine = root.getContentStart().line;
          const endLine = root.getContentEnd().line;
          if (cursorLine < startLine || cursorLine > endLine) continue;
          return root.getListUnderLine(cursorLine);
        } catch {
          // ignore
        }
      }
    } catch {
      // ignore
    }

    return null;
  }

  /**
   * Prefer CM coordinates over DOM measurements.
   *
   * The visible bullet dot in Live Preview is often rendered via CSS pseudo-elements,
   * so `getBoundingClientRect()` on `.list-bullet` is not a reliable "dot center".
   * Using text coordinates keeps alignment stable across themes and list styles.
   */
  private getListBulletCenterClient(list: List): { x: number; y: number } | null {
    try {
      if (!this.editor) return null;

      const line = list.getFirstLineContentStart().line;
      const indentLen = list.getFirstLineIndent().length;
      const bullet = (list.getBullet?.() as string) ?? "";
      const bulletLen = Math.max(1, bullet.length || 1);

      const fromOffset = this.editor.posToOffset({ line, ch: indentLen });
      const toOffset = this.editor.posToOffset({ line, ch: indentLen + bulletLen });

      const a = this.view.coordsAtPos(fromOffset, 1);
      const b = this.view.coordsAtPos(toOffset, 1);
      if (!a || !b) return null;

      return {
        x: (a.left + b.left) / 2,
        y: (a.top + a.bottom) / 2,
      };
    } catch {
      return null;
    }
  }

  private getNextSibling(list: List): List | null {
    let listTmp = list;
    let p = listTmp.getParent();
    while (p) {
      const nextSibling = p.getNextSiblingOf(listTmp);
      if (nextSibling) {
        return nextSibling;
      }
      listTmp = p;
      p = listTmp.getParent();
    }
    return null;
  }

  private recursive(list: List, parentCtx: { rootLeft?: number } = {}) {
    const children = list.getChildren();

    if (children.length === 0) {
      return;
    }

    const fromOffset = this.editor.posToOffset({
      line: list.getFirstLineContentStart().line,
      ch: list.getFirstLineIndent().length,
    });
    const nextSibling = this.getNextSibling(list);
    const tillOffset = this.editor.posToOffset({
      line: nextSibling
        ? nextSibling.getFirstLineContentStart().line - 1
        : this.lastLine,
      ch: 0,
    });

    let visibleFrom = this.view.visibleRanges[0].from;
    let visibleTo =
      this.view.visibleRanges[this.view.visibleRanges.length - 1].to;
    const zoomRange = this.editor.getZoomRange();
    if (zoomRange) {
      visibleFrom = Math.max(
        visibleFrom,
        this.editor.posToOffset(zoomRange.from),
      );
      visibleTo = Math.min(visibleTo, this.editor.posToOffset(zoomRange.to));
    }

    if (fromOffset > visibleTo || tillOffset < visibleFrom) {
      return;
    }

    const coords = this.view.coordsAtPos(fromOffset, 1);
    if (parentCtx.rootLeft === undefined) {
      parentCtx.rootLeft = coords.left;
    }
    // Keep sub-pixel precision. Obsidian's tab stops and some fonts produce
    // fractional coordinates; rounding here makes nested lines drift left.
    const left = coords.right - parentCtx.rootLeft;

    const top =
      visibleFrom > 0 && fromOffset < visibleFrom
        ? -20
        : this.view.lineBlockAt(fromOffset).top;
    const bottom =
      tillOffset > visibleTo
        ? this.view.lineBlockAt(visibleTo - 1).bottom
        : this.view.lineBlockAt(tillOffset).bottom;
    const height = bottom - top;

    if (height > 0 && !list.isFolded()) {
      const nextSibling = list.getParent().getNextSiblingOf(list);
      const hasNextSibling =
        !!nextSibling &&
        this.editor.posToOffset(nextSibling.getFirstLineContentStart()) <=
          visibleTo;

      this.lines.push({
        top,
        left,
        height: `calc(${height}px ${hasNextSibling ? "- 1.5em" : "- 2em"})`,
        list,
      });
    }

    for (const child of children) {
      if (!child.isEmpty()) {
        this.recursive(child, parentCtx);
      }
    }
  }

  private onClick = (e: MouseEvent) => {
    e.preventDefault();

    const line = this.lines[Number((e.target as HTMLElement).dataset.index)];

    switch (this.settings.verticalLinesAction) {
      case "zoom-in":
        this.zoomIn(line);
        break;

      case "toggle-folding":
        this.toggleFolding(line);
        break;
    }
  };

  private zoomIn(line: LineData) {
    const editor = getEditorFromState(this.view.state);

    editor.zoomIn(line.list.getFirstLineContentStart().line);
  }

  private toggleFolding(line: LineData) {
    const { list } = line;

    if (list.isEmpty()) {
      return;
    }

    let needToUnfold = true;
    const linesToToggle: number[] = [];
    for (const c of list.getChildren()) {
      if (c.isEmpty()) {
        continue;
      }
      if (!c.isFolded()) {
        needToUnfold = false;
      }
      linesToToggle.push(c.getFirstLineContentStart().line);
    }

    const editor = getEditorFromState(this.view.state);

    for (const l of linesToToggle) {
      if (needToUnfold) {
        editor.unfold(l);
      } else {
        editor.fold(l);
      }
    }
  }

  private updateDom() {
    const cmScroll = this.view.scrollDOM;
    const cmContent = this.view.contentDOM;
    const cmContentContainer = cmContent.parentElement;
    const cmSizer = cmContentContainer.parentElement;

    /**
     * Obsidian can add additional elements into Content Manager.
     * The most obvious case is the 'embedded-backlinks' core plugin that adds a menu inside a Content Manager.
     * We must take heights of all of these elements into account
     * to be able to calculate the correct size of lines' container.
     */
    let cmSizerChildrenSumHeight = 0;
    for (let i = 0; i < cmSizer.children.length; i++) {
      cmSizerChildrenSumHeight += cmSizer.children[i].clientHeight;
    }

    this.scroller.style.top = cmScroll.offsetTop + "px";
    // Keep overlay aligned even when scroll position changes without a scroll event.
    try {
      this.scroller.scrollTo(cmScroll.scrollLeft, cmScroll.scrollTop);
    } catch {
      // ignore
    }
    this.contentContainer.style.height = cmSizerChildrenSumHeight + "px";
    // Align lines to the actual content start. In Obsidian's CM6 layout:
    // - `cmContent` can be shifted by horizontal scrolling, so rect-based values
    //   need to compensate for `scrollLeft`.
    // - list content starts after `cmContent`'s left padding (file margins).
    // Using the wrong coordinate space places lines into the gutter area.
    const editorRect = this.view.dom.getBoundingClientRect();
    const contentRect = cmContent.getBoundingClientRect();
    const contentPaddingLeft = parseFloat(
      window.getComputedStyle(cmContent).paddingLeft || "0",
    );
    const contentLeft =
      contentRect.left - editorRect.left + cmScroll.scrollLeft + contentPaddingLeft;
    // Keep fractional px to avoid accumulating alignment errors.
    this.contentContainer.style.marginLeft = contentLeft + "px";
    this.contentContainer.style.marginTop =
      (cmContent.firstElementChild as HTMLElement).offsetTop - 24 + "px";

    for (let i = 0; i < this.lines.length; i++) {
      if (this.lineElements.length === i) {
        const e = document.createElement("div");
        e.classList.add("outliner-plugin-list-line");
        e.dataset.index = String(i);
        e.addEventListener("mousedown", this.onClick);
        this.contentContainer.appendChild(e);
        this.lineElements.push(e);
      }

      const l = this.lines[i];
      const e = this.lineElements[i];
      e.style.top = l.top + "px";
      e.style.left = l.left + "px";
      e.style.height = l.height;
      e.style.display = "block";
    }

    for (let i = this.lines.length; i < this.lineElements.length; i++) {
      const e = this.lineElements[i];
      e.style.top = "0px";
      e.style.left = "0px";
      e.style.height = "0px";
      e.style.display = "none";
    }

    // Keep vertical lines horizontally aligned to the real bullet dot center.
    this.syncLineXOffset();
    this.updateActiveConnector();
  }

  private syncLineXOffset() {
    try {
      if (!this.contentContainer || !this.view?.dom || !this.editor) return;
      const containerRect = this.contentContainer.getBoundingClientRect();

      const activeList = this.getActiveList();
      if (!activeList) return;

      // Align using the nearest list item that has a corresponding rendered line.
      // (Leaf items don't have a vertical line at their own level.)
      let refList: List | null = activeList;
      let refIndex = -1;
      while (refList) {
        refIndex = this.lines.findIndex((l) => l.list === refList);
        if (refIndex >= 0) break;
        refList = refList.getParent?.() ?? null;
      }
      if (refIndex < 0 || !refList) return;

      const lineEl = this.lineElements[refIndex];
      if (!lineEl || lineEl.style.display === "none") return;

      const bulletCenter = this.getListBulletCenterClient(refList);
      if (!bulletCenter) return;
      const bulletX = bulletCenter.x - containerRect.left;

      const lineRect = lineEl.getBoundingClientRect();
      // The 1px stroke is drawn as a background at x=2px inside the element.
      const stripeX = lineRect.left - containerRect.left + 2;

      const dx = bulletX - stripeX;
      if (!Number.isFinite(dx) || Math.abs(dx) < 0.25) return;

      const next = Math.max(-200, Math.min(200, this.lineXOffsetPx + dx));
      if (Math.abs(next - this.lineXOffsetPx) < 0.25) return;
      this.lineXOffsetPx = next;
      this.view.dom.style.setProperty("--blp-outliner-line-x-offset", `${next}px`);
    } catch {
      // ignore
    }
  }

  private updateActiveConnector() {
    if (!this.activeConnectorSvg || !this.activeConnectorPath) return;

    const containerRect = this.contentContainer?.getBoundingClientRect?.();
    if (!containerRect) return;

    const activeList = this.getActiveList();
    const parent = activeList?.getParent?.();
    // The Root's synthetic root list has no parent; no connector at top-level.
    if (!activeList || !parent || !parent.getParent?.()) {
      this.activeConnectorSvg.style.display = "none";
      return;
    }

    const parentIndex = this.lines.findIndex((l) => l.list === parent);
    if (parentIndex < 0) {
      this.activeConnectorSvg.style.display = "none";
      return;
    }

    const parentLineEl = this.lineElements[parentIndex];
    if (!parentLineEl || parentLineEl.style.display === "none") {
      this.activeConnectorSvg.style.display = "none";
      return;
    }

    const bulletCenter = this.getListBulletCenterClient(activeList);
    if (!bulletCenter) {
      this.activeConnectorSvg.style.display = "none";
      return;
    }
    const bulletX = bulletCenter.x - containerRect.left;
    const bulletY = bulletCenter.y - containerRect.top;
    const parentRect = parentLineEl.getBoundingClientRect();
    const startX = parentRect.left - containerRect.left + 2;

    const radius = 8;
    const endX = bulletX;
    const y0 = bulletY - radius;
    const y1 = bulletY;

    // Draw a short vertical segment, then a rounded corner into the bullet.
    const d = `M ${startX} ${y0} V ${y1} Q ${startX} ${y1} ${startX + radius} ${y1} H ${endX}`;
    this.activeConnectorPath.setAttribute("d", d);
    this.activeConnectorSvg.style.display = "block";
  }

  destroy() {
    this.isDestroyed = true;
    this.disable();
  }
}

export class VerticalLines implements Feature {
  private updateBodyClassInterval: number;

  constructor(
    private plugin: Plugin,
    private settings: Settings,
    private obsidianSettings: ObsidianSettings,
    private parser: Parser,
  ) {}

  async load() {
    this.updateBodyClass();
    this.updateBodyClassInterval = window.setInterval(() => {
      this.updateBodyClass();
    }, 1000);

    this.plugin.registerEditorExtension(
      ViewPlugin.define(
        (view) =>
          new VerticalLinesPluginValue(
            this.settings,
            this.obsidianSettings,
            this.parser,
            view,
          ),
      ),
    );
  }

  async unload() {
    clearInterval(this.updateBodyClassInterval);
    document.body.classList.remove(VERTICAL_LINES_BODY_CLASS);
  }

  private updateBodyClass = () => {
    const shouldExists = this.settings.verticalLines;
    const exists = document.body.classList.contains(VERTICAL_LINES_BODY_CLASS);

    if (shouldExists && !exists) {
      document.body.classList.add(VERTICAL_LINES_BODY_CLASS);
    }

    if (!shouldExists && exists) {
      document.body.classList.remove(VERTICAL_LINES_BODY_CLASS);
    }
  };
}
