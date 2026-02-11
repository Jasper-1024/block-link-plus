// Debug helper: verify that a block containing an internal newline (`hello\nworld`)
// remains a *single* outliner block after leaving edit mode, and that the display
// renders the newline (via CSS `white-space: pre-wrap` on display <p>).
//
// Run:
//   node scripts/obsidian-cdp.js eval-file "scripts/cdp-snippets/debug-outliner-newline-render.js"

(async () => {
  const wait = (ms) => new Promise((r) => setTimeout(r, ms));
  const waitFor = async (cond, { timeoutMs = 4000, intervalMs = 50 } = {}) => {
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
  const tmpPath = `${tmpFolder}/debug-outliner-newline.md`;

  await app.plugins.disablePlugin(pluginId);
  await app.plugins.enablePlugin(pluginId);
  await wait(250);

  const plugin = app?.plugins?.plugins?.[pluginId];
  if (!plugin) throw new Error(`Plugin not found after reload: ${pluginId}`);

  const prevEnabledFiles = Array.isArray(plugin.settings?.fileOutlinerEnabledFiles)
    ? [...plugin.settings.fileOutlinerEnabledFiles]
    : [];
  const prevRouting = plugin.settings.fileOutlinerViewEnabled;

  try {
    try {
      if (!app.vault.getAbstractFileByPath(tmpFolder)) await app.vault.createFolder(tmpFolder);
    } catch {
      // ignore
    }

    const now = "2026-02-11T00:00:00";
    const content = [
      "---",
      "blp_outliner: true",
      "---",
      "",
      "- a",
      `  [date:: ${now}] [updated:: ${now}] [blp_sys:: 1] [blp_ver:: 2] ^aa`,
      "",
    ].join("\n");

    let f = app.vault.getAbstractFileByPath(tmpPath);
    if (!f) f = await app.vault.create(tmpPath, content);
    else await app.vault.modify(f, content);

    plugin.settings.fileOutlinerEnabledFiles = Array.from(new Set([...prevEnabledFiles, tmpPath]));
    plugin.settings.fileOutlinerViewEnabled = true;
    await plugin.saveSettings();

    const leaf = app.workspace.getLeaf(false);
    await leaf.openFile(f, { active: true });

    await waitFor(() => leaf.view?.getViewType?.() === "blp-file-outliner-view", {
      timeoutMs: 6000,
      intervalMs: 50,
    });
    const view = leaf.view;
    if (view?.getViewType?.() !== "blp-file-outliner-view") {
      throw new Error(`Expected outliner view; got ${String(view?.getViewType?.())}`);
    }

    const root = view.contentEl.querySelector(".blp-file-outliner-root") || view.contentEl;
    const blocksHost = root.querySelector(".blp-file-outliner-blocks") || root;
    const firstDisplay = blocksHost.querySelector(".ls-block .blp-file-outliner-display");
    if (!firstDisplay) throw new Error("Missing first display");

    firstDisplay.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    await wait(80);

    const cm = view.editorView;
    const cmContent = cm?.contentDOM || cm?.dom?.querySelector?.(".cm-content");
    if (!cm || !cmContent) throw new Error("Missing CM6 editor");

    cm.dispatch({
      changes: { from: 0, to: cm.state.doc.length, insert: "hello\nworld" },
      selection: { anchor: 11 },
    });
    await wait(40);
    cmContent.blur();

    // Wait for edit mode to end and display to re-render.
    await wait(120);
    await waitFor(() => view.editingId == null, { timeoutMs: 2000, intervalMs: 50 });
    await waitFor(
      () => (blocksHost.querySelector(".ls-block .blp-file-outliner-display")?.innerText ?? "").includes("world"),
      { timeoutMs: 4000, intervalMs: 50 }
    );

    const active = document.activeElement;
    const activeInfo = active
      ? {
          tag: active.tagName,
          id: active.id || null,
          className: String(active.className || ""),
          isInEditorHost: !!view.editorHostEl?.contains?.(active),
          isInContentEl: !!view.contentEl?.contains?.(active),
        }
      : null;

    const displays = Array.from(blocksHost.querySelectorAll(".ls-block .blp-file-outliner-display")).map((el) =>
      (el.innerText ?? "").trimEnd()
    );

    return {
      ok: true,
      editingId: view.editingId ?? null,
      blockCount: blocksHost.querySelectorAll(".ls-block").length,
      firstDisplayText: displays[0] ?? null,
      allDisplayTexts: displays,
      activeInfo,
    };
  } finally {
    try {
      plugin.settings.fileOutlinerEnabledFiles = prevEnabledFiles;
      plugin.settings.fileOutlinerViewEnabled = prevRouting;
      await plugin.saveSettings();
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
