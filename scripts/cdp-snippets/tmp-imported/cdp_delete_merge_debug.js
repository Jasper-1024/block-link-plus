(async () => {
  const wait = (ms) => new Promise((r) => setTimeout(r, ms));
  const pluginId = 'block-link-plus';
  const tmpFolder = '_blp_tmp';
  const tmpPath = `${tmpFolder}/delete-merge-debug.md`;

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

  const beforeBlocks = (view.outlinerFile?.blocks ?? []).map((b) => ({ id: b.id, text: b.text }));

  const root = view.contentEl.querySelector('.blp-file-outliner-root') || view.contentEl;
  const firstDisplay = root.querySelector('.blp-file-outliner-display');
  firstDisplay.dispatchEvent(new MouseEvent('click', { bubbles: true }));
  await wait(50);

  const editor = root.querySelector('textarea.blp-file-outliner-editor');
  editor.focus();
  editor.setSelectionRange(editor.value.length, editor.value.length);

  // Trigger merge-with-next.
  editor.dispatchEvent(new KeyboardEvent('keydown', { key: 'Delete', bubbles: true }));
  await wait(80);

  const afterBlocks = (view.outlinerFile?.blocks ?? []).map((b) => ({ id: b.id, text: b.text }));

  return { ok: true, beforeBlocks, afterBlocks, editorValue: editor.value };
})();
