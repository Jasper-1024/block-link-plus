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
import { List } from "../root";
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
  private lineXOffsetPx = 0;
  private resizeObserver: ResizeObserver | null = null;
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

    // Tab switching in Obsidian can hide/show editor DOM without producing a
    // reliable CM "geometryChanged" signal for our overlay. A ResizeObserver
    // lets us re-measure offsets when the editor becomes visible again.
    try {
      this.resizeObserver = new ResizeObserver(() => {
        this.scheduleRecalculate();
      });
      this.resizeObserver.observe(this.view.dom);
      this.resizeObserver.observe(this.view.scrollDOM);
    } catch {
      // ignore
    }
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

    try {
      this.resizeObserver?.disconnect();
    } catch {
      // ignore
    }
    this.resizeObserver = null;

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

    if (
      this.settings.verticalLines &&
      this.view.viewportLineBlocks.length > 0 &&
      this.view.visibleRanges.length > 0
    ) {
      const fromLine = this.editor.offsetToPos(this.view.viewport.from).line;
      const toLine = this.editor.offsetToPos(this.view.viewport.to).line;
      const lists = this.parser.parseRange(this.editor, fromLine, toLine);

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
    if (!this.scroller || !this.contentContainer) return;

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
    // When a leaf is hidden (inactive tab), rects can be 0 or stale; skip the
    // update and keep the last good layout until it becomes visible again.
    if (editorRect.width === 0 || contentRect.width === 0) return;
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
      if (!this.contentContainer || !this.view?.dom) return;

      const containerRect = this.contentContainer.getBoundingClientRect();

      // Use DOM geometry (bullet dot + vertical line overlay). We deliberately align
      // based on a top-level list bullet so the global offset stays stable even when
      // the active line is a leaf item (which has no vertical line at its own level).
      const activeLineEl = this.view.dom.querySelector(
        ".cm-line.cm-active.HyperMD-list-line:not(.HyperMD-list-line-nobullet)",
      ) as HTMLElement | null;
      if (!activeLineEl) return;

      const visibleLines = this.lineElements.filter(
        (el) => el && el.style.display !== "none",
      );
      if (visibleLines.length === 0) return;

      // Outer-most stripe (top-level) is the minimum x among rendered stripes.
      let minStripeX: number | null = null;
      for (const el of visibleLines) {
        const r = el.getBoundingClientRect();
        const stripeX = r.left - containerRect.left + 2;
        if (!Number.isFinite(stripeX)) continue;
        if (minStripeX === null || stripeX < minStripeX) minStripeX = stripeX;
      }
      if (minStripeX === null) return;

      // Find the nearest top-level list line for the active cursor position.
      // This keeps the offset constant across nested levels.
      const classMatch = activeLineEl.className.match(/HyperMD-list-line-(\d+)/);
      const activeLevel = classMatch ? parseInt(classMatch[1], 10) : 1;
      let refLineEl: HTMLElement = activeLineEl;

      if (Number.isFinite(activeLevel) && activeLevel > 1) {
        let cur: Element | null = activeLineEl.previousElementSibling;
        while (cur) {
          const el = cur as HTMLElement;
          if (el.classList?.contains?.("HyperMD-list-line")) {
            const m = el.className.match(/HyperMD-list-line-(\d+)/);
            const lvl = m ? parseInt(m[1], 10) : null;
            if (lvl === 1 && !el.classList.contains("HyperMD-list-line-nobullet")) {
              refLineEl = el;
              break;
            }
          }
          cur = cur.previousElementSibling;
        }
      }

      const bulletEl = refLineEl.querySelector(
        ".cm-formatting-list-ul .list-bullet, .cm-formatting-list-ol .list-bullet",
      ) as HTMLElement | null;
      if (!bulletEl) return;

      const bulletRect = bulletEl.getBoundingClientRect();
      const after = getComputedStyle(bulletEl, "::after");
      const afterW = parseFloat(after.width || "0");
      const afterLeft = parseFloat(after.left || "0");

      // Prefer the pseudo-element dot center when present; fall back to the text box center.
      const bulletCenterXClient =
        afterW > 0 && Number.isFinite(afterLeft)
          ? bulletRect.left + afterLeft + afterW / 2
          : bulletRect.left + bulletRect.width / 2;
      const bulletX = bulletCenterXClient - containerRect.left;

      const dx = bulletX - minStripeX;
      if (!Number.isFinite(dx) || Math.abs(dx) < 0.25) return;

      const currentStr = this.view.dom.style.getPropertyValue(
        "--blp-outliner-line-x-offset",
      );
      const current = Number.isFinite(parseFloat(currentStr))
        ? parseFloat(currentStr)
        : this.lineXOffsetPx;
      const next = Math.max(-200, Math.min(200, current + dx));
      if (Math.abs(next - current) < 0.25) return;

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

    const activeLineEl = this.view.dom.querySelector(
      ".cm-line.cm-active.HyperMD-list-line:not(.HyperMD-list-line-nobullet)",
    ) as HTMLElement | null;
    if (!activeLineEl) {
      this.activeConnectorSvg.style.display = "none";
      return;
    }

    const bulletEl = activeLineEl.querySelector(
      ".cm-formatting-list-ul .list-bullet, .cm-formatting-list-ol .list-bullet",
    ) as HTMLElement | null;
    if (!bulletEl) {
      this.activeConnectorSvg.style.display = "none";
      return;
    }

    const bulletRect = bulletEl.getBoundingClientRect();
    const after = getComputedStyle(bulletEl, "::after");
    const afterW = parseFloat(after.width || "0");
    const afterH = parseFloat(after.height || "0");
    const afterLeft = parseFloat(after.left || "0");
    const afterTop = parseFloat(after.top || "0");

    const bulletCenterXClient =
      afterW > 0 && Number.isFinite(afterLeft)
        ? bulletRect.left + afterLeft + afterW / 2
        : bulletRect.left + bulletRect.width / 2;
    const bulletCenterYClient =
      afterH > 0 && Number.isFinite(afterTop)
        ? bulletRect.top + afterTop + afterH / 2
        : bulletRect.top + bulletRect.height / 2;

    const bulletX = bulletCenterXClient - containerRect.left;
    const bulletY = bulletCenterYClient - containerRect.top;

    // Parent connector: use the nearest vertical line stripe to the left of the bullet.
    let parentStripeX: number | null = null;
    for (const el of this.lineElements) {
      if (!el || el.style.display === "none") continue;
      const r = el.getBoundingClientRect();
      const stripeX = r.left - containerRect.left + 2;
      if (stripeX < bulletX - 0.1 && (parentStripeX === null || stripeX > parentStripeX)) {
        parentStripeX = stripeX;
      }
    }

    // Top-level list items have no parent line to connect to.
    if (parentStripeX === null) {
      this.activeConnectorSvg.style.display = "none";
      return;
    }

    const startX = parentStripeX;

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
