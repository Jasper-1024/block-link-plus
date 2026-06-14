# DevTools Snippets (Obsidian Console)

Use these in Obsidian DevTools (or remote debugging) to measure alignment issues.

Tip: run `copy(JSON.stringify(obj, null, 2))` to copy results.

## Remote Debugging

- Start the isolated runtime with `npm run obsidian:debug-env`.
- Use the returned `port` for `OB_CDP_PORT` and target URLs such as `http://127.0.0.1:<port>/json`.
- Use Chromium DevTools via `chrome://inspect` (or Edge equivalent) to attach.
- Run the snippets in the Console tab of the attached target.

## dumpBlpListState()

```js
function findActiveEditor() {
  const activeLine = document.querySelector(
    ".markdown-source-view.mod-cm6 .cm-line.cm-active"
  );
  return (
    activeLine?.closest(".cm-editor") ||
    document.querySelector(".markdown-source-view.mod-cm6 .cm-editor")
  );
}

function dumpBlpListState() {
  const editor = findActiveEditor();
  if (!editor) return null;

  const activeLine = editor.querySelector(".cm-line.cm-active");
  return {
    editorClass: editor.className,
    hasEnhancedHandle: editor.classList.contains("blp-enhanced-list-handle"),
    hasVslinkoScope: editor.classList.contains("blp-vslinko-scope"),
    hasOutlinerLinesDom: Boolean(
      editor.querySelector(".outliner-plugin-list-lines-scroller")
    ),
    activeLineClass: activeLine?.className ?? null,
  };
}

dumpBlpListState();
```

## measureVerticalLineAlignment()

Measure the nearest outliner vertical line X vs bullet dot center X on the active list line.

```js
function findActiveEditor() {
  const activeLine = document.querySelector(
    ".markdown-source-view.mod-cm6 .cm-line.cm-active"
  );
  return (
    activeLine?.closest(".cm-editor") ||
    document.querySelector(".markdown-source-view.mod-cm6 .cm-editor")
  );
}

function measureVerticalLineAlignment() {
  const editor = findActiveEditor();
  if (!editor) return null;

  const activeLine = editor.querySelector(".cm-line.cm-active.HyperMD-list-line");
  if (!activeLine) return { error: "No active list line" };

  const bullet = activeLine.querySelector(
    ".cm-formatting-list-ul .list-bullet, .cm-formatting-list-ol .list-bullet"
  );
  if (!bullet) return { error: "No bullet element found" };

  const bulletRect = bullet.getBoundingClientRect();
  const bulletX = bulletRect.left + bulletRect.width / 2;
  const bulletY = bulletRect.top + bulletRect.height / 2;

  const lines = Array.from(editor.querySelectorAll(".outliner-plugin-list-line"));
  const candidates = lines
    .map((el) => {
      const r = el.getBoundingClientRect();
      return {
        el,
        // The 1px stroke is drawn as a background at x=2px within the element.
        x: r.left + 2,
        top: r.top,
        bottom: r.bottom,
      };
    })
    .filter((l) => bulletY >= l.top && bulletY <= l.bottom)
    .sort((a, b) => Math.abs(a.x - bulletX) - Math.abs(b.x - bulletX));

  const nearest = candidates[0] ?? null;
  return {
    bullet: { x: bulletX, y: bulletY, w: bulletRect.width, h: bulletRect.height },
    nearestLine: nearest ? { x: nearest.x, dx: nearest.x - bulletX } : null,
    candidateCount: candidates.length,
  };
}

measureVerticalLineAlignment();
```

## measureCodeBlockIndentNearActiveLine()

Best-effort: find the next visible code block line after the active list line and compare left edges.

