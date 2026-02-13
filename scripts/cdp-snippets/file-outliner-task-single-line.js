// CDP regression checks for outliner v2 task single-line invariant + done styling.
// Run:
//   node scripts/obsidian-cdp.js eval-file "scripts/cdp-snippets/file-outliner-task-single-line.js"
//
// Covers:
// - Done tasks render with strikethrough in display mode.
// - Task blocks remain single-line: Shift+Enter does not insert `\n`.
// - Enter on a task continues with a new todo task block (`[ ] `) and focuses after the marker.

(async () => {
  const wait = (ms) => new Promise((r) => setTimeout(r, ms));
  const assert = (cond, msg) => {
    if (!cond) throw new Error(msg);
  };

  const pluginId = "block-link-plus";
  const tmpFolder = "_blp_tmp";
  const tmpPath = `${tmpFolder}/file-outliner-task-single-line.md`;

  const now0 = "2026-02-13T00:00:00";
  const now1 = "2026-02-13T00:00:01";

  const content = [
    "---",
    "blp_outliner: true",
    "---",
    "",
    "- [x] done task",
    `  [date:: ${now0}] [updated:: ${now0}] [blp_sys:: 1] [blp_ver:: 2] ^d`,
    "- [ ] todo task",
    `  [date:: ${now1}] [updated:: ${now1}] [blp_sys:: 1] [blp_ver:: 2] ^t`,
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
    await wait(350);

    const view = app.workspace.activeLeaf?.view;
    const viewType = view?.getViewType?.() ?? null;
    assert(viewType === "blp-file-outliner-view", `expected viewType=blp-file-outliner-view, got ${String(viewType)}`);

    const root = view.contentEl.querySelector(".blp-file-outliner-root") || view.contentEl;
    const blocksHost = root.querySelector(".blp-file-outliner-blocks") || root;

    // --- Done task strikethrough in display mode.
    const doneDisplay = blocksHost.querySelector(`.ls-block[data-blp-outliner-id="d"] .blp-file-outliner-display`);
    assert(doneDisplay, "missing done display");

    const doneContent = doneDisplay.querySelector(".blp-outliner-task-content");
    assert(doneContent, "missing done task content");

    const doneDeco = getComputedStyle(doneContent).textDecorationLine || "";
    assert(doneDeco.includes("line-through"), `expected done task to be strikethrough, got textDecorationLine=${doneDeco}`);

    const todoDisplay = blocksHost.querySelector(`.ls-block[data-blp-outliner-id="t"] .blp-file-outliner-display`);
    assert(todoDisplay, "missing todo display");
    const todoContent = todoDisplay.querySelector(".blp-outliner-task-content");
    assert(todoContent, "missing todo task content");
    const todoDeco = getComputedStyle(todoContent).textDecorationLine || "";
    assert(!todoDeco.includes("line-through"), `expected todo task NOT strikethrough, got textDecorationLine=${todoDeco}`);

    // --- Enter continues with a new todo task block.
    todoDisplay.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    await wait(150);
    assert(view.editingId === "t", `expected editingId='t', got ${String(view.editingId)}`);

    const editor = view.editorView;
    assert(editor, "missing editorView");
    assert(editor.state.doc.toString().startsWith("[ ] "), "expected task marker prefix present in editor");

    // Place cursor at end and press Enter.
    editor.dispatch({ selection: { anchor: editor.state.doc.length, head: editor.state.doc.length } });
    editor.contentDOM.dispatchEvent(new KeyboardEvent("keydown", { key: "Enter", bubbles: true }));
    await wait(350);

    const afterEnterId = view.editingId;
    assert(afterEnterId && afterEnterId !== "t", "expected a new block to become active after Enter");
    const afterEnterDoc = view.editorView?.state?.doc?.toString?.() ?? "";
    assert(afterEnterDoc.startsWith("[ ] "), `expected new block to be a todo task, got: ${afterEnterDoc}`);
    assert(!afterEnterDoc.includes("\n"), "expected task editor doc to remain single-line after Enter");
    assert(view.editorView?.state?.selection?.main?.anchor === 4, "expected cursor after `[ ] ` prefix");

    // --- Shift+Enter MUST NOT create an in-block newline for tasks.
    editor.contentDOM.dispatchEvent(new KeyboardEvent("keydown", { key: "Enter", shiftKey: true, bubbles: true }));
    await wait(350);
    const afterSoftDoc = view.editorView?.state?.doc?.toString?.() ?? "";
    assert(!afterSoftDoc.includes("\n"), "expected Shift+Enter not to insert newline in a task block");

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
      const f2 = app.vault.getAbstractFileByPath(tmpPath);
      if (f2) await app.vault.delete(f2);
    } catch {
      // ignore
    }
  }
})();

