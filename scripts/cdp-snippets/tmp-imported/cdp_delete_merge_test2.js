(async () => {
  const wait = (ms) => new Promise((r) => setTimeout(r, ms));
  const tmpPath = '_blp_tmp/delete-merge-test2.md';
  const f = app.vault.getAbstractFileByPath(tmpPath);
  if (!f) throw new Error('file missing');
  await app.workspace.getLeaf(false).openFile(f);
  await wait(150);

  const view = app.workspace.activeLeaf?.view;
  if (view?.getViewType?.() !== 'blp-file-outliner-view') {
    return { ok: false, viewType: view?.getViewType?.() ?? null };
  }

  const root = view.contentEl.querySelector('.blp-file-outliner-root') || view.contentEl;
  const displays = root.querySelectorAll('.blp-file-outliner-display');
  if (!displays[0]) throw new Error('no display');
  displays[0].dispatchEvent(new MouseEvent('click', { bubbles: true }));
  await wait(50);

  const editor = root.querySelector('textarea.blp-file-outliner-editor');
  if (!editor) throw new Error('no editor');
  editor.focus();
  editor.setSelectionRange(editor.value.length, editor.value.length);
  editor.dispatchEvent(new KeyboardEvent('keydown', { key: 'Delete', bubbles: true }));
  await wait(80);

  const blocks = view.outlinerFile?.blocks ?? [];
  return {
    ok: true,
    blocks: blocks.map((b) => ({ id: b.id, text: b.text })),
    dataPreview: typeof view.getViewData === 'function' ? view.getViewData().split('\n').slice(0, 10) : null,
  };
})();
