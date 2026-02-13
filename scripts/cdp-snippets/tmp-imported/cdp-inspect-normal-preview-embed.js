(async () => {
  const wait = (ms) => new Promise((r) => setTimeout(r, ms));
  const path = '_blp_tmp/normal-embed.md';
  await app.workspace.getLeaf(false).setViewState({ type: 'markdown', state: { file: path, mode: 'preview' }, active: true });
  await wait(1000);
  const view = app.workspace.activeLeaf?.view;
  const embed = view?.containerEl?.querySelector('.markdown-embed');
  if (!embed) return { ok: false, reason: 'no .markdown-embed', viewType: view?.getViewType?.() ?? null };
  const content = embed.querySelector('.markdown-embed-content') || embed;
  return {
    ok: true,
    cls: embed.className,
    src: embed.getAttribute('src'),
    contentCls: content.className,
    contentInnerText: (content instanceof HTMLElement ? content.innerText : ''),
    embedInnerText: embed.innerText,
    contentHtmlHead: content.innerHTML.slice(0, 400),
    hasOutlinerHidden: embed.querySelectorAll('span[data-blp-outliner-system-line-hidden="token"]').length,
    hasDvSys: Boolean(embed.querySelector('.dataview.inline-field-key[data-dv-key="blp_sys"], .dataview.inline-field-key[data-dv-norm-key="blp_sys"]')),
  };
})();
