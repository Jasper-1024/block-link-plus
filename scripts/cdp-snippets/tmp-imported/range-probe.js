(async () => {
  const path = "_blp_tmp/block-range-probe.md";
  const folder = "_blp_tmp";
  try {
    if (!app.vault.getAbstractFileByPath(folder)) {
      await app.vault.createFolder(folder);
    }
  } catch {
    // ignore
  }

  const now = "2026-02-03T00:00:00";
  const lineCid = `    [date:: ${now}] [updated:: ${now}] [blp_sys:: 1] [blp_ver:: 2] ^cid`;
  const linePid = `  [date:: ${now}] [updated:: ${now}] [blp_sys:: 1] [blp_ver:: 2] ^pid`;
  const content = [
    "---",
    "blp_outliner: true",
    "---",
    "",
    "- parent",
    "  - child",
    lineCid,
    "  ",
    linePid,
    "",
  ].join("\n");

  let f = app.vault.getAbstractFileByPath(path);
  if (!f) f = await app.vault.create(path, content);
  else await app.vault.modify(f, content);

  await app.workspace.getLeaf(false).openFile(f);
  await new Promise((r) => setTimeout(r, 500));

  const cache = app.metadataCache.getCache(path);
  return {
    hasCache: !!cache,
    blockIds: cache?.blocks ? Object.keys(cache.blocks) : null,
    pid: cache?.blocks?.pid?.position ?? null,
    cid: cache?.blocks?.cid?.position ?? null,
  };
})();
