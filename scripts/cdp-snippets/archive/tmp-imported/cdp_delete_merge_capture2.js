(async () => {
  const wait = (ms) => new Promise((r) => setTimeout(r, ms));
  const pluginId = 'block-link-plus';
  const tmpFolder = '_blp_tmp';
  const tmpPath = `${tmpFolder}/delete-merge-capture2.md`;

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

  const root = view.contentEl.querySelector('.blp-file-outliner-root') || view.contentEl;
  root.querySelector('.blp-file-outliner-display')?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
  await wait(50);

  const editor = root.querySelector('textarea.blp-file-outliner-editor');
  editor.focus();
  editor.setSelectionRange(editor.value.length, editor.value.length);

  const logs = [];

  const origEnter = view.enterEditMode.bind(view);
  view.enterEditMode = (id, opts) => {
    const blk = view.blockById?.get?.(id);
    logs.push({
      when: 'enterEditMode',
      id,
      opts,
      blockText: blk?.text ?? null,
      beforeEditor: editor.value,
      editingId: view.editingId,
    });
    const ret = origEnter(id, opts);
    logs.push({ when: 'afterEnter', id, editor: editor.value, editingId: view.editingId });
    return ret;
  };

  const origApply = view.applyEngineResult.bind(view);
  view.applyEngineResult = (result) => {
    logs.push({
      when: 'applyEngineResult',
      selection: result.selection,
      blocks: (result.file?.blocks ?? []).map((b) => ({ id: b.id, text: b.text })),
      editorBefore: editor.value,
    });
    const ret = origApply(result);
    logs.push({ when: 'afterApply', editor: editor.value, blocks: (view.outlinerFile?.blocks ?? []).map((b) => ({ id: b.id, text: b.text })) });
    return ret;
  };

  editor.dispatchEvent(new KeyboardEvent('keydown', { key: 'Delete', bubbles: true }));
  await wait(120);

  return {
    ok: true,
    finalEditor: editor.value,
    finalBlocks: (view.outlinerFile?.blocks ?? []).map((b) => ({ id: b.id, text: b.text })),
    logs,
  };
})();
