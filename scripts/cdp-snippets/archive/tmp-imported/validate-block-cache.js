// CDP validation: Obsidian metadata cache block ranges for system tail placement.
// Run:
//   node scripts/obsidian-cdp.js eval-file ".tmp/validate-block-cache.js"

(async () => {
  const wait = (ms) => new Promise((r) => setTimeout(r, ms));
  const tmpFolder = "_blp_tmp";
  const now = "2026-02-10T00:00:00";

  const pathA = `${tmpFolder}/block-cache-A.md`;
  const pathB = `${tmpFolder}/block-cache-B.md`;

  const contentA = [
    "---",
    "title: block cache A",
    "---",
    "",
    "- parent A",
    `  [date:: ${now}] [updated:: ${now}] [blp_sys:: 1] [blp_ver:: 2] ^pAaa`,
    "  - child A",
    `    [date:: ${now}] [updated:: ${now}] [blp_sys:: 1] [blp_ver:: 2] ^cAaa`,
    "",
  ].join("\n");

  // Legacy-ish: tail AFTER children.
  const contentB = [
    "---",
    "title: block cache B",
    "---",
    "",
    "- parent B",
    "  - child B",
    `    [date:: ${now}] [updated:: ${now}] [blp_sys:: 1] [blp_ver:: 2] ^cBaa`,
    "  ",
    `  [date:: ${now}] [updated:: ${now}] [blp_sys:: 1] [blp_ver:: 2] ^pBaa`,
    "",
  ].join("\n");

  const write = async (p, text) => {
    let f = app.vault.getAbstractFileByPath(p);
    if (!f) f = await app.vault.create(p, text);
    else await app.vault.modify(f, text);
    return f;
  };

  const readCache = (f) => {
    const c = app.metadataCache.getFileCache(f);
    if (!c) return null;
    const blocks = c.blocks || {};
    const pick = (id) => {
      const b = blocks[id];
      if (!b) return null;
      return {
        id,
        position: b.position
          ? {
              start: b.position.start,
              end: b.position.end,
            }
          : null,
      };
    };
    return {
      blockCount: Object.keys(blocks).length,
      p: pick("pAaa") || pick("pBaa"),
      c: pick("cAaa") || pick("cBaa"),
      ids: Object.keys(blocks).sort(),
    };
  };

  try {
    try {
      if (!app.vault.getAbstractFileByPath(tmpFolder)) {
        await app.vault.createFolder(tmpFolder);
      }
    } catch {
      // ignore
    }

    const fA = await write(pathA, contentA);
    const fB = await write(pathB, contentB);

    // Wait for metadata cache to refresh.
    await wait(400);
    let cacheA = readCache(fA);
    let cacheB = readCache(fB);

    // Retry a bit if blocks not ready.
    for (let i = 0; i < 10; i++) {
      const okA = cacheA && cacheA.ids.includes("pAaa") && cacheA.ids.includes("cAaa");
      const okB = cacheB && cacheB.ids.includes("pBaa") && cacheB.ids.includes("cBaa");
      if (okA && okB) break;
      await wait(250);
      cacheA = readCache(fA);
      cacheB = readCache(fB);
    }

    const blocksA = app.metadataCache.getFileCache(fA)?.blocks || {};
    const blocksB = app.metadataCache.getFileCache(fB)?.blocks || {};

    return {
      ok: true,
      A: {
        hasParent: !!blocksA.pAaa,
        hasChild: !!blocksA.cAaa,
        parentPos: blocksA.pAaa?.position ?? null,
        childPos: blocksA.cAaa?.position ?? null,
      },
      B: {
        hasParent: !!blocksB.pBaa,
        hasChild: !!blocksB.cBaa,
        parentPos: blocksB.pBaa?.position ?? null,
        childPos: blocksB.cBaa?.position ?? null,
      },
    };
  } finally {
    // NOTE: keep the cleanup best-effort but non-blocking; vault.delete() can hang in some environments
    // if another process/plugin is holding the file open.
    try {
      const f1 = app.vault.getAbstractFileByPath(pathA);
      if (f1) void app.vault.delete(f1);
    } catch {}
    try {
      const f2 = app.vault.getAbstractFileByPath(pathB);
      if (f2) void app.vault.delete(f2);
    } catch {}
  }
})();
