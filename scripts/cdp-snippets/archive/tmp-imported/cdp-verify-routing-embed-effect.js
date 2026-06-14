(async () => {
  const wait = (ms) => new Promise((r) => setTimeout(r, ms));
  const assert = (cond, msg) => { if (!cond) throw new Error(msg); };

  const pluginId = 'block-link-plus';
  const tmpFolder = '_blp_tmp';
  const srcPath = `${tmpFolder}/outliner-src.md`;
  const normalPath = `${tmpFolder}/normal-embed.md`;

  const plugin = app?.plugins?.plugins?.[pluginId];
  assert(plugin, 'plugin not found');

  const prevSetting = plugin.settings.fileOutlinerViewEnabled;
  const openAndInspect = async (label) => {
    await app.workspace.getLeaf(false).setViewState({ type: 'markdown', state: { file: normalPath, mode: 'source' }, active: true });
    await wait(2500);
    const view = app.workspace.activeLeaf?.view;
    const embed = view?.containerEl?.querySelector('.markdown-embed');
    if (!embed) return { label, ok: false, reason: 'no embed' };
    const content = embed.querySelector('.markdown-embed-content') || embed;
    const it = (content instanceof HTMLElement ? content.innerText.trim() : '');
    const hasHeader = Boolean(content.querySelector('.mod-header'));
    const hasPreview = Boolean(content.querySelector('.markdown-preview-section'));
    const hasLi = Boolean(content.querySelector('li'));
    const dvSys = embed.querySelectorAll('.dataview.inline-field-key[data-dv-key="blp_sys"], .dataview.inline-field-key[data-dv-norm-key="blp_sys"]').length;
    const rawSys = (it.match(/\[blp_sys::/g) || []).length;
    const sysWord = (it.match(/\bblp_sys\b/g) || []).length;
    return {
      label,
      ok: true,
      fileOutlinerViewEnabled: plugin.settings.fileOutlinerViewEnabled,
      embedCls: embed.className,
      src: embed.getAttribute('src'),
      innerTextHead: it.slice(0, 120),
      innerTextLen: it.length,
      hasHeader,
      hasPreview,
      hasLi,
      dvSys,
      rawSys,
      sysWord,
    };
  };

  try {
    // ensure files exist
    assert(app.vault.getAbstractFileByPath(srcPath), 'missing outliner src');
    assert(app.vault.getAbstractFileByPath(normalPath), 'missing normal embed');

    const r1 = await openAndInspect('routing=ON (current)');

    plugin.settings.fileOutlinerViewEnabled = false;
    await plugin.saveSettings();
    await wait(300);

    const r2 = await openAndInspect('routing=OFF');

    plugin.settings.fileOutlinerViewEnabled = true;
    await plugin.saveSettings();
    await wait(300);

    const r3 = await openAndInspect('routing=ON (again)');

    return { ok: true, prevSetting, results: [r1, r2, r3] };
  } finally {
    try {
      plugin.settings.fileOutlinerViewEnabled = prevSetting;
      await plugin.saveSettings();
    } catch {}
  }
})();
