// CDP snippet: verify the Outliner View can open the current file in native Markdown source view.
// Run:
//   node scripts/obsidian-cdp.js eval-file "scripts/cdp-snippets/file-outliner-open-source-view.js"

(async () => {
  const wait = (ms) => new Promise((r) => setTimeout(r, ms));

  const pluginId = "block-link-plus";
  const tmpFolder = "_blp_tmp";
  const tmpPath = `${tmpFolder}/file-outliner-open-source.md`;

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

    let f = app.vault.getAbstractFileByPath(tmpPath);
    if (!f) {
      f = await app.vault.create(tmpPath, content);
    } else {
      await app.vault.modify(f, content);
    }

    plugin.settings.fileOutlinerEnabledFiles = Array.from(
      new Set([...prevSettingsEnabledFiles, tmpPath])
    );
    await plugin.saveSettings();

    await app.workspace.getLeaf(false).openFile(f);
    await wait(150);

    const leaf = app.workspace.activeLeaf;
    const view = leaf?.view;
    const viewType = view?.getViewType?.() ?? null;
    if (viewType !== "blp-file-outliner-view") {
      throw new Error(`expected outliner view, got: ${String(viewType)}`);
    }

    if (typeof view.openSourceMarkdownView !== "function") {
      throw new Error("openSourceMarkdownView missing on view");
    }

    await view.openSourceMarkdownView({ newLeaf: false });
    await wait(200);

    const activeLeaf = app.workspace.activeLeaf;
    const activeView = activeLeaf?.view;
    const activeType = activeView?.getViewType?.() ?? null;
    const mode = activeView?.getMode?.() ?? null;
    const activePath = activeView?.file?.path ?? app.workspace.getActiveFile?.()?.path ?? null;

    return {
      ok: true,
      view: { before: viewType, after: activeType, mode, activePath },
      expected: { after: "markdown", mode: "source", activePath: tmpPath },
    };
  } finally {
    try {
      plugin.settings.fileOutlinerEnabledFiles = prevSettingsEnabledFiles;
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
