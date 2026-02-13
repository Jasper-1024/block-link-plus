(async () => {
  const wait = (ms) => new Promise((r) => setTimeout(r, ms));

  const pluginId = 'block-link-plus';
  const tmpFolder = '_blp_tmp';
  const tmpPath = `${tmpFolder}/delete-merge-test.md`;

  const plugin = app?.plugins?.plugins?.[pluginId];
  if (!plugin) throw new Error(`Plugin not found: ${pluginId}`);

  try {
    if (!app.vault.getAbstractFileByPath(tmpFolder)) {
      await app.vault.createFolder(tmpFolder);
    }
  } catch {
    // ignore
  }

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

  const leaf = app.workspace.activeLeaf;
  const view = leaf?.view;
  if (view?.getViewType?.() !== 'blp-file-outliner-view') {
    return { ok: false, viewType: view?.getViewType?.() ?? null };
  }

  const root = view.contentEl.querySelector('.blp-file-outliner-root') || view.contentEl;

  // Enter edit mode on first block.
  const firstDisplay = root.querySelector('.blp-file-outliner-display');
  if (!firstDisplay) throw new Error('Missing first display');
  firstDisplay.dispatchEvent(new MouseEvent('click', { bubbles: true }));
  await wait(50);

  const editor = root.querySelector('textarea.blp-file-outliner-editor');
  if (!editor) throw new Error('Missing editor');
  editor.focus();

  // Merge with next using Delete at end.
  editor.setSelectionRange(editor.value.length, editor.value.length);
  editor.dispatchEvent(new KeyboardEvent('keydown', { key: 'Delete', bubbles: true }));
  await wait(100);

  const blocksCount = root.querySelectorAll('.ls-block').length;
  const data = typeof view.getViewData === 'function' ? view.getViewData() : '';

  return {
    ok: true,
    blocksCount,
    dataPreview: data.split('\n').slice(0, 12),
  };
})();
