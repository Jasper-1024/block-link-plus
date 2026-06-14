(async () => {
  const wait = (ms) => new Promise((r) => setTimeout(r, ms));

  const pluginId = "block-link-plus";
  const tmpFolder = "_blp_tmp";
  const tmpPath = `${tmpFolder}/file-outliner-zoom-stack.md`;

  const now0 = "2026-02-03T00:00:00";
  const now1 = "2026-02-03T00:00:01";
  const now2 = "2026-02-03T00:00:02";
  const now3 = "2026-02-03T00:00:03";

  const content = [
    "---",
    "blp_outliner: true",
    "---",
    "",
    "- a",
    "  - v",
    "    - vv",
    `      [date:: ${now3}] [updated:: ${now3}] [blp_sys:: 1] [blp_ver:: 2] ^vv`,
    "    ",
    `    [date:: ${now2}] [updated:: ${now2}] [blp_sys:: 1] [blp_ver:: 2] ^v`,
    "  ",
    `  [date:: ${now1}] [updated:: ${now1}] [blp_sys:: 1] [blp_ver:: 2] ^a`,
    "",
    "- root2",
    `  [date:: ${now0}] [updated:: ${now0}] [blp_sys:: 1] [blp_ver:: 2] ^r2`,
    "",
  ].join("\n");

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
      if (!app.vault.getAbstractFileByPath(tmpFolder)) await app.vault.createFolder(tmpFolder);
    } catch {
      // ignore
    }

    let f = app.vault.getAbstractFileByPath(tmpPath);
    if (!f) f = await app.vault.create(tmpPath, content);
    else await app.vault.modify(f, content);

    plugin.settings.fileOutlinerEnabledFiles = Array.from(new Set([...prevEnabledFiles, tmpPath]));
    await plugin.saveSettings();

    await app.workspace.getLeaf(false).openFile(f);
    await wait(250);

    const view = app.workspace.activeLeaf?.view;
    const viewType = view?.getViewType?.() ?? null;
    if (viewType !== 'blp-file-outliner-view') return { ok: false, viewType };

    const root = view.contentEl.querySelector('.blp-file-outliner-root') || view.contentEl;
    const blocksHost = root.querySelector('.blp-file-outliner-blocks') || root;

    const readStack = () => ({
      zoomStack: Array.isArray(view.zoomStack) ? [...view.zoomStack] : null,
      rootId: view.getZoomRootId?.() ?? null,
      headerText: root.querySelector('.blp-file-outliner-zoom-header')?.textContent ?? null,
      rootBlockCount: Array.from(blocksHost.children).filter((el) => el.classList?.contains('ls-block')).length,
    });

    const s0 = readStack();

    const bulletA = blocksHost.querySelector('.ls-block[data-blp-outliner-id="a"] .bullet-container');
    if (!bulletA) throw new Error('missing bullet for a');
    bulletA.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    await wait(200);
    const s1 = readStack();

    const bulletV = blocksHost.querySelector('.ls-block[data-blp-outliner-id="v"] .bullet-container');
    if (!bulletV) throw new Error('missing bullet for v');
    bulletV.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    await wait(200);
    const s2 = readStack();

    // Back once.
    const back = root.querySelector('.blp-outliner-zoom-back');
    if (!back) throw new Error('missing back button');
    back.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    await wait(200);
    const s3 = readStack();

    // Back to root.
    const back2 = root.querySelector('.blp-outliner-zoom-back');
    if (!back2) throw new Error('missing back button 2');
    back2.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    await wait(200);
    const s4 = readStack();

    return {
      ok: true,
      viewType,
      activeFile: app.workspace.getActiveFile?.()?.path ?? null,
      states: { s0, s1, s2, s3, s4 },
    };
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
