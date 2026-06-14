(async () => {
  const wait = (ms) => new Promise((r) => setTimeout(r, ms));
  const tmpFolder = "_blp_tmp";
  const now = "2026-02-10T00:00:00";
  const pathA = `${tmpFolder}/block-cache-A.md`;
  const pathB = `${tmpFolder}/block-cache-B.md`;

  const contentA = [
    "- parent A",
    `  [date:: ${now}] [updated:: ${now}] [blp_sys:: 1] [blp_ver:: 2] ^paaa`,
    "  - child A",
    `    [date:: ${now}] [updated:: ${now}] [blp_sys:: 1] [blp_ver:: 2] ^caaa`,
    "",
  ].join("\n");

  const contentB = [
    "- parent B",
    "  - child B",
    `    [date:: ${now}] [updated:: ${now}] [blp_sys:: 1] [blp_ver:: 2] ^cbbb`,
    "  ",
    `  [date:: ${now}] [updated:: ${now}] [blp_sys:: 1] [blp_ver:: 2] ^pbbb`,
    "",
  ].join("\n");

  let fA = null;
  let fB = null;
  try {
    try {
      if (!app.vault.getAbstractFileByPath(tmpFolder)) {
        await app.vault.createFolder(tmpFolder);
      }
    } catch {}

    fA = app.vault.getAbstractFileByPath(pathA);
    if (!fA) fA = await app.vault.create(pathA, contentA);
    else await app.vault.modify(fA, contentA);

    fB = app.vault.getAbstractFileByPath(pathB);
    if (!fB) fB = await app.vault.create(pathB, contentB);
    else await app.vault.modify(fB, contentB);

    await wait(1500);

    const cacheA = app.metadataCache.getFileCache(fA);
    const cacheB = app.metadataCache.getFileCache(fB);
    const blocksA = cacheA?.blocks || {};
    const blocksB = cacheB?.blocks || {};

    return {
      ok: true,
      A: {
        keys: Object.keys(blocksA),
        hasP: !!blocksA.paaa,
        hasC: !!blocksA.caaa,
        pPos: blocksA.paaa?.position ?? null,
        cPos: blocksA.caaa?.position ?? null,
      },
      B: {
        keys: Object.keys(blocksB),
        hasP: !!blocksB.pbbb,
        hasC: !!blocksB.cbbb,
        pPos: blocksB.pbbb?.position ?? null,
        cPos: blocksB.cbbb?.position ?? null,
      },
    };
  } finally {
    try { const x = app.vault.getAbstractFileByPath(pathA); if (x) void app.vault.delete(x); } catch {}
    try { const y = app.vault.getAbstractFileByPath(pathB); if (y) void app.vault.delete(y); } catch {}
  }
})();