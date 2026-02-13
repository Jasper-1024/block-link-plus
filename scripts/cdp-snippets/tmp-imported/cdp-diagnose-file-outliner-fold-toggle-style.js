(async () => {
  const wait = (ms) => new Promise((r) => setTimeout(r, ms));

  const pluginId = "block-link-plus";
  const tmpFolder = "_blp_tmp";
  const tmpPath = `${tmpFolder}/file-outliner-fold-toggle-style.md`;

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

  await app.plugins.disablePlugin(pluginId);
  await app.plugins.enablePlugin(pluginId);
  await wait(250);

  const plugin = app?.plugins?.plugins?.[pluginId];
  if (!plugin) throw new Error(`Plugin not found after reload: ${pluginId}`);

  const prevEnabledFiles = Array.isArray(plugin.settings?.fileOutlinerEnabledFiles)
    ? [...plugin.settings.fileOutlinerEnabledFiles]
    : [];
  const prevActivePath = app.workspace.getActiveFile?.()?.path ?? null;

  const pickFold = (blocksHost) => {
    const parentEl = blocksHost.querySelector('.ls-block[data-blp-outliner-id="parent"]');
    const display = parentEl?.querySelector('.blp-file-outliner-display');
    if (display) display.dispatchEvent(new MouseEvent('click', { bubbles: true }));

    const fold = parentEl?.querySelector('.blp-outliner-fold-toggle');
    const bullet = parentEl?.querySelector('.bullet');

    const foldBefore = fold ? getComputedStyle(fold) : null;
    const foldArrowBefore = fold ? getComputedStyle(fold, '::before') : null;
    const bulletBefore = bullet ? getComputedStyle(bullet) : null;

    return {
      fold: foldBefore
        ? {
            opacity: foldBefore.opacity,
            color: foldBefore.color,
            transform: foldBefore.transform,
          }
        : null,
      foldArrow: foldArrowBefore
        ? {
            borderLeftColor: foldArrowBefore.borderLeftColor,
            borderLeftWidth: foldArrowBefore.borderLeftWidth,
            borderTopWidth: foldArrowBefore.borderTopWidth,
            transform: foldArrowBefore.transform,
          }
        : null,
      bullet: bulletBefore
        ? {
            backgroundColor: bulletBefore.backgroundColor,
            boxShadow: bulletBefore.boxShadow,
          }
        : null,
    };
  };

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

    const before = pickFold(blocksHost);

    // Runtime patch: align fold arrow color to bullet color.
    const styleId = '__blp_tmp_fold_patch';
    document.getElementById(styleId)?.remove();
    const s = document.createElement('style');
    s.id = styleId;
    s.textContent = `
      .blp-file-outliner-view .blp-outliner-fold-toggle::before {
        border-left-color: var(--ls-block-bullet-color) !important;
      }
    `;
    document.head.appendChild(s);
    await wait(50);

    const after = pickFold(blocksHost);

    return { ok: true, viewType, before, after };
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
