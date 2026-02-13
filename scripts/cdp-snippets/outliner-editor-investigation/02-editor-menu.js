// Measure whether right-click triggers Obsidian's `editor-menu` event in outliner vs native MarkdownView.
// Run:
//   node scripts/obsidian-cdp.js eval-file ".tmp/outliner-editor-investigation/02-editor-menu.js"

(async () => {
  const wait = (ms) => new Promise((r) => setTimeout(r, ms));
  const assert = (cond, msg) => {
    if (!cond) throw new Error(msg);
  };

  const pluginId = "block-link-plus";
  const tmpFolder = "_blp_tmp";
  const outlinerPath = `${tmpFolder}/_outliner-editor-menu-outliner.md`;
  const nativePath = `${tmpFolder}/_outliner-editor-menu-native.md`;

  await app.plugins.disablePlugin(pluginId);
  await app.plugins.enablePlugin(pluginId);
  await wait(250);

  const plugin = app?.plugins?.plugins?.[pluginId];
  if (!plugin) throw new Error(`Plugin not found: ${pluginId}`);

  const prevEnabledFiles = Array.isArray(plugin.settings?.fileOutlinerEnabledFiles)
    ? [...plugin.settings.fileOutlinerEnabledFiles]
    : [];

  try {
    try {
      if (!app.vault.getAbstractFileByPath(tmpFolder)) await app.vault.createFolder(tmpFolder);
    } catch {}

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

    plugin.settings.fileOutlinerEnabledFiles = Array.from(new Set([...prevEnabledFiles, outlinerPath]));
    await plugin.saveSettings();

    const calls = [];
    const ref = app.workspace.on("editor-menu", (menu, editor, view) => {
      calls.push({
        menuCtor: menu?.constructor?.name ?? null,
        hasEditor: Boolean(editor),
        viewType: view?.getViewType?.() ?? null,
        viewCtor: view?.constructor?.name ?? null,
      });
    });

    const dispatchContextMenu = (el) => {
      const r = el.getBoundingClientRect();
      const x = Math.floor(r.left + Math.min(30, r.width / 2));
      const y = Math.floor(r.top + Math.min(10, r.height / 2));
      el.dispatchEvent(
        new MouseEvent("contextmenu", {
          bubbles: true,
          cancelable: true,
          clientX: x,
          clientY: y,
          button: 2,
        })
      );
    };

    // --- Outliner (enter edit mode first so the CM DOM exists).
    await app.workspace.getLeaf(false).openFile(fOutliner);
    await wait(350);

    const outlinerView = app.workspace.activeLeaf?.view;
    assert(outlinerView?.getViewType?.() === "blp-file-outliner-view", "expected outliner view");

    const blocksHost = outlinerView.contentEl.querySelector(".blp-file-outliner-blocks") || outlinerView.contentEl;
    const aDisplay = blocksHost.querySelector('.ls-block[data-blp-outliner-id] .blp-file-outliner-display');
    assert(aDisplay, "missing outliner display");
    aDisplay.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    await wait(150);

    const outlinerCm = outlinerView.editorView;
    assert(outlinerCm?.contentDOM, "missing outliner editorView.contentDOM");
    const outlinerCallsBefore = calls.length;
    dispatchContextMenu(outlinerCm.contentDOM);
    await wait(200);
    const outlinerCallsAfter = calls.length;

    // --- Native MarkdownView.
    await app.workspace.getLeaf(false).openFile(fNative);
    await wait(350);

    const nativeView = app.workspace.activeLeaf?.view;
    assert(nativeView?.getViewType?.() === "markdown", "expected markdown view");
    assert(nativeView?.editor?.cm?.contentDOM, "missing native editor.cm.contentDOM");

    const nativeCallsBefore = calls.length;
    dispatchContextMenu(nativeView.editor.cm.contentDOM);
    await wait(200);
    const nativeCallsAfter = calls.length;

    app.workspace.offref(ref);

    return {
      outliner: { before: outlinerCallsBefore, after: outlinerCallsAfter, delta: outlinerCallsAfter - outlinerCallsBefore },
      native: { before: nativeCallsBefore, after: nativeCallsAfter, delta: nativeCallsAfter - nativeCallsBefore },
      sampleCalls: calls.slice(-5),
    };
  } finally {
    try {
      plugin.settings.fileOutlinerEnabledFiles = prevEnabledFiles;
      await plugin.saveSettings();
    } catch {}
  }
})();