```js
function findActiveEditor() {
  const activeLine = document.querySelector(
    ".markdown-source-view.mod-cm6 .cm-line.cm-active"
  );
  return (
    activeLine?.closest(".cm-editor") ||
    document.querySelector(".markdown-source-view.mod-cm6 .cm-editor")
  );
}

function measureCodeBlockIndentNearActiveLine() {
  const editor = findActiveEditor();
  if (!editor) return null;

  const activeLine = editor.querySelector(".cm-line.cm-active");
  if (!activeLine) return { error: "No active line" };

  // Search forward for a rendered codeblock line.
  let node = activeLine.nextElementSibling;
  let codeLine = null;
  for (let i = 0; i < 50 && node; i++, (node = node.nextElementSibling)) {
    if (!(node instanceof HTMLElement)) continue;
    if (node.matches(".HyperMD-codeblock, .HyperMD-codeblock-begin, .HyperMD-codeblock-end")) {
      codeLine = node;
      break;
    }
    // Some themes wrap code blocks; stop at a new list item.
    if (node.matches(".HyperMD-list-line")) break;
  }

  const listText = activeLine.querySelector(
    ".cm-list-1, .cm-list-2, .cm-list-3, .cm-list-4, .cm-list-5, .cm-list-6"
  );
  const listTextRect = listText?.getBoundingClientRect?.() ?? null;
  const codeRect = codeLine?.getBoundingClientRect?.() ?? null;

  return {
    listTextLeft: listTextRect ? listTextRect.left : null,
    codeLeft: codeRect ? codeRect.left : null,
    dx: listTextRect && codeRect ? codeRect.left - listTextRect.left : null,
    codeLineClass: codeLine?.className ?? null,
  };
}

measureCodeBlockIndentNearActiveLine();
```

## Element-under-mouse helpers

Use these with DevTools selection (Elements panel) where `$0` is the selected element.

```js
// Print rect + computed styles for the selected element.
(() => {
  if (!$0) return null;
  const r = $0.getBoundingClientRect();
  const cs = getComputedStyle($0);
  return {
    tag: $0.tagName,
    class: $0.className,
    rect: { left: r.left, top: r.top, width: r.width, height: r.height },
    marginLeft: cs.marginLeft,
    paddingLeft: cs.paddingLeft,
  };
})();
```

## Editor Integration Probes (Outliner vs MarkdownView)

These are useful when debugging "why doesn't X behave like the native editor?" in custom CM6 views.

### installEditorMenuHitCounter()

Obsidian fires `workspace.on("editor-menu")` for native Markdown editors. Custom editors usually won't.

```js
(() => {
  window.__blpMenuHits = 0;
  window.__blpMenuOff?.();
  const off = app.workspace.on("editor-menu", () => {
    window.__blpMenuHits++;
  });
  window.__blpMenuOff = () => app.workspace.offref(off);
  return { installed: true };
})();
```

Usage:
- Right-click inside native editor -> `window.__blpMenuHits` should increment.
- Right-click inside outliner bullet/custom editor -> usually stays unchanged.

### mountDetachedMarkdownViewInActiveOutliner()

