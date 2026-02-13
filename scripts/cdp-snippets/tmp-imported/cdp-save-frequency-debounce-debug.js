// Debug: how many times debounced wrapper actually calls the original requestSave during typing.
(async () => {
  const wait = (ms) => new Promise((r) => setTimeout(r, ms));
  const assert = (cond, msg) => { if (!cond) throw new Error(msg); };

  const pluginId = 'block-link-plus';
  const tmpFolder = '_blp_tmp';
  const tmpPath = `${tmpFolder}/_cdp_save_frequency_debounce_debug.md`;
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
    await wait(2000);

    const view = app.workspace.activeLeaf?.view;
    assert(view?.getViewType?.() === 'blp-file-outliner-view', 'not in outliner view');

    const root = view.contentEl.querySelector('.blp-file-outliner-root') || view.contentEl;
    const blocksHost = root.querySelector('.blp-file-outliner-blocks') || root;
    const aDisplay = blocksHost.querySelector('.ls-block[data-blp-outliner-id="a"] .blp-file-outliner-display');
    assert(aDisplay, 'missing a display');
    aDisplay.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    await wait(120);

    const editor = view.editorView;
    assert(editor, 'missing editor');

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
    let requestSaveCalls = 0;
    let origSaveCalls = 0;
    let scheduled = 0;
    const delayMs = 500;

    view.requestSave = () => {
      requestSaveCalls += 1;
      if (scheduled) return;
      scheduled = window.setTimeout(() => {
        scheduled = 0;
        origSaveCalls += 1;
        try { origRequestSave(); } catch {}
      }, delayMs);
    };

    requestSaveCalls = 0;
    origSaveCalls = 0;
    modifyCalls = 0;

    const t0 = Date.now();
    for (const ch of 'abcdefghij') {
      const pos = editor.state.doc.length;
      editor.dispatch({ changes: { from: pos, to: pos, insert: ch }, selection: { anchor: pos + 1 } });
      await wait(40);
    }
    const t1 = Date.now();

    await wait(delayMs + 2500);

    const disk = await app.vault.read(f);

    return {
      ok: true,
      delayMs,
      typingMs: t1 - t0,
      requestSaveCalls,
      origSaveCalls,
      modifyCalls,
      diskHasText: disk.includes('- abcdefghij'),
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
