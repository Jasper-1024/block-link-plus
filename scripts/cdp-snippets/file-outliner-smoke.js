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

  const prevSettingsEnabledFiles = Array.isArray(plugin.settings?.fileOutlinerEnabledFiles)
    ? [...plugin.settings.fileOutlinerEnabledFiles]
    : [];

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
    await plugin.saveSettings();

    // Open file (routing should switch to blp-file-outliner-view).
    await app.workspace.getLeaf(false).openFile(f);
    await wait(150);

    const leaf = app.workspace.activeLeaf;
    const view = leaf?.view;
    const viewType = view?.getViewType?.() ?? null;

    if (viewType !== "blp-file-outliner-view") {
      return {
        ok: false,
        step: "open",
        viewType,
        activeFile: app.workspace.getActiveFile?.()?.path ?? null,
      };
    }

    const root = view.contentEl.querySelector(".blp-file-outliner-root") || view.contentEl;

    // Activate first block.
    const firstDisplay = root.querySelector(".blp-file-outliner-display");
    if (!firstDisplay) throw new Error("No display element found");
    firstDisplay.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    await wait(50);

    const editor = root.querySelector("textarea.blp-file-outliner-editor");
    if (!editor) throw new Error("No outliner editor textarea found");
    editor.focus();

    // Type "hello" then split with Enter.
    editor.value = "hello";
    editor.dispatchEvent(new Event("input", { bubbles: true }));
    editor.setSelectionRange(5, 5);
    editor.dispatchEvent(new KeyboardEvent("keydown", { key: "Enter", bubbles: true }));
    await wait(80);

    const countAfterEnter = root.querySelectorAll(".ls-block").length;

    // Backspace-at-start should merge with previous (sibling case).
    editor.setSelectionRange(0, 0);
    editor.dispatchEvent(new KeyboardEvent("keydown", { key: "Backspace", bubbles: true }));
    await wait(80);

    const countAfterBackspace = root.querySelectorAll(".ls-block").length;

    // Create another sibling (Enter).
    editor.setSelectionRange(editor.value.length, editor.value.length);
    editor.dispatchEvent(new KeyboardEvent("keydown", { key: "Enter", bubbles: true }));
    await wait(80);

    // Indent with Tab, then outdent with Shift+Tab.
    editor.setSelectionRange(0, 0);
    editor.dispatchEvent(new KeyboardEvent("keydown", { key: "Tab", bubbles: true }));
    await wait(80);

    const rootDirectChildrenAfterIndent = Array.from(
      (root.querySelector(".blp-file-outliner-root") || root).children
    ).filter((el) => el.classList && el.classList.contains("ls-block")).length;

    editor.dispatchEvent(new KeyboardEvent("keydown", { key: "Tab", shiftKey: true, bubbles: true }));
    await wait(80);

    const rootDirectChildrenAfterOutdent = Array.from(
      (root.querySelector(".blp-file-outliner-root") || root).children
    ).filter((el) => el.classList && el.classList.contains("ls-block")).length;

    // Focus first block again and merge-with-next via Delete-at-end.
    const firstBullet = root.querySelector(".ls-block .bullet-container");
    if (firstBullet) {
      firstBullet.dispatchEvent(new MouseEvent("click", { bubbles: true }));
      await wait(50);
    }

    editor.setSelectionRange(editor.value.length, editor.value.length);
    editor.dispatchEvent(new KeyboardEvent("keydown", { key: "Delete", bubbles: true }));
    await wait(80);

    const countAfterDelete = root.querySelectorAll(".ls-block").length;

    // Ensure Shift+Enter semantics (newlines within a block) stay visible when not editing.
    editor.value = "hello\nworld";
    editor.dispatchEvent(new Event("input", { bubbles: true }));
    editor.blur();
    await wait(30);

    const firstRenderedText =
      (root.querySelector(".ls-block .blp-file-outliner-display")?.innerText ?? "").trimEnd();
    const newlineRendered = firstRenderedText.includes("\n") && firstRenderedText.includes("world");

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
            preview: dataPreview,
          }
        : null,
    };
  } finally {
    try {
      // Restore settings.
      plugin.settings.fileOutlinerEnabledFiles = prevSettingsEnabledFiles;
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