Proof-of-concept: create a detached `WorkspaceLeaf` (so routing doesn't hijack it), open a real MarkdownView,
and mount its `containerEl` into the active outliner view. This validates that editor-menu/suggest/slash
pipelines return when you use a real MarkdownView.

```js
(async () => {
  const filePath = "_blp_tmp/_cdp_suggest_test.md";
  const file = app.vault.getAbstractFileByPath(filePath);
  if (!file) throw new Error("Missing file: " + filePath);

  const host = document.querySelector(".workspace-leaf.mod-active .blp-file-outliner-view");
  if (!host) throw new Error("Not in an active outliner view");

  // Clean previous mounts.
  host.querySelectorAll(".__cdp_detached_md_mount").forEach((el) => el.remove());
  const mount = host.createDiv({ cls: "__cdp_detached_md_mount" });

  // Create a leaf not managed by the workspace.
  const LeafCtor = app.workspace.activeLeaf.constructor;
  const leaf = new LeafCtor(app);
  // BLP uses this symbol to mark internal leaves as "detached" so routing skips them.
  leaf[Symbol.for("block-link-plus.detachedLeaf")] = true;

  await leaf.openFile(file, { state: { mode: "source" } });
  mount.replaceChildren(leaf.view.containerEl);

  return {
    mounted: true,
    viewType: leaf.view?.getViewType?.(),
    hasEditor: Boolean(leaf.view?.editor),
  };
})();
```

Cleanup:
```js
document.querySelectorAll(".__cdp_detached_md_mount").forEach((el) => el.remove());
```

### captureEditorMenuConstructor()

Capture the native `Menu` constructor from a real Markdown editor right-click, so you can create menus later without importing `Menu`.

```js
(() => {
  window.__blpLastEditorMenu = null;
  window.__blpLastEditorMenuArgs = null;
  window.__blpEditorMenuCtor = null;

  window.__blpEditorMenuCtorOff?.();
  const off = app.workspace.on("editor-menu", (menu, editor, view) => {
    window.__blpLastEditorMenu = menu;
    window.__blpLastEditorMenuArgs = { menu, editor, view };
    window.__blpEditorMenuCtor = menu?.constructor ?? null;
  });
  window.__blpEditorMenuCtorOff = () => app.workspace.offref(off);

  return { installed: true };
})();
```

Usage:
- Run this snippet, then right-click inside a native Markdown editor once.
- Inspect `window.__blpEditorMenuCtor` (e.g. `window.__blpEditorMenuCtor.length`).

### proveEditorSuggestWorksOnCustomEditorView()

Proof: `workspace.editorSuggest` can drive suggestions for a standalone CM6 `EditorView`, as long as the "editor wrapper" provides the API
that `EditorSuggest.updatePosition()` expects (`coordsAtPos({line,ch})`, `containerEl.win`, etc.).

```js
(async () => {
  const view = app.workspace.activeLeaf?.view;
  if (!view || view.getViewType?.() !== "markdown") throw new Error("Active leaf must be a markdown view");
  const cm = view.editor?.cm;
  const file = view.file;
  if (!cm || !file) throw new Error("Missing editor/file");

  // Mount a standalone CM6 view cloned from the markdown editor state.
  window.__blpCloneHost?.remove?.();
  const host = (window.__blpCloneHost = document.body.createDiv({ cls: "__blp_clone_host" }));
  Object.assign(host.style, {
    position: "fixed",
    top: "12px",
    right: "12px",
    width: "420px",
    height: "220px",
    border: "1px solid var(--background-modifier-border)",
    background: "var(--background-primary)",
    zIndex: 9999,
    overflow: "auto",
  });

  const CloneView = cm.constructor;
  const clone = (window.__blpCloneView = new CloneView({ state: cm.state, parent: host }));
  clone.dom.win = window;

  // Put `[[` and cursor at end.
  clone.dispatch({ changes: { from: 0, to: clone.state.doc.length, insert: "[[" }, selection: { anchor: 2 } });

  const toOffset = ({ line, ch }) => {
    const l = clone.state.doc.line(line + 1);
    return Math.min(l.to, l.from + ch);
  };
  const toPos = (offset) => {
    const l = clone.state.doc.lineAt(offset);
    return { line: l.number - 1, ch: offset - l.from };
  };

  // Minimal editor wrapper for EditorSuggest positioning.
  const editor = {
    cm: clone,
    containerEl: clone.dom,
    hasFocus: () => true, // Only needed for async suggestion sources.
    getCursor: () => toPos(clone.state.selection.main.head),
    getLine: (line) => clone.state.doc.line(line + 1).text,
    coordsAtPos: (pos) => clone.coordsAtPos(toOffset(pos)),
    posAtCoords: (coords) => toPos(clone.posAtCoords(coords) ?? 0),
  };

  // Trigger the first suggest that matches. Usually the link suggest will trigger on `[[`.
  const mgr = app.workspace.editorSuggest;
  for (const s of mgr.suggests) {
    if (s.trigger(editor, file, true)) {
      mgr.setCurrentSuggest(s);
      return { ok: true, suggest: s.constructor?.name };
    }
  }
  return { ok: false };
})();
```

### probeOutlinerEmbedDomShape()

Debug why inline/range embeds (e.g. `![[file#^id-id]]`) may not render/inline-edit inside custom views:
InlineEditEngine expects a native `.markdown-embed-content` container; some programmatic renders produce embeds without it.

```js
(() => {
  const root =
    document.querySelector(".workspace-leaf.mod-active .blp-file-outliner-view") ??
    document.querySelector(".workspace-leaf.mod-active");
  if (!root) return { ok: false, err: "no active root" };

  const embeds = Array.from(root.querySelectorAll(".internal-embed.markdown-embed"));
  const infos = embeds.slice(0, 20).map((e) => ({
    tag: e.tagName,
    src: e.getAttribute("src"),
    cls: e.className,
    hasEmbedContent: Boolean(e.querySelector(".markdown-embed-content")),
    hasPreviewView: Boolean(e.querySelector(".markdown-preview-view")),
    hasReadingRangeHost: Boolean(e.querySelector(".blp-reading-range-host")),
    hasInlineEditHost: Boolean(e.querySelector(".blp-inline-edit-host")),
    text: (e.textContent ?? "").replace(/\s+/g, " ").slice(0, 80),
  }));

  return {
    ok: true,
    embedCount: embeds.length,
    missingEmbedContentCount: infos.filter((x) => !x.hasEmbedContent).length,
    infos,
  };
})();
```

### patchOutlinerEmbedContentWrapper()

Best-effort runtime normalize for outliner-rendered embeds:
wrap `:scope > .markdown-preview-view` inside `:scope > .markdown-embed-content` when missing.

```js
(() => {
  const host =
    document.querySelector(".workspace-leaf.mod-active .blp-file-outliner-view") ??
    document.querySelector(".workspace-leaf.mod-active");
  if (!host) return { ok: false, err: "no active host" };

  let wrapped = 0;
  for (const e of Array.from(host.querySelectorAll(".internal-embed.markdown-embed"))) {
    if (e.querySelector(":scope > .markdown-embed-content")) continue;

    const pv = e.querySelector(":scope > .markdown-preview-view");
    if (!pv) continue;

    const wrap = document.createElement("div");
    wrap.className = "markdown-embed-content";
    pv.replaceWith(wrap);
    wrap.appendChild(pv);
    wrapped++;
  }

  // Optional: re-scan so reading-range children see the updated DOM.
  const eng = app?.plugins?.plugins?.["block-link-plus"]?.inlineEditEngine;
  try {
    eng?.scanReadingRangeEmbedsInNode?.(host);
  } catch {
    // ignore
  }

  return { ok: true, wrapped };
})();
```

### forceRenderOutlinerReadingRangeEmbeds()

If some embeds already exhausted retries (e.g. after 60 retries), force a rerender.

```js
(async () => {
  const host =
    document.querySelector(".workspace-leaf.mod-active .blp-file-outliner-view") ??
    document.querySelector(".workspace-leaf.mod-active");
  const eng = app?.plugins?.plugins?.["block-link-plus"]?.inlineEditEngine;
  if (!host || !eng?.readingRangeChildByEmbed?.get) return { ok: false };

  const embeds = Array.from(host.querySelectorAll(".internal-embed.markdown-embed"));
  let forced = 0;
  for (const e of embeds) {
    const child = eng.readingRangeChildByEmbed.get(e);
    if (!child?.render) continue;
    child.retryCount = 0;
    try {
      await child.render();
      forced++;
    } catch {
      // ignore
    }
  }
  return { ok: true, forced };
})();
```
