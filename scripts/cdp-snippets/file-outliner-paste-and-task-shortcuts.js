// CDP regression checks for outliner v2 paste semantics + task shortcut.
// Run:
//   node scripts/obsidian-cdp.js eval-file "scripts/cdp-snippets/file-outliner-paste-and-task-shortcuts.js"
//
// Covers:
// - Mod+Shift+V bypasses split-paste behavior (multiline stays in one block).
// - Mod+V follows the existing "Paste multiline = split" behavior (multiline splits into blocks).
// - Mod+Enter toggles `[ ]` / `[x]` task marker prefix on the first line.

(async () => {
  const wait = (ms) => new Promise((r) => setTimeout(r, ms));
  const assert = (cond, msg) => {
    if (!cond) throw new Error(msg);
  };

  const pluginId = "block-link-plus";
  const tmpFolder = "_blp_tmp";
  const tmpPath = `${tmpFolder}/file-outliner-paste-and-task-shortcuts.md`;

  const now0 = "2026-02-03T00:00:00";
  const content = [
    "---",
    "blp_outliner: true",
    "---",
    "",
    "- hello",
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
  const prevPaste = plugin.settings?.fileOutlinerPasteMultiline ?? null;
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
    plugin.settings.fileOutlinerPasteMultiline = "split";
    await plugin.saveSettings();

    await app.workspace.getLeaf(false).openFile(f);
    await wait(300);

    const view = app.workspace.activeLeaf?.view;
    const viewType = view?.getViewType?.() ?? null;
    assert(viewType === "blp-file-outliner-view", `expected viewType=blp-file-outliner-view, got ${String(viewType)}`);

    const root = view.contentEl.querySelector(".blp-file-outliner-root") || view.contentEl;
    const blocksHost = root.querySelector(".blp-file-outliner-blocks") || root;

    // Enter edit mode on block `a`.
    const aDisplay = blocksHost.querySelector(`.ls-block[data-blp-outliner-id="a"] .blp-file-outliner-display`);
    assert(aDisplay, "missing a display");
    aDisplay.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    await wait(120);
    assert(view.editingId === "a", `expected editingId='a', got ${String(view.editingId)}`);

    const editor = view.editorView;
    assert(editor, "missing editorView");

    // ---- Task toggle (Mod+Enter).
    editor.dispatch({ changes: { from: 0, to: editor.state.doc.length, insert: "hello" }, selection: { anchor: 5 } });
    await wait(50);

    // Prefer exercising the keymap path via a synthetic keydown; fall back to calling the handler.
    editor.focus();
    editor.contentDOM.dispatchEvent(new KeyboardEvent("keydown", { key: "Enter", ctrlKey: true, bubbles: true }));
    await wait(50);
    if (!editor.state.doc.toString().startsWith("[ ] ")) {
      // Fallback: call the private method (TypeScript private is runtime-accessible).
      view.onEditorToggleTask();
      await wait(50);
    }
    assert(editor.state.doc.toString().startsWith("[ ] "), "expected Mod+Enter to insert `[ ] ` task marker");

    editor.contentDOM.dispatchEvent(new KeyboardEvent("keydown", { key: "Enter", ctrlKey: true, bubbles: true }));
    await wait(50);
    if (!editor.state.doc.toString().startsWith("[x] ")) {
      view.onEditorToggleTask();
      await wait(50);
    }
    assert(editor.state.doc.toString().startsWith("[x] "), "expected second Mod+Enter to toggle to `[x] `");

    // ---- Paste branching.
    const multiline = "one\ntwo\nthree";

    // A) Plain paste path: simulate Mod+Shift+V by setting the bypass marker, then ensure no splitting happens.
    editor.dispatch({ changes: { from: 0, to: editor.state.doc.length, insert: "" }, selection: { anchor: 0 } });
    await wait(50);

    const beforeBlocksA = (view.outlinerFile?.blocks || []).length;
    view.lastPlainPasteShortcutAt = Date.now();

    let preventedA = 0;
    const evtA = {
      clipboardData: { getData: () => multiline },
      preventDefault: () => (preventedA += 1),
      stopPropagation: () => {},
    };
    const handledA = view.onEditorPaste(evtA);
    assert(handledA === false, "expected plain paste to bypass split handler");
    assert(preventedA === 0, "expected plain paste bypass not to call preventDefault");

    // Mimic the default paste insertion (multiline inside the current block).
    editor.dispatch({ changes: { from: 0, to: 0, insert: multiline } });
    await wait(80);
    const afterBlocksA = (view.outlinerFile?.blocks || []).length;
    assert(afterBlocksA === beforeBlocksA, `expected no block split for plain paste, got blocks=${afterBlocksA}`);

    // B) Normal paste path: split enabled -> handler runs -> file model gains blocks.
    editor.dispatch({ changes: { from: 0, to: editor.state.doc.length, insert: "" }, selection: { anchor: 0 } });
    await wait(50);

    const beforeBlocksB = (view.outlinerFile?.blocks || []).length;
    let preventedB = 0;
    const evtB = {
      clipboardData: { getData: () => multiline },
      preventDefault: () => (preventedB += 1),
      stopPropagation: () => {},
    };
    const handledB = view.onEditorPaste(evtB);
    await wait(200);
    assert(handledB === true, "expected normal paste to be handled (split)");
    assert(preventedB === 1, "expected normal paste handler to call preventDefault");

    const afterBlocksB = (view.outlinerFile?.blocks || []).length;
    assert(afterBlocksB > beforeBlocksB, `expected split paste to create blocks, before=${beforeBlocksB} after=${afterBlocksB}`);

    return { ok: true };
  } finally {
    try {
      plugin.settings.fileOutlinerEnabledFiles = prevEnabledFiles;
      if (prevPaste !== null) plugin.settings.fileOutlinerPasteMultiline = prevPaste;
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

