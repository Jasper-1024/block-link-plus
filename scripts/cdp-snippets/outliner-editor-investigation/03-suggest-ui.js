// Probe whether Obsidian suggest UIs (link `[[` / slash `/`) appear for native editor vs outliner editor.
// Run:
//   node scripts/obsidian-cdp.js eval-file ".tmp/outliner-editor-investigation/03-suggest-ui.js"

(async () => {
  const wait = (ms) => new Promise((r) => setTimeout(r, ms));
  const assert = (cond, msg) => {
    if (!cond) throw new Error(msg);
  };

  const pluginId = "block-link-plus";
  const tmpFolder = "_blp_tmp";
  const outlinerPath = `${tmpFolder}/_outliner-suggest-outliner.md`;
  const nativePath = `${tmpFolder}/_outliner-suggest-native.md`;

  await app.plugins.disablePlugin(pluginId);
  await app.plugins.enablePlugin(pluginId);
  await wait(250);

  const plugin = app?.plugins?.plugins?.[pluginId];
  if (!plugin) throw new Error(`Plugin not found: ${pluginId}`);

  const prevEnabledFiles = Array.isArray(plugin.settings?.fileOutlinerEnabledFiles)
    ? [...plugin.settings.fileOutlinerEnabledFiles]
    : [];

  const uniq = (arr) => Array.from(new Set(arr));

  const scanSuggestDom = () => {
    const nodes = Array.from(document.querySelectorAll("*"));
    const suggestNodes = nodes.filter((n) => {
      const cls = n.className;
      if (!cls) return false;
      const s = String(cls);
      return /suggest/i.test(s);
    });

    const classSamples = uniq(
      suggestNodes
        .slice(0, 50)
        .flatMap((n) => String(n.className).split(/\s+/).filter(Boolean))
        .filter((c) => /suggest/i.test(c))
    ).slice(0, 30);

    const containers = Array.from(document.querySelectorAll(".suggestion-container, .suggest, .suggestion")).map((n) => ({
      cls: String(n.className || ""),
      text: String(n.textContent || "").slice(0, 120),
    }));

    return {
      suggestNodeCount: suggestNodes.length,
      classSamples,
      containers: containers.slice(0, 10),
    };
  };

  const typeAndScan = async (cm, text) => {
    // Clear the document and insert the text.
    cm.dispatch({ changes: { from: 0, to: cm.state.doc.length, insert: text }, selection: { anchor: text.length } });
    cm.focus();
    await wait(300);
    return scanSuggestDom();
  };

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

    // Native editor.
    await app.workspace.getLeaf(false).openFile(fNative);
    await wait(350);
    const nativeView = app.workspace.activeLeaf?.view;
    assert(nativeView?.getViewType?.() === "markdown", "expected markdown view");
    assert(nativeView?.editor?.cm, "missing native editor.cm");
    const nativeLink = await typeAndScan(nativeView.editor.cm, "[[");
    const nativeSlash = await typeAndScan(nativeView.editor.cm, "/");

    // Outliner editor (enter edit mode).
    await app.workspace.getLeaf(false).openFile(fOutliner);
    await wait(350);
    const outlinerView = app.workspace.activeLeaf?.view;
    assert(outlinerView?.getViewType?.() === "blp-file-outliner-view", "expected outliner view");

    const blocksHost = outlinerView.contentEl.querySelector(".blp-file-outliner-blocks") || outlinerView.contentEl;
    const aDisplay = blocksHost.querySelector('.ls-block[data-blp-outliner-id] .blp-file-outliner-display');
    assert(aDisplay, "missing outliner display");
    aDisplay.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    await wait(150);

    assert(outlinerView?.editorView, "missing outliner editorView");
    const outlinerLink = await typeAndScan(outlinerView.editorView, "[[");
    const outlinerSlash = await typeAndScan(outlinerView.editorView, "/");

    return { nativeLink, nativeSlash, outlinerLink, outlinerSlash };
  } finally {
    try {
      plugin.settings.fileOutlinerEnabledFiles = prevEnabledFiles;
      await plugin.saveSettings();
    } catch {}
  }
})();

