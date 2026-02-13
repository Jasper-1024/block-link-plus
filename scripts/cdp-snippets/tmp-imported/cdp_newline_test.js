(async()=>{
  const wait=(ms)=>new Promise(r=>setTimeout(r,ms));
  const pluginId='block-link-plus';
  const tmpFolder='_blp_tmp';
  const tmpPath=`${tmpFolder}/newline-test.md`;

  const plugin=app.plugins.plugins[pluginId];
  if(!plugin) throw new Error('no plugin');

  try{ if(!app.vault.getAbstractFileByPath(tmpFolder)) await app.vault.createFolder(tmpFolder);}catch{}

  const now='2026-02-03T00:00:00';
  const content=[
    '---',
    'blp_outliner: true',
    '---',
    '',
    '- line1',
    '  line2',
    '  line3',
    `  [date:: ${now}] [updated:: ${now}] [blp_sys:: 1] [blp_ver:: 2] ^nl1`,
    '',
  ].join('\n');

  let f=app.vault.getAbstractFileByPath(tmpPath);
  if(!f) f=await app.vault.create(tmpPath,content); else await app.vault.modify(f,content);

  const prev=Array.isArray(plugin.settings.fileOutlinerEnabledFiles)?[...plugin.settings.fileOutlinerEnabledFiles]:[];
  plugin.settings.fileOutlinerEnabledFiles=Array.from(new Set([...prev,tmpPath]));
  await plugin.saveSettings();

  await app.workspace.getLeaf(false).openFile(f);
  await wait(150);

  const view=app.workspace.activeLeaf?.view;
  if(view?.getViewType?.()!=='blp-file-outliner-view') return {ok:false, viewType:view?.getViewType?.()??null};

  const root=view.contentEl.querySelector('.blp-file-outliner-root')||view.contentEl;
  const display=root.querySelector('.blp-file-outliner-display');
  if(!display) throw new Error('no display');

  return {
    ok:true,
    renderedText: display.innerText,
    renderedHtml: display.innerHTML,
  };
})();
