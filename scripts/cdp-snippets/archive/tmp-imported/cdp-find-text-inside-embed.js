(async () => {
  const wait = (ms) => new Promise((r) => setTimeout(r, ms));
  const path = '_blp_tmp/normal-embed.md';
  await app.workspace.getLeaf(false).setViewState({ type: 'markdown', state: { file: path, mode: 'source' }, active: true });
  await wait(2000);
  const view = app.workspace.activeLeaf?.view;
  const embed = view?.containerEl?.querySelector('.markdown-embed');
  if (!embed) return { ok: false, reason: 'no embed', viewType: view?.getViewType?.() ?? null };

  const all = Array.from(embed.querySelectorAll('*'));
  const texts = [];
  for (const el of all) {
    if (!(el instanceof HTMLElement)) continue;
    const t = (el.innerText || '').trim();
    if (!t) continue;
    if (t.length > 200) continue;
    const cs = getComputedStyle(el);
    if (cs.display === 'none' || cs.visibility === 'hidden') continue;
    texts.push({ tag: el.tagName, cls: el.className || '', t });
    if (texts.length >= 20) break;
  }

  const counts = {
    inlineEditHost: embed.querySelectorAll('.blp-inline-edit-host').length,
    livePreviewHost: embed.querySelectorAll('.blp-live-preview-range-host').length,
    readingHost: embed.querySelectorAll('.blp-reading-range-host').length,
    cm: embed.querySelectorAll('.cm-content').length,
    preview: embed.querySelectorAll('.markdown-preview-section').length,
    dvSys: embed.querySelectorAll('.dataview.inline-field-key[data-dv-key="blp_sys"], .dataview.inline-field-key[data-dv-norm-key="blp_sys"]').length,
  };

  return {
    ok: true,
    embedCls: embed.className,
    src: embed.getAttribute('src'),
    counts,
    sampleTexts: texts,
    embedTextHead: (embed.innerText || '').trim().slice(0, 200),
    embedTextLen: (embed.innerText || '').length,
  };
})();
