(async () => {
  const wait = (ms) => new Promise((r) => setTimeout(r, ms));

  const pluginId = "block-link-plus";
  const tmpFolder = "_blp_tmp";
  const tmpPath = `${tmpFolder}/file-outliner-fold-override-exp.md`;

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

  const read = (parentEl) => {
    const fold = parentEl?.querySelector('.blp-outliner-fold-toggle');
    if (!fold) return null;
    const arrowCs = getComputedStyle(fold, '::before');
    return {
      borderLeft: arrowCs.borderLeft,
      borderLeftColor: arrowCs.borderLeftColor,
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
    } catch {}

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

    const before = read(parentEl);

    // Activate edit mode.
    const display = parentEl.querySelector('.blp-file-outliner-display');
    if (display) display.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    await wait(80);

    const focused = read(parentEl);

    // Inject override.
    const styleId = '__blp_fold_override_exp';
    document.getElementById(styleId)?.remove();
    const s = document.createElement('style');
    s.id = styleId;
    s.textContent = `
      .blp-file-outliner-view .ls-block.is-blp-outliner-active .blp-outliner-fold-toggle::before {
        border-left: 6px solid rgb(255, 0, 0) !important;
      }
    `;
    document.head.appendChild(s);
    await wait(30);

    const afterOverride = read(parentEl);

    return { ok: true, viewType, before, focused, afterOverride };
  } finally {
    try {
      plugin.settings.fileOutlinerEnabledFiles = prevEnabledFiles;
      await plugin.saveSettings();
    } catch {}

    try {
      if (prevActivePath) {
        const prev = app.vault.getAbstractFileByPath(prevActivePath);
        if (prev) await app.workspace.getLeaf(false).openFile(prev);
      }
    } catch {}

    try {
      const f = app.vault.getAbstractFileByPath(tmpPath);
      if (f) await app.vault.delete(f);
    } catch {}
  }
})();
