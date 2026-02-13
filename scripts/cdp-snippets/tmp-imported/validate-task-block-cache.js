(async () => {
  const wait = (ms) => new Promise((r) => setTimeout(r, ms));
  const tmpFolder = "_blp_tmp";
  const now = "2026-02-10T00:00:00";
  const path = `${tmpFolder}/task-block-cache.md`;

  const content = [
    "- [ ] parent task",
    "  continuation",
    "  \\- literal list marker as text",
    `  [date:: ${now}] [updated:: ${now}] [blp_sys:: 1] [blp_ver:: 2] ^ptsk`,
    "  - child",
    `    [date:: ${now}] [updated:: ${now}] [blp_sys:: 1] [blp_ver:: 2] ^ctsk`,
    "",
  ].join("\n");

  try {
    try {
      if (!app.vault.getAbstractFileByPath(tmpFolder)) {
        await app.vault.createFolder(tmpFolder);
      }
    } catch {}

    let f = app.vault.getAbstractFileByPath(path);
    if (!f) f = await app.vault.create(path, content);
    else await app.vault.modify(f, content);

    await wait(1500);

    const cache = app.metadataCache.getFileCache(f);
    const blocks = cache?.blocks || {};

    return {
      ok: true,
      keys: Object.keys(blocks).sort(),
      parentPos: blocks.ptsk?.position ?? null,
      childPos: blocks.ctsk?.position ?? null,
    };
  } finally {
    try { const x = app.vault.getAbstractFileByPath(path); if (x) void app.vault.delete(x); } catch {}
  }
})();
