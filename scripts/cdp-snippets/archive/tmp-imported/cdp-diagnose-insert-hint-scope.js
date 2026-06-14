(async () => {
  const wait = (ms) => new Promise((r) => setTimeout(r, ms));

  const pluginId = "block-link-plus";
  const tmpFolder = "_blp_tmp";
  const tmpPath = `${tmpFolder}/file-outliner-insert-hint-scope.md`;

  const now0 = "2026-02-03T00:00:00";
  const now1 = "2026-02-03T00:00:01";
  const now2 = "2026-02-03T00:00:02";

  const content = [
    "---",
    "blp_outliner: true",
    "---",
    "",
    "- a",
    "  - v",
    `    [date:: ${now1}] [updated:: ${now1}] [blp_sys:: 1] [blp_ver:: 2] ^v1`,
    "  - c",
    `    [date:: ${now2}] [updated:: ${now2}] [blp_sys:: 1] [blp_ver:: 2] ^c1`,
    "  ",
    `  [date:: ${now0}] [updated:: ${now0}] [blp_sys:: 1] [blp_ver:: 2] ^a1`,
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
    const rootBlocks = Array.from(blocksHost.children).filter((el) => el.classList?.contains('ls-block'));
    const lastRootBlock = blocksHost.querySelector(':scope > .ls-block:last-child');
    const lastHint = lastRootBlock?.querySelector(':scope > .blp-outliner-insert-hint');

    const cssSel = '.blp-file-outliner-view .blp-file-outliner-blocks > .ls-block:last-child > .blp-outliner-insert-hint';
    const matchCount = document.querySelectorAll(cssSel).length;

    const styles = lastHint ? getComputedStyle(lastHint) : null;

    return {
      ok: true,
      viewType,
      rootBlocks: rootBlocks.map((b) => b.dataset?.blpOutlinerId ?? null),
      cssMatchCount: matchCount,
      lastHint: lastHint
        ? {
            display: styles.display,
            opacity: styles.opacity,
            height: lastHint.getBoundingClientRect().height,
          }
        : null,
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
