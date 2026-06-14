(async () => {
  const wait = (ms) => new Promise((r) => setTimeout(r, ms));
  const pluginId = 'block-link-plus';
  const tmpFolder = '_blp_tmp';
  const tmpPath = `${tmpFolder}/delete-merge-applyEngineResult.md`;

  const plugin = app?.plugins?.plugins?.[pluginId];
  if (!plugin) throw new Error(`Plugin not found: ${pluginId}`);

  try {
    if (!app.vault.getAbstractFileByPath(tmpFolder)) {
      await app.vault.createFolder(tmpFolder);
    }
  } catch {}

  const now = '2026-02-03T00:00:00';
  const content = [
    '---',
    'blp_outliner: true',
    '---',
    '- a',
    `  [date:: ${now}] [updated:: ${now}] [blp_sys:: 1] [blp_ver:: 2] ^a1`,
    '- b',
    `  [date:: ${now}] [updated:: ${now}] [blp_sys:: 1] [blp_ver:: 2] ^b2`,
    '',
  ].join('\n');

  let f = app.vault.getAbstractFileByPath(tmpPath);
  if (!f) f = await app.vault.create(tmpPath, content);
  else await app.vault.modify(f, content);

  const prev = Array.isArray(plugin.settings?.fileOutlinerEnabledFiles)
    ? [...plugin.settings.fileOutlinerEnabledFiles]
    : [];
  plugin.settings.fileOutlinerEnabledFiles = Array.from(new Set([...prev, tmpPath]));
  await plugin.saveSettings();

  await app.workspace.getLeaf(false).openFile(f);
  await wait(150);

  const view = app.workspace.activeLeaf?.view;
  if (view?.getViewType?.() !== 'blp-file-outliner-view') {
    return { ok: false, viewType: view?.getViewType?.() ?? null };
  }

  const before = (view.outlinerFile?.blocks ?? []).map((b) => ({ id: b.id, text: b.text }));

  const cloned = JSON.parse(JSON.stringify(view.outlinerFile));
  cloned.blocks[0].text = String(cloned.blocks[0].text ?? '') + String(cloned.blocks[1].text ?? '');
  cloned.blocks[0].children = [...(cloned.blocks[0].children ?? []), ...(cloned.blocks[1].children ?? [])];
  cloned.blocks.splice(1, 1);

  view.applyEngineResult({
    didChange: true,
    file: cloned,
    selection: { id: 'a1', start: 1, end: 1 },
    dirtyIds: new Set(['a1']),
  });

  await wait(50);

  const after = (view.outlinerFile?.blocks ?? []).map((b) => ({ id: b.id, text: b.text }));
  return { ok: true, before, after };
})();
