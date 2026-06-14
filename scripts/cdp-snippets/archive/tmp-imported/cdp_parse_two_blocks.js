(async () => {
  const wait = (ms) => new Promise((r) => setTimeout(r, ms));
  const pluginId = 'block-link-plus';
  const tmpFolder = '_blp_tmp';
  const tmpPath = `${tmpFolder}/delete-merge-test2.md`;

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
  const blocks = view?.outlinerFile?.blocks ?? [];
  return { viewType: view?.getViewType?.() ?? null, blocks: blocks.map((b) => ({ id: b.id, text: b.text })) };
})();
