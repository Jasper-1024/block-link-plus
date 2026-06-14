(async () => {
  const wait = (ms) => new Promise((r) => setTimeout(r, ms));
  const tmpPath = '_blp_tmp/delete-merge-debug.md';
  const f = app.vault.getAbstractFileByPath(tmpPath);
  if (!f) throw new Error('missing file');
  await app.workspace.getLeaf(false).openFile(f);
  await wait(150);
  const view = app.workspace.activeLeaf?.view;
  if (view?.getViewType?.() !== 'blp-file-outliner-view') {
    return { ok: false, viewType: view?.getViewType?.() ?? null };
  }
  // Ensure 2 blocks exist.
  const before = (view.outlinerFile?.blocks ?? []).map((b) => ({ id: b.id, text: b.text }));
  const root = view.contentEl.querySelector('.blp-file-outliner-root') || view.contentEl;
  root.querySelector('.blp-file-outliner-display')?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
  await wait(50);
  const editor = root.querySelector('textarea.blp-file-outliner-editor');
  editor.focus();
  editor.setSelectionRange(editor.value.length, editor.value.length);
  const editingId = view.editingId;
  const sel = view.getActiveSelection ? view.getActiveSelection() : null;
  const loc = view.outlinerFile?.blocks?.find((b) => b.id === editingId) ?? null;
  const next = (view.outlinerFile?.blocks ?? []).find((b) => b.id !== editingId) ?? null;
  return { ok: true, before, editingId, sel, editorValue: editor.value, locText: loc?.text ?? null, nextText: next?.text ?? null };
})();
