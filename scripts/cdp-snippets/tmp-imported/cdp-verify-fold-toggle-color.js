(async () => {
  const wait = (ms) => new Promise((r) => setTimeout(r, ms));

  const pluginId = "block-link-plus";
  const tmpFolder = "_blp_tmp";
  const tmpPath = `${tmpFolder}/file-outliner-verify-fold-color.md`;

  const now0 = "2026-02-03T00:00:00";
  const now1 = "2026-02-03T00:00:01";
  const now2 = "2026-02-03T00:00:02";

  const content = [
    "---",
    "blp_outliner: true",
    "---",
    "",
    "- parent",
    "  - child",
    `    [date:: ${now2}] [updated:: ${now2}] [blp_sys:: 1] [blp_ver:: 2] ^child`,
    "  ",
    `  [date:: ${now1}] [updated:: ${now1}] [blp_sys:: 1] [blp_ver:: 2] ^parent`,
    "",
    `  [date:: ${now0}] [updated:: ${now0}] [blp_sys:: 1] [blp_ver:: 2] ^dummy`,
    "",
  ].join("\n");

  const readColors = (parentEl) => {
    const fold = parentEl?.querySelector('.blp-outliner-fold-toggle');
    const bullet = parentEl?.querySelector('.bullet');
    if (!fold || !bullet) return null;

    const foldCs = getComputedStyle(fold);
    const arrowCs = getComputedStyle(fold, '::before');
    const bulletCs = getComputedStyle(bullet);

    return {
      state: {
        parentFocusWithin: parentEl.matches(':focus-within'),
        parentActiveClass: parentEl.classList.contains('is-blp-outliner-active'),
      },
      fold: {
        color: foldCs.color,
        opacity: foldCs.opacity,
      },
      arrow: {
        color: arrowCs.color,
        borderLeft: arrowCs.borderLeft,
        borderLeftColor: arrowCs.borderLeftColor,
        transform: arrowCs.transform,
      },
      bullet: {
        backgroundColor: bulletCs.backgroundColor,
        boxShadow: bulletCs.boxShadow,
      },
    };
  };

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

    const parentEl = blocksHost.querySelector('.ls-block[data-blp-outliner-id="parent"]');
    if (!parentEl) throw new Error('parent block missing');

    const beforeFocus = readColors(parentEl);

    // Activate edit mode on parent to flip bullet/fold colors.
    const display = parentEl.querySelector('.blp-file-outliner-display');
    if (display) display.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    await wait(80);

    const afterFocus = readColors(parentEl);

    return { ok: true, viewType, beforeFocus, afterFocus };
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
