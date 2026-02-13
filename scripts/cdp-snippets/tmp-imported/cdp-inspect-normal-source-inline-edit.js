(async () => {
  const wait = (ms) => new Promise((r) => setTimeout(r, ms));
  const path = '_blp_tmp/normal-embed.md';

  await app.workspace.getLeaf(false).setViewState({ type: 'markdown', state: { file: path, mode: 'source' }, active: true });
  await wait(1500);

  const view = app.workspace.activeLeaf?.view;
  const embed = view?.containerEl?.querySelector('.markdown-embed');
  if (!embed) {
    return { ok: false, reason: 'no .markdown-embed', viewType: view?.getViewType?.() ?? null };
  }

  const pickVisible = (root, selectors) => {
    for (const sel of selectors) {
      const el = root.querySelector(sel);
      if (!(el instanceof HTMLElement)) continue;
      const cs = getComputedStyle(el);
      if (cs.display === 'none' || cs.visibility === 'hidden' || cs.opacity === '0') continue;
      return { sel, el };
    }
    return null;
  };

  const hostPick = pickVisible(embed, [
    '.blp-inline-edit-host',
    '.blp-live-preview-range-host',
    '.blp-reading-range-host',
    '.markdown-embed-content',
  ]);

  const host = hostPick?.el ?? embed;
  const inner = (host instanceof HTMLElement ? host.innerText : '') || '';

  const dvSys = embed.querySelectorAll('.dataview.inline-field-key[data-dv-key="blp_sys"], .dataview.inline-field-key[data-dv-norm-key="blp_sys"]').length;
  const rawSysCount = (inner.match(/\bblp_sys\b/g) || []).length;
  const rawTokenCount = (inner.match(/\[blp_sys::/g) || []).length;

  const cmSys = Array.from(embed.querySelectorAll('.cm-line')).some((el) => (el.textContent || '').includes('blp_sys'));

  return {
    ok: true,
    viewType: view?.getViewType?.() ?? null,
    embedCls: embed.className,
    src: embed.getAttribute('src'),
    pickedHost: hostPick?.sel ?? null,
    hostCls: host.className || null,
    hostTag: host.tagName,
    innerTextHead: inner.trim().slice(0, 200),
    innerTextLen: inner.length,
    markers: {
      dvSys,
      rawSysCount,
      rawTokenCount,
      cmHasSys: cmSys,
      hiddenTokens: embed.querySelectorAll('span[data-blp-outliner-system-line-hidden="token"]').length,
    },
  };
})();
