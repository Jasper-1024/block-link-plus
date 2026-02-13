(async () => {
  const wait = (ms) => new Promise((r) => setTimeout(r, ms));
  const path = '_blp_tmp/normal-embed.md';
  await app.workspace.getLeaf(false).setViewState({ type: 'markdown', state: { file: path, mode: 'source' }, active: true });

  const poll = async () => {
    const view = app.workspace.activeLeaf?.view;
    const embed = view?.containerEl?.querySelector('.markdown-embed');
    if (!embed) return null;
    const host = embed.querySelector('.blp-inline-edit-host') || embed.querySelector('.blp-live-preview-range-host') || embed.querySelector('.markdown-embed-content');
    if (!(host instanceof HTMLElement)) return null;
    const hasCM = Boolean(host.querySelector('.cm-content, .markdown-preview-section, .markdown-source-view'));
    const textLen = (host.innerText || '').trim().length;
    return { view, embed, host, hasCM, textLen };
  };

  let snap = null;
  for (let i = 0; i < 40; i++) {
    snap = await poll();
    if (snap && (snap.hasCM || snap.textLen > 0)) break;
    await wait(250);
  }

  const view = app.workspace.activeLeaf?.view;
  const embed = view?.containerEl?.querySelector('.markdown-embed');
  if (!embed) return { ok: false, reason: 'no embed after wait' };

  const host = embed.querySelector('.blp-inline-edit-host') || embed.querySelector('.blp-live-preview-range-host') || embed.querySelector('.markdown-embed-content') || embed;
  const hostEl = host instanceof HTMLElement ? host : embed;

  return {
    ok: true,
    embedCls: embed.className,
    src: embed.getAttribute('src'),
    hostCls: hostEl.className,
    hostChildCount: hostEl.children.length,
    hasCM: Boolean(hostEl.querySelector('.cm-content, .markdown-preview-section, .markdown-source-view')),
    htmlLen: hostEl.innerHTML.length,
    htmlHead: hostEl.innerHTML.slice(0, 400),
    innerTextHead: (hostEl.innerText || '').trim().slice(0, 200),
  };
})();
