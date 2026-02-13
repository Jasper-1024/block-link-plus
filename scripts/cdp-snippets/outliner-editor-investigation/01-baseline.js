// Baseline: compare outliner view editor plumbing vs native MarkdownView.
// Run:
//   node scripts/obsidian-cdp.js eval-file ".tmp/outliner-editor-investigation/01-baseline.js"

(async () => {
  const wait = (ms) => new Promise((r) => setTimeout(r, ms));

  const pluginId = "block-link-plus";
  const tmpFolder = "_blp_tmp";
  const outlinerPath = `${tmpFolder}/_outliner-editor-baseline-outliner.md`;
  const nativePath = `${tmpFolder}/_outliner-editor-baseline-native.md`;

  // Reload plugin to ensure we're measuring current runtime.
  await app.plugins.disablePlugin(pluginId);
  await app.plugins.enablePlugin(pluginId);
  await wait(250);

  const plugin = app?.plugins?.plugins?.[pluginId];
  if (!plugin) throw new Error(`Plugin not found: ${pluginId}`);

  const prevEnabledFiles = Array.isArray(plugin.settings?.fileOutlinerEnabledFiles)
    ? [...plugin.settings.fileOutlinerEnabledFiles]
    : [];
  const prevActivePath = app.workspace.getActiveFile?.()?.path ?? null;

  try {
    try {
      if (!app.vault.getAbstractFileByPath(tmpFolder)) await app.vault.createFolder(tmpFolder);
    } catch {
      // ignore
    }

    const outlinerContent = ["---", "blp_outliner: true", "---", "", "- hello", ""].join("\n");
    const nativeContent = ["---", "blp_outliner: false", "---", "", "hello", ""].join("\n");

    const write = async (path, content) => {
      let f = app.vault.getAbstractFileByPath(path);
      if (!f) f = await app.vault.create(path, content);
      else await app.vault.modify(f, content);
      return f;
    };

    const fOutliner = await write(outlinerPath, outlinerContent);
    const fNative = await write(nativePath, nativeContent);

    // Route only the outliner file.
    plugin.settings.fileOutlinerEnabledFiles = Array.from(new Set([...prevEnabledFiles, outlinerPath]));
    await plugin.saveSettings();

    const openAndProbe = async (file) => {
      await app.workspace.getLeaf(false).openFile(file);
      await wait(300);

      const leaf = app.workspace.activeLeaf;
      const view = leaf?.view;
      const viewType = view?.getViewType?.() ?? null;
      const ctorName = view?.constructor?.name ?? null;

      const hasEditor = Boolean(view?.editor);
      const hasEditorView = Boolean(view?.editorView);
      const hasCmFromEditor = Boolean(view?.editor?.cm);
      const hasEditorSuggest = Boolean(view?.editorSuggest);

      const viewKeys = (() => {
        try {
          return Object.keys(view || {}).slice(0, 60);
        } catch {
          return [];
        }
      })();

      return {
        file: file?.path ?? null,
        viewType,
        ctorName,
        hasEditor,
        hasEditorView,
        hasCmFromEditor,
        hasEditorSuggest,
        viewKeys,
      };
    };

    const outlinerProbe = await openAndProbe(fOutliner);
    const nativeProbe = await openAndProbe(fNative);

    return { outlinerProbe, nativeProbe };
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
  }
})();

