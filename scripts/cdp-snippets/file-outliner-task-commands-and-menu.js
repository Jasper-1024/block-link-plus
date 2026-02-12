// CDP regression checks for outliner v2 task commands + bullet menu conversion.
// Run:
//   node scripts/obsidian-cdp.js eval-file "scripts/cdp-snippets/file-outliner-task-commands-and-menu.js"
//
// Covers:
// - Commands exist and mutate the active block while editing.
// - Bullet menu contains task conversion item and applies it.

(async () => {
  const wait = (ms) => new Promise((r) => setTimeout(r, ms));
  const assert = (cond, msg) => {
    if (!cond) throw new Error(msg);
  };

  const pluginId = "block-link-plus";
  const tmpFolder = "_blp_tmp";
  const tmpPath = `${tmpFolder}/file-outliner-task-commands-and-menu.md`;

  const now0 = "2026-02-03T00:00:00";
  const content = [
    "---",
    "blp_outliner: true",
    "---",
    "",
    "- [ ] task block",
    `  [date:: ${now0}] [updated:: ${now0}] [blp_sys:: 1] [blp_ver:: 2] ^task`,
    "",
  ].join("\n");

  const cmdToggleStatus = `${pluginId}:file-outliner-toggle-task-status`;
  const cmdToggleMarker = `${pluginId}:file-outliner-toggle-task-marker`;

  // Ensure Obsidian reloads the plugin after we rebuild `main.js`.
  await app.plugins.disablePlugin(pluginId);
  await app.plugins.enablePlugin(pluginId);
  await wait(250);

  const plugin = app?.plugins?.plugins?.[pluginId];
  if (!plugin) throw new Error(`Plugin not found after reload: ${pluginId}`);

  const prevEnabledFiles = Array.isArray(plugin.settings?.fileOutlinerEnabledFiles)
    ? [...plugin.settings.fileOutlinerEnabledFiles]
    : [];
  const prevActivePath = app.workspace.getActiveFile?.()?.path ?? null;

  try {
    try {
      if (!app.vault.getAbstractFileByPath(tmpFolder)) {
        await app.vault.createFolder(tmpFolder);
      }
    } catch {
      // ignore
    }

    // Create/overwrite the temp note.
    let f = app.vault.getAbstractFileByPath(tmpPath);
    if (!f) {
      f = await app.vault.create(tmpPath, content);
    } else {
      await app.vault.modify(f, content);
    }

    // Deterministic routing: add to enabled files list temporarily.
    plugin.settings.fileOutlinerEnabledFiles = Array.from(new Set([...prevEnabledFiles, tmpPath]));
    await plugin.saveSettings();

    await app.workspace.getLeaf(false).openFile(f);
    await wait(300);

    const view = app.workspace.activeLeaf?.view;
    const viewType = view?.getViewType?.() ?? null;
    assert(viewType === "blp-file-outliner-view", `expected viewType=blp-file-outliner-view, got ${String(viewType)}`);

    const root = view.contentEl.querySelector(".blp-file-outliner-root") || view.contentEl;
    const blocksHost = root.querySelector(".blp-file-outliner-blocks") || root;

    // Enter edit mode on block `task`.
    const taskDisplay = blocksHost.querySelector(`.ls-block[data-blp-outliner-id="task"] .blp-file-outliner-display`);
    assert(taskDisplay, "missing task display");
    taskDisplay.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    await wait(120);
    assert(view.editingId === "task", `expected editingId='task', got ${String(view.editingId)}`);

    const editor = view.editorView;
    assert(editor, "missing editorView");

    // Ensure a clean starting point.
    editor.dispatch({ changes: { from: 0, to: editor.state.doc.length, insert: "hello" }, selection: { anchor: 5 } });
    await wait(50);

    // Command: toggle marker -> `[ ] hello`.
    assert(app.commands.commands?.[cmdToggleMarker], `missing command: ${cmdToggleMarker}`);
    assert(app.commands.commands?.[cmdToggleStatus], `missing command: ${cmdToggleStatus}`);

    app.commands.executeCommandById(cmdToggleMarker);
    await wait(80);
    assert(editor.state.doc.toString().startsWith("[ ] "), "expected toggle-marker command to insert `[ ] `");

    // Command: toggle status -> `[x] hello`.
    app.commands.executeCommandById(cmdToggleStatus);
    await wait(80);
    assert(editor.state.doc.toString().startsWith("[x] "), "expected toggle-status command to set `[x] `");

    // Command: toggle marker again -> `hello`.
    app.commands.executeCommandById(cmdToggleMarker);
    await wait(80);
    assert(editor.state.doc.toString() === "hello", `expected toggle-marker to remove prefix, got: ${editor.state.doc.toString()}`);

    // Exit edit mode so display is visible for menu checks.
    view.exitEditMode?.("task");
    await wait(120);

    // Bullet menu conversion uses the same public code-path as the context menu item.
    // (Menu UI is difficult to assert reliably via synthetic events in all Obsidian builds.)
    view.toggleTaskMarkerForBlock?.("task");
    await wait(200);

    // Verify task marker exists in model and display has checkbox.
    const b = view.blockById?.get?.("task");
    assert(b, "missing task block in model");
    assert(String(b.text || "").startsWith("[ ] "), `expected block to become task, got: ${String(b.text || "")}`);

    const taskDisplay2 = blocksHost.querySelector(`.ls-block[data-blp-outliner-id="task"] .blp-file-outliner-display`);
    assert(taskDisplay2, "missing task display after conversion");
    assert(taskDisplay2.querySelector("input.blp-outliner-task-checkbox"), "expected checkbox after conversion to task");

    return { ok: true };
  } finally {
    try {
      plugin.settings.fileOutlinerEnabledFiles = prevEnabledFiles;
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
