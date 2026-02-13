(async () => {
  const wait = (ms) => new Promise((r) => setTimeout(r, ms));
  const pluginId = 'block-link-plus';
  const tmpFolder = '_blp_tmp';
  const tmpPath = `${tmpFolder}/delete-merge-capture.md`;

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

  // Capture engine output.
  const orig = view.applyEngineResult.bind(view);
  view.applyEngineResult = (result) => {
    try {
      window.__blp_last_apply = {
        didChange: result.didChange,
        selection: result.selection,
        dirtyIds: Array.from(result.dirtyIds ?? []),
        blocks: (result.file?.blocks ?? []).map((b) => ({ id: b.id, text: b.text })),
      };
    } catch {
      window.__blp_last_apply = { error: true };
    }
    return orig(result);
  };

  const root = view.contentEl.querySelector('.blp-file-outliner-root') || view.contentEl;
  root.querySelector('.blp-file-outliner-display')?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
  await wait(50);

  const editor = root.querySelector('textarea.blp-file-outliner-editor');
  editor.focus();
  editor.setSelectionRange(editor.value.length, editor.value.length);
  editor.dispatchEvent(new KeyboardEvent('keydown', { key: 'Delete', bubbles: true }));
  await wait(80);

  const captured = window.__blp_last_apply ?? null;
  const after = (view.outlinerFile?.blocks ?? []).map((b) => ({ id: b.id, text: b.text }));

  return { ok: true, before, captured, after, editorValue: editor.value };
})();
