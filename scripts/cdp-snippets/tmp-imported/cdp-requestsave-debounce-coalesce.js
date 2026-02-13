// Validate that a debounced requestSave wrapper coalesces multiple calls into one vault.modify.
(async () => {
  const wait = (ms) => new Promise((r) => setTimeout(r, ms));
  const assert = (cond, msg) => { if (!cond) throw new Error(msg); };

  const pluginId = 'block-link-plus';
  const tmpFolder = '_blp_tmp';
  const tmpPath = `${tmpFolder}/_cdp_requestsave_debounce_coalesce.md`;
  const now0 = '2026-02-12T00:00:00';

  const content = [
    '---',
    'blp_outliner: true',
    '---',
    '',
    '- ',
    `  [date:: ${now0}] [updated:: ${now0}] [blp_sys:: 1] [blp_ver:: 2] ^a`,
    '',
  ].join('\n');

  await app.plugins.disablePlugin(pluginId);
  await app.plugins.enablePlugin(pluginId);
  await wait(250);

  const plugin = app?.plugins?.plugins?.[pluginId];
  assert(plugin, 'plugin not found');

  const prevEnabledFiles = Array.isArray(plugin.settings?.fileOutlinerEnabledFiles)
    ? [...plugin.settings.fileOutlinerEnabledFiles]
    : [];

  try {
    if (!app.vault.getAbstractFileByPath(tmpFolder)) {
      try { await app.vault.createFolder(tmpFolder); } catch {}
    }

    let f = app.vault.getAbstractFileByPath(tmpPath);
    if (!f) f = await app.vault.create(tmpPath, content);
    else await app.vault.modify(f, content);

    plugin.settings.fileOutlinerEnabledFiles = Array.from(new Set([...prevEnabledFiles, tmpPath]));
    await plugin.saveSettings();

    await app.workspace.getLeaf(false).openFile(f);
    await wait(1500);

    const view = app.workspace.activeLeaf?.view;
    assert(view?.getViewType?.() === 'blp-file-outliner-view', 'not in outliner view');

    // Mark the file dirty in a simple way.
    const b = view.blockById?.get?.('a');
    assert(b, 'missing block a');
    b.text = 'dirty';
    view.dirtyBlockIds?.add?.('a');

    // Instrument vault.modify for this file.
    const vault = app.vault;
    const origModify = vault.modify.bind(vault);
    let modifyCalls = 0;
    vault.modify = async (file, data, ...rest) => {
      try {
        if (file?.path === tmpPath) modifyCalls += 1;
      } catch {}
      return origModify(file, data, ...rest);
    };

    const origRequestSave = view.requestSave.bind(view);
    let origSaveCalls = 0;
    let scheduled = 0;
    const delayMs = 300;

    view.requestSave = () => {
      if (scheduled) return;
      scheduled = window.setTimeout(() => {
        scheduled = 0;
        origSaveCalls += 1;
        try { origRequestSave(); } catch {}
      }, delayMs);
    };

    modifyCalls = 0;
    origSaveCalls = 0;

    // Burst-call requestSave.
    for (let i = 0; i < 10; i++) view.requestSave();

    await wait(delayMs + 1200);

    const disk = await app.vault.read(f);

    return {
      ok: true,
      delayMs,
      origSaveCalls,
      modifyCalls,
      diskHasDirty: disk.includes('- dirty'),
    };
  } finally {
    try {
      plugin.settings.fileOutlinerEnabledFiles = prevEnabledFiles;
      await plugin.saveSettings();
    } catch {}

    try {
      const f = app.vault.getAbstractFileByPath(tmpPath);
      if (f) await app.vault.delete(f);
    } catch {}
  }
})();
