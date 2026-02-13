(async () => {
  const wait = (ms) => new Promise((r) => setTimeout(r, ms));
  const tmpFolder = '_blp_tmp';
  const srcPath = `${tmpFolder}/plain-src.md`;
  const embedPath = `${tmpFolder}/plain-embed.md`;

  const srcContent = [
    '# plain',
    '',
    'hello world ^p1',
    '',
    '- list item',
    '  continuation ^p2',
    '',
  ].join('\n');

  const embedContent = [
    '# embed',
    '',
    `![[${tmpFolder}/plain-src#^p1]]`,
    '',
    `![[${tmpFolder}/plain-src#^p2]]`,
    '',
  ].join('\n');

  try {
    if (!app.vault.getAbstractFileByPath(tmpFolder)) await app.vault.createFolder(tmpFolder);
  } catch {}

  const upsert = async (path, content) => {
    let f = app.vault.getAbstractFileByPath(path);
    if (!f) f = await app.vault.create(path, content);
    else await app.vault.modify(f, content);
    return f;
  };

  await upsert(srcPath, srcContent);
  await upsert(embedPath, embedContent);

  await app.workspace.getLeaf(false).setViewState({ type: 'markdown', state: { file: embedPath, mode: 'source' }, active: true });
  await wait(2500);

  const view = app.workspace.activeLeaf?.view;
  const embeds = Array.from(view?.containerEl?.querySelectorAll('.markdown-embed') || []);
  const out = [];
  for (const e of embeds) {
    const content = e.querySelector('.markdown-embed-content') || e;
    out.push({
      src: e.getAttribute('src'),
      cls: e.className,
      innerText: (content instanceof HTMLElement ? content.innerText.trim() : ''),
      hasHeader: Boolean(content.querySelector('.mod-header')),
      hasPreviewSection: Boolean(content.querySelector('.markdown-preview-section')),
      hasLi: Boolean(content.querySelector('li')),
    });
  }

  return { ok: true, embedCount: embeds.length, out };
})();
