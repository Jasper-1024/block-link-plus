// CDP regression checks for file-level outliner feature toggles.
// Run:
//   node scripts/obsidian-cdp.js eval-file "scripts/cdp-snippets/file-outliner-feature-toggles.js"
//
// Covers:
// - DnD toggle affects cursor affordance (no "grab" when disabled).
// - Emphasis-line toggle updates view classes.
// - Active block highlight remains even when emphasis-line is disabled.

(async () => {
  const wait = (ms) => new Promise((r) => setTimeout(r, ms));
  const assert = (cond, msg) => {
    if (!cond) throw new Error(msg);
  };

  const pluginId = "block-link-plus";
  const tmpFolder = "_blp_tmp";
  const tmpPath = `${tmpFolder}/file-outliner-feature-toggles.md`;

  const now0 = "2026-02-10T00:00:00";
  const content = [
    "---",
    "blp_outliner: true",
    "---",
    "",
    "- a",
    `  [date:: ${now0}] [updated:: ${now0}] [blp_sys:: 1] [blp_ver:: 2] ^a`,
    "",
  ].join("\n");

  // Ensure Obsidian reloads the plugin after we rebuild `main.js`.
  await app.plugins.disablePlugin(pluginId);
  await app.plugins.enablePlugin(pluginId);
  await wait(250);

  const plugin = app?.plugins?.plugins?.[pluginId];
  if (!plugin) throw new Error(`Plugin not found after reload: ${pluginId}`);

  const prevEnabledFiles = Array.isArray(plugin.settings?.fileOutlinerEnabledFiles)
    ? [...plugin.settings.fileOutlinerEnabledFiles]
    : [];
  const prevDnd = plugin.settings?.fileOutlinerDragAndDropEnabled;
  const prevZoom = plugin.settings?.fileOutlinerZoomEnabled;
  const prevEmphasis = plugin.settings?.fileOutlinerEmphasisLineEnabled;
  const prevActivePath = app.workspace.getActiveFile?.()?.path ?? null;

  try {
    try {
      if (!app.vault.getAbstractFileByPath(tmpFolder)) {
        await app.vault.createFolder(tmpFolder);
      }
    } catch {
      // ignore
    }

    let f = app.vault.getAbstractFileByPath(tmpPath);
    if (!f) {
      f = await app.vault.create(tmpPath, content);
    } else {
      await app.vault.modify(f, content);
    }

    plugin.settings.fileOutlinerEnabledFiles = Array.from(new Set([...prevEnabledFiles, tmpPath]));
    await plugin.saveSettings();
    await wait(100);

    await app.workspace.getLeaf(false).openFile(f);
    await wait(250);

    const view = app.workspace.activeLeaf?.view;
    const viewType = view?.getViewType?.() ?? null;
    assert(viewType === "blp-file-outliner-view", `expected viewType=blp-file-outliner-view, got ${String(viewType)}`);

    const viewEl = view.contentEl;
    assert(viewEl?.classList?.contains?.("blp-file-outliner-view"), "missing .blp-file-outliner-view class");

    const bullet = viewEl.querySelector(`.ls-block[data-blp-outliner-id="a"] .bullet-container`);
    assert(bullet, "missing bullet-container for a");

    // --- DnD off -> cursor is not grab/grabbing.
    plugin.settings.fileOutlinerDragAndDropEnabled = false;
    await plugin.saveSettings();
    await wait(120);

    assert(!viewEl.classList.contains("blp-outliner-dnd-enabled"), "expected blp-outliner-dnd-enabled to be removed");
    const cursorOff = getComputedStyle(bullet).cursor;
    assert(cursorOff !== "grab" && cursorOff !== "grabbing", `expected cursor != grab when dnd disabled, got ${cursorOff}`);

    // --- DnD on -> cursor is grab.
    plugin.settings.fileOutlinerDragAndDropEnabled = true;
    await plugin.saveSettings();
    await wait(120);

    assert(viewEl.classList.contains("blp-outliner-dnd-enabled"), "expected blp-outliner-dnd-enabled to be present");
    const cursorOn = getComputedStyle(bullet).cursor;
    assert(cursorOn === "grab" || cursorOn === "grabbing", `expected cursor grab when dnd enabled, got ${cursorOn}`);

    // --- Emphasis line off -> class removed.
    plugin.settings.fileOutlinerEmphasisLineEnabled = false;
    await plugin.saveSettings();
    await wait(120);

    assert(
      !viewEl.classList.contains("blp-outliner-emphasis-line-enabled"),
      "expected blp-outliner-emphasis-line-enabled to be removed"
    );

    // --- Active block highlight remains even when emphasis line is disabled.
    const aDisplay = viewEl.querySelector(`.ls-block[data-blp-outliner-id="a"] .blp-file-outliner-display`);
    assert(aDisplay, "missing a display");
    aDisplay.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    await wait(120);
    assert(view.editingId === "a", `expected editingId=a after click, got ${String(view.editingId)}`);

    const editorHost = viewEl.querySelector(`.ls-block.is-blp-outliner-active .blp-file-outliner-editor`);
    assert(editorHost, "missing active editor host");
    const bg = getComputedStyle(editorHost).backgroundColor;
    assert(bg && bg !== "rgba(0, 0, 0, 0)" && bg !== "transparent", `expected active highlight bg to be non-transparent, got ${bg}`);

    return { ok: true };
  } finally {
    try {
      plugin.settings.fileOutlinerEnabledFiles = prevEnabledFiles;
      plugin.settings.fileOutlinerDragAndDropEnabled = prevDnd;
      plugin.settings.fileOutlinerZoomEnabled = prevZoom;
      plugin.settings.fileOutlinerEmphasisLineEnabled = prevEmphasis;
      await plugin.saveSettings();
    } catch {
      // ignore
    }

    try {
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

