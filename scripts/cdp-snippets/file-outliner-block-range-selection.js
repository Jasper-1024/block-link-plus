//
// Run:
//   node scripts/obsidian-cdp.js eval-file "scripts/cdp-snippets/file-outliner-block-range-selection.js"
//
// Verifies: dragging a left-mouse selection from one block into another switches to
// outliner block-range selection (whole-block highlight), instead of clamped CM6 text selection.
//
// Notes:
// - Obsidian must be running with `--remote-debugging-port=9222`.
// - This snippet uses DOM-dispatched PointerEvents to exercise the outliner root capture handlers.
//

(async () => {
  const wait = (ms) => new Promise((r) => setTimeout(r, ms));
  const assert = (cond, msg) => {
    if (!cond) throw new Error(msg);
  };

  const pluginId = "block-link-plus";
  const tmpFolder = "_blp_tmp";
  const outlinerPath = `${tmpFolder}/outliner-block-range-selection.md`;

  const now = "2026-02-06T00:00:00";
  const sys = (id) =>
    `  [date:: ${now}] [updated:: ${now}] [blp_sys:: 1] [blp_ver:: 2] ^${id}`;

  const content = [
    "---",
    "blp_outliner: true",
    "---",
    "",
    "- a",
    sys("a"),
    "- b",
    sys("b"),
    "- c",
    sys("c"),
    "",
  ].join("\n");

  const waitFor = async (fn, { timeoutMs = 8000, stepMs = 50 } = {}) => {
    const t0 = Date.now();
    while (Date.now() - t0 < timeoutMs) {
      const v = fn();
      if (v) return v;
      await wait(stepMs);
    }
    return null;
  };

  const dispatchPointer = (type, { x, y, pointerId, button, buttons }) => {
    const el = document.elementFromPoint(x, y) || document.body;
    el.dispatchEvent(
      new PointerEvent(type, {
        bubbles: true,
        pointerId,
        button,
        buttons,
        clientX: x,
        clientY: y,
      })
    );
  };

  // Ensure Obsidian reloads the plugin after we rebuild `main.js`.
  await app.plugins.disablePlugin(pluginId);
  await app.plugins.enablePlugin(pluginId);
  await wait(250);

  const plugin = app?.plugins?.plugins?.[pluginId];
  assert(plugin, `plugin not found after reload: ${pluginId}`);

  const prevEnabledFiles = Array.isArray(plugin.settings?.fileOutlinerEnabledFiles)
    ? [...plugin.settings.fileOutlinerEnabledFiles]
    : [];
  const prevRouting = plugin.settings.fileOutlinerViewEnabled;
  const prevActivePath = app.workspace.getActiveFile?.()?.path ?? null;

  try {
    try {
      if (!app.vault.getAbstractFileByPath(tmpFolder)) await app.vault.createFolder(tmpFolder);
    } catch {
      // ignore
    }

    let file = app.vault.getAbstractFileByPath(outlinerPath);
    if (!file) file = await app.vault.create(outlinerPath, content);
    else await app.vault.modify(file, content);

    plugin.settings.fileOutlinerEnabledFiles = Array.from(new Set([...prevEnabledFiles, outlinerPath]));
    plugin.settings.fileOutlinerViewEnabled = true;
    await plugin.saveSettings();

    await app.workspace.getLeaf(false).openFile(file);
    const outlinerView = await waitFor(() => {
      const v = app.workspace.activeLeaf?.view;
      return v?.getViewType?.() === "blp-file-outliner-view" ? v : null;
    });
    assert(outlinerView, "expected file to open in blp-file-outliner-view");

    const blockEl = (id) => outlinerView.contentEl.querySelector(`[data-blp-outliner-id="${id}"]`);
    const displayEl = (id) => outlinerView.contentEl.querySelector(`[data-blp-outliner-id="${id}"] .blp-file-outliner-display`);

    const aDisplay = await waitFor(() => displayEl("a"));
    assert(aDisplay, "missing display for block a");
    aDisplay.dispatchEvent(new MouseEvent("click", { bubbles: true, button: 0 }));

    const cmContent = await waitFor(() => outlinerView.contentEl.querySelector(".blp-file-outliner-editor .cm-content"));
    assert(cmContent, "missing CM6 .cm-content after entering edit mode");

    const getIdFromEl = (el) => el?.dataset?.blpOutlinerId || null;
    const getSelectedIds = () =>
      Array.from(outlinerView.contentEl.querySelectorAll(".ls-block.is-blp-outliner-range-selected"))
        .map(getIdFromEl)
        .filter(Boolean);

    // Drag from inside block A editor into block C row.
    const startRect = cmContent.getBoundingClientRect();
    const cRow = blockEl("c")?.querySelector(":scope > .block-main-container")?.getBoundingClientRect();
    assert(cRow, "missing row rect for block c");

    const start = { x: startRect.left + 16, y: startRect.top + Math.min(12, startRect.height / 2) };
    const end = { x: cRow.left + 16, y: cRow.top + cRow.height * 0.75 };

    dispatchPointer("pointerdown", { x: start.x, y: start.y, pointerId: 1, button: 0, buttons: 1 });
    dispatchPointer("pointermove", { x: start.x + 2, y: start.y + 40, pointerId: 1, button: -1, buttons: 1 });
    dispatchPointer("pointermove", { x: end.x, y: end.y, pointerId: 1, button: -1, buttons: 1 });
    dispatchPointer("pointerup", { x: end.x, y: end.y, pointerId: 1, button: 0, buttons: 0 });

    await wait(200);

    assert(outlinerView.editingId == null, `expected edit mode to end after range selection (editingId=${outlinerView.editingId})`);

    const ids = getSelectedIds();
    assert(
      JSON.stringify(ids) === JSON.stringify(["a", "b", "c"]),
      `expected selected ids a,b,c (got ${JSON.stringify(ids)})`
    );

    return { ok: true };
  } finally {
    try {
      plugin.settings.fileOutlinerEnabledFiles = prevEnabledFiles;
      plugin.settings.fileOutlinerViewEnabled = prevRouting;
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
      const f = app.vault.getAbstractFileByPath(outlinerPath);
      if (f) await app.vault.delete(f);
    } catch {
      // ignore
    }
  }
})();

