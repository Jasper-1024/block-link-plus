(async () => {
  const tmpFolder = "_blp_tmp";
  const now = "2026-02-10T00:00:00";
  const pathA = `${tmpFolder}/block-cache-A.md`;
  const pathB = `${tmpFolder}/block-cache-B.md`;
  const contentA = ['- parent A', `  [date:: ${now}] [updated:: ${now}] [blp_sys:: 1] [blp_ver:: 2] ^paaa`, ''].join('\n');
  const contentB = ['- parent B', `  [date:: ${now}] [updated:: ${now}] [blp_sys:: 1] [blp_ver:: 2] ^pbbb`, ''].join('\n');
  try {
    try {
      if (!app.vault.getAbstractFileByPath(tmpFolder)) {
        await app.vault.createFolder(tmpFolder);
      }
    } catch {}

    let fA = app.vault.getAbstractFileByPath(pathA);
    if (!fA) fA = await app.vault.create(pathA, contentA);
    else await app.vault.modify(fA, contentA);

    let fB = app.vault.getAbstractFileByPath(pathB);
    if (!fB) fB = await app.vault.create(pathB, contentB);
    else await app.vault.modify(fB, contentB);

    return { ok: true, paths: { pathA, pathB } };
  } finally {
    try { const f1 = app.vault.getAbstractFileByPath(pathA); if (f1) void app.vault.delete(f1); } catch {}
    try { const f2 = app.vault.getAbstractFileByPath(pathB); if (f2) void app.vault.delete(f2); } catch {}
  }
})();