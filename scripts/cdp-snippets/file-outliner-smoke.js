// CDP smoke test for the v2 file-level outliner view.
// Run: node scripts/obsidian-cdp.js eval-file "scripts/cdp-snippets/file-outliner-smoke.js"
//
// Notes:
// - Creates a temporary note under `_blp_tmp/` in the active vault.
// - Adds it to BLP's outliner enabled-files list for deterministic routing.
// - Exercises: click-to-edit, Enter split, Backspace merge, Tab indent, Shift+Tab outdent, Delete merge-with-next.
// - Restores settings + deletes the temp note (best-effort).

(async () => {
  const wait = (ms) => new Promise((r) => setTimeout(r, ms));
  const waitFor = async (cond, { timeoutMs = 2000, intervalMs = 50 } = {}) => {
    const start = Date.now();
    while (Date.now() - start < timeoutMs) {
      try {
        if (cond()) return true;
      } catch {
        // ignore
      }
      await wait(intervalMs);
    }
    return false;
  };

  const pluginId = "block-link-plus";
  const tmpFolder = "_blp_tmp";
  const tmpPath = `${tmpFolder}/file-outliner-smoke.md`;

  // Ensure Obsidian reloads the plugin after we rebuild `main.js`.
  // Without this, CDP tests may exercise stale in-memory code.
  await app.plugins.disablePlugin(pluginId);
  await app.plugins.enablePlugin(pluginId);
  await wait(250);

  const plugin = app?.plugins?.plugins?.[pluginId];
  if (!plugin) throw new Error(`Plugin not found after reload: ${pluginId}`);

  // Wait until the view type is registered; routing to an unregistered view can yield an empty leaf.
  await waitFor(() => typeof app.viewRegistry?.viewByType?.["blp-file-outliner-view"] === "function", {
    timeoutMs: 5000,
    intervalMs: 50,
  });

  const prevSettingsEnabledFiles = Array.isArray(plugin.settings?.fileOutlinerEnabledFiles)
    ? [...plugin.settings.fileOutlinerEnabledFiles]
    : [];
  const prevRouting = plugin.settings.fileOutlinerViewEnabled;

  const prevActivePath = app.workspace.getActiveFile?.()?.path ?? null;

  try {
    // Ensure folder.
    try {
      if (!app.vault.getAbstractFileByPath(tmpFolder)) {
        await app.vault.createFolder(tmpFolder);
      }
    } catch {
      // ignore
    }

    const now = "2026-02-03T00:00:00";
    const content = [
      "---",
      "blp_outliner: true",
      "---",
      "",
      "- a",
      `  [date:: ${now}] [updated:: ${now}] [blp_sys:: 1] [blp_ver:: 2] ^aa`,
      "",
    ].join("\n");

    // Create/overwrite the temp note.
    let f = app.vault.getAbstractFileByPath(tmpPath);
    if (!f) {
      f = await app.vault.create(tmpPath, content);
    } else {
      await app.vault.modify(f, content);
    }

    // Deterministic routing: add to enabled files list temporarily.
    plugin.settings.fileOutlinerEnabledFiles = Array.from(
      new Set([...prevSettingsEnabledFiles, tmpPath])
    );
    plugin.settings.fileOutlinerViewEnabled = true;
    await plugin.saveSettings();

    // Open file (routing should switch to blp-file-outliner-view).
    // Routing is implemented by patching `WorkspaceLeaf.openFile()`.
    const leaf = app.workspace.getLeaf(false);
    await leaf.openFile(f, { active: true });

    // Routing/view init can lag behind the `openFile()` await; wait deterministically.
    await waitFor(() => leaf.view?.getViewType?.() === "blp-file-outliner-view", {
      timeoutMs: 5000,
      intervalMs: 50,
    });

    const view = leaf?.view;
    const viewType = view?.getViewType?.() ?? null;

    if (viewType !== "blp-file-outliner-view") {
      return {
        ok: false,
        step: "open",
        viewType,
        activeFile: view?.file?.path ?? app.workspace.getActiveFile?.()?.path ?? null,
      };
    }

    const root = view.contentEl.querySelector(".blp-file-outliner-root") || view.contentEl;
    const blocksHost = root.querySelector(".blp-file-outliner-blocks") || root;

    // Activate first block.
    const firstDisplay = blocksHost.querySelector(".blp-file-outliner-display");
    if (!firstDisplay) throw new Error("No display element found");
    firstDisplay.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    await wait(50);

    const cm = view.editorView;
    if (!cm) throw new Error("No outliner CodeMirror editorView found");
    const cmContent = cm.contentDOM || cm.dom?.querySelector?.(".cm-content");
    if (!cmContent) throw new Error("No outliner CodeMirror contentDOM found");
    cm.focus();

    // Type "hello" then split with Enter.
    cm.dispatch({
      changes: { from: 0, to: cm.state.doc.length, insert: "hello" },
      selection: { anchor: 5 },
    });
    cmContent.dispatchEvent(new KeyboardEvent("keydown", { key: "Enter", code: "Enter", bubbles: true, cancelable: true }));
    await wait(80);

    const countAfterEnter = blocksHost.querySelectorAll(".ls-block").length;

    // Backspace-at-start should merge with previous (sibling case).
    cm.dispatch({ selection: { anchor: 0 } });
    cmContent.dispatchEvent(
      new KeyboardEvent("keydown", { key: "Backspace", code: "Backspace", bubbles: true, cancelable: true })
    );
    await wait(80);

    const countAfterBackspace = blocksHost.querySelectorAll(".ls-block").length;

    // Create another sibling (Enter).
    cm.dispatch({ selection: { anchor: cm.state.doc.length } });
    cmContent.dispatchEvent(new KeyboardEvent("keydown", { key: "Enter", code: "Enter", bubbles: true, cancelable: true }));
    await wait(80);

    // Indent with Tab, then outdent with Shift+Tab.
    cm.dispatch({ selection: { anchor: 0 } });
    cmContent.dispatchEvent(new KeyboardEvent("keydown", { key: "Tab", code: "Tab", bubbles: true, cancelable: true }));
    await wait(80);

    const rootDirectChildrenAfterIndent = Array.from(blocksHost.children).filter(
      (el) => el.classList && el.classList.contains("ls-block")
    ).length;

    cmContent.dispatchEvent(
      new KeyboardEvent("keydown", { key: "Tab", code: "Tab", shiftKey: true, bubbles: true, cancelable: true })
    );
    await wait(80);

    const rootDirectChildrenAfterOutdent = Array.from(blocksHost.children).filter(
      (el) => el.classList && el.classList.contains("ls-block")
    ).length;

    // Focus first block again and merge-with-next via Delete-at-end.
    const firstDisplay3 = blocksHost.querySelector(".ls-block .blp-file-outliner-display");
    if (firstDisplay3) {
      firstDisplay3.dispatchEvent(new MouseEvent("click", { bubbles: true }));
      await wait(50);
    }

    cm.dispatch({ selection: { anchor: cm.state.doc.length } });
    cmContent.dispatchEvent(new KeyboardEvent("keydown", { key: "Delete", code: "Delete", bubbles: true, cancelable: true }));
    await wait(80);

    const countAfterDelete = blocksHost.querySelectorAll(".ls-block").length;

    // Ensure Shift+Enter semantics (newlines within a block) stay visible when not editing.
    cm.dispatch({
      changes: { from: 0, to: cm.state.doc.length, insert: "hello\nworld" },
      selection: { anchor: 11 },
    });
    cmContent.blur();
    await waitFor(() => (blocksHost.querySelector(".ls-block .blp-file-outliner-display")?.innerText ?? "").includes("world"));

    const firstRenderedText =
      (blocksHost.querySelector(".ls-block .blp-file-outliner-display")?.innerText ?? "").trimEnd();
    const newlineRendered = firstRenderedText.includes("\n") && firstRenderedText.includes("world");

    if (!newlineRendered) {
      throw new Error(`newlineRendered=false: ${JSON.stringify(firstRenderedText)}`);
    }

    // Minimal markdown reset: avoid theme-dependent block margins/padding causing layout jank.
    const firstDisplay2 = blocksHost.querySelector(".ls-block .blp-file-outliner-display");
    if (firstDisplay2) {
      firstDisplay2.dispatchEvent(new MouseEvent("click", { bubbles: true }));
      await wait(50);
    }

    const md = ["> quote", "", "- item", "", "```js", "console.log(1)", "```"].join("\n");
    cm.dispatch({
      changes: { from: 0, to: cm.state.doc.length, insert: md },
      selection: { anchor: md.length },
    });
    cmContent.blur();
    await waitFor(() => !!blocksHost.querySelector(".ls-block .blp-file-outliner-display pre"));

    const host = blocksHost.querySelector(".ls-block .blp-file-outliner-display");
    const pre = host?.querySelector("pre");
    const ul = host?.querySelector("ul");
    const quote = host?.querySelector("blockquote");

    const markdownReset = {
      pre: pre
        ? {
            marginTop: getComputedStyle(pre).marginTop,
            marginBottom: getComputedStyle(pre).marginBottom,
          }
        : null,
      blockquote: quote
        ? {
            marginTop: getComputedStyle(quote).marginTop,
            marginBottom: getComputedStyle(quote).marginBottom,
            paddingLeft: getComputedStyle(quote).paddingLeft,
          }
        : null,
    };

    const toNum = (v) => Number.parseFloat(String(v ?? "0")) || 0;

    if (!markdownReset.pre) throw new Error("markdownReset: pre missing");
    if (markdownReset.pre.marginTop !== "0px" || markdownReset.pre.marginBottom !== "0px") {
      throw new Error(`markdownReset.pre margins: ${markdownReset.pre.marginTop}/${markdownReset.pre.marginBottom}`);
    }

    // Nested list markers inside a single block should be escaped (not rendered as real lists),
    // otherwise we risk accidental structural corruption of the underlying outliner file.
    if (ul) throw new Error("markdownReset: ul should not be rendered inside a block");
    const hostText = (host?.innerText ?? "").replace(/\s+/g, " ").trim();
    if (!hostText.includes("- item")) {
      throw new Error(`markdownReset: expected escaped list marker text, got: ${JSON.stringify(hostText.slice(0, 200))}`);
    }

    if (!markdownReset.blockquote) throw new Error("markdownReset: blockquote missing");
    if (markdownReset.blockquote.marginTop !== "0px" || markdownReset.blockquote.marginBottom !== "0px") {
      throw new Error(
        `markdownReset.blockquote margins: ${markdownReset.blockquote.marginTop}/${markdownReset.blockquote.marginBottom}`
      );
    }
    if (toNum(markdownReset.blockquote.paddingLeft) <= 0) {
      throw new Error(`markdownReset.blockquote paddingLeft: ${markdownReset.blockquote.paddingLeft}`);
    }

    const hasCopyButton = !!host?.querySelector("button.copy-code-button");
    if (hasCopyButton) throw new Error("copy-code-button should not be present in outliner display");

    // Callout margins should be normalized (no extra vertical spacing drift).
    const calloutMd = ["> [!note]", "> callout"].join("\n");
    const firstDisplay4 = blocksHost.querySelector(".ls-block .blp-file-outliner-display");
    if (firstDisplay4) {
      firstDisplay4.dispatchEvent(new MouseEvent("click", { bubbles: true }));
      await wait(50);
    }
    cm.dispatch({
      changes: { from: 0, to: cm.state.doc.length, insert: calloutMd },
      selection: { anchor: calloutMd.length },
    });
    cmContent.blur();
    await waitFor(() => !!blocksHost.querySelector(".ls-block .blp-file-outliner-display .callout"));
    const callout = blocksHost.querySelector(".ls-block .blp-file-outliner-display .callout");
    if (!callout) throw new Error("callout missing");
    const calloutMargins = {
      top: getComputedStyle(callout).marginTop,
      bottom: getComputedStyle(callout).marginBottom,
    };
    if (calloutMargins.top !== "0px" || calloutMargins.bottom !== "0px") {
      throw new Error(`callout margins: ${calloutMargins.top}/${calloutMargins.bottom}`);
    }

    // Fold toggle: create a parent->child pair, then collapse/expand.
    const firstDisplay5 = blocksHost.querySelector(".ls-block .blp-file-outliner-display");
    if (firstDisplay5) {
      firstDisplay5.dispatchEvent(new MouseEvent("click", { bubbles: true }));
      await wait(50);
    }
    cm.dispatch({ selection: { anchor: cm.state.doc.length } });
    cmContent.dispatchEvent(new KeyboardEvent("keydown", { key: "Enter", code: "Enter", bubbles: true, cancelable: true }));
    await wait(80);

    // New block is active; indent it under the previous to create children.
    cm.dispatch({ selection: { anchor: 0 } });
    cmContent.dispatchEvent(new KeyboardEvent("keydown", { key: "Tab", code: "Tab", bubbles: true, cancelable: true }));
    await wait(80);

    const parentDisplay = blocksHost.querySelector('.ls-block[haschild="true"] .blp-file-outliner-display');
    if (parentDisplay) {
      parentDisplay.dispatchEvent(new MouseEvent("click", { bubbles: true }));
      await wait(50);
    }
    const foldToggle = blocksHost.querySelector('.ls-block[haschild="true"] .blp-outliner-fold-toggle');
    if (!foldToggle) throw new Error("foldToggle missing on parent block");
    foldToggle.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    await wait(50);
    const collapsedContainer = blocksHost.querySelector('.ls-block[haschild="true"] > .block-children-container');
    if (collapsedContainer && getComputedStyle(collapsedContainer).display !== "none") {
      throw new Error("foldToggle: expected children container to be display:none");
    }
    foldToggle.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    await wait(50);

    // Insert affordance: clicking the insert hint adds a new sibling block.
    const rootChildCountBeforeInsert = Array.from(blocksHost.children).filter(
      (el) => el.classList && el.classList.contains("ls-block")
    ).length;
    const insertHint = blocksHost.querySelector('.ls-block[haschild="true"] > .blp-outliner-insert-hint');
    if (!insertHint) throw new Error("insertHint missing");
    insertHint.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    await wait(120);
    const rootChildCountAfterInsert = Array.from(blocksHost.children).filter(
      (el) => el.classList && el.classList.contains("ls-block")
    ).length;
    if (rootChildCountAfterInsert !== rootChildCountBeforeInsert + 1) {
      throw new Error(`insertHint: expected +1 root child (before=${rootChildCountBeforeInsert} after=${rootChildCountAfterInsert})`);
    }

    // Zoom: bullet click should show the zoom header + render only the subtree.
    const zoomHeader = root.querySelector(".blp-file-outliner-zoom-header");
    const headerVisibleBeforeZoom = zoomHeader ? getComputedStyle(zoomHeader).display !== "none" : false;
    if (headerVisibleBeforeZoom) throw new Error("zoomHeader should be hidden before zoom");

    const zoomBullet = blocksHost.querySelector('.ls-block[haschild="true"] .bullet-container');
    if (!zoomBullet) throw new Error("zoomBullet missing");
    zoomBullet.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    await wait(150);

    const headerVisibleAfterZoom = zoomHeader ? getComputedStyle(zoomHeader).display !== "none" : false;
    if (!headerVisibleAfterZoom) throw new Error("zoomHeader should be visible after zoom");

    const rootChildCountAfterZoom = Array.from(blocksHost.children).filter(
      (el) => el.classList && el.classList.contains("ls-block")
    ).length;
    if (rootChildCountAfterZoom !== 1) {
      throw new Error(`zoom: expected 1 root child after zoom, got ${rootChildCountAfterZoom}`);
    }

    const zoomBack = root.querySelector(".blp-outliner-zoom-back");
    if (!zoomBack) throw new Error("zoomBack missing");
    zoomBack.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    await wait(150);

    const headerVisibleAfterBack = zoomHeader ? getComputedStyle(zoomHeader).display !== "none" : false;
    if (headerVisibleAfterBack) throw new Error("zoomHeader should be hidden after back");

    const rootChildCountAfterBack = Array.from(blocksHost.children).filter(
      (el) => el.classList && el.classList.contains("ls-block")
    ).length;
    if (rootChildCountAfterBack !== rootChildCountAfterInsert) {
      throw new Error(`zoom-back: expected root child count ${rootChildCountAfterInsert}, got ${rootChildCountAfterBack}`);
    }

    const data = typeof view.getViewData === "function" ? view.getViewData() : null;
    const dataPreview = data ? data.split("\n").slice(0, 12) : null;

    return {
      ok: true,
      viewType,
      counts: {
        afterEnter: countAfterEnter,
        afterBackspace: countAfterBackspace,
        afterDelete: countAfterDelete,
      },
      rootDirectChildren: {
        afterIndent: rootDirectChildrenAfterIndent,
        afterOutdent: rootDirectChildrenAfterOutdent,
      },
      expected: {
        counts: { afterEnter: 2, afterBackspace: 1, afterDelete: 1 },
        rootDirectChildren: { afterIndent: 1, afterOutdent: 2 },
      },
      data: data
        ? {
            length: data.length,
            hasSysMarker: data.includes("blp_sys:: 1"),
            hasHello: data.includes("hello"),
            newlineRendered,
            markdownReset,
            preview: dataPreview,
          }
        : null,
    };
  } finally {
    try {
      // Restore settings.
      plugin.settings.fileOutlinerEnabledFiles = prevSettingsEnabledFiles;
      plugin.settings.fileOutlinerViewEnabled = prevRouting;
      await plugin.saveSettings();
    } catch {
      // ignore
    }

    try {
      // Switch back to the previously active file (if any), then delete the temp note.
      if (prevActivePath) {
        const prev = app.vault.getAbstractFileByPath(prevActivePath);
        if (prev) await app.workspace.getLeaf(false).openFile(prev);
      }
    } catch {
      // ignore
    }

    try {
      const f = app.vault.getAbstractFileByPath(tmpPath);
      if (f) await app.vault.delete(f);
    } catch {
      // ignore
    }
  }
})();
