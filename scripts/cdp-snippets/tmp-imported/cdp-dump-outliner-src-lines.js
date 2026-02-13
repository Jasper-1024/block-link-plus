(async () => {
  const path = '_blp_tmp/outliner-src.md';
  const f = app.vault.getAbstractFileByPath(path);
  if (!f) return { ok: false, reason: 'missing file' };
  const raw = await app.vault.cachedRead(f);
  const lines = raw.split(/\r?\n/);
  const preview = lines.slice(0, 20).map((t, i) => ({ i, t }));

  const cache = app.metadataCache.getCache(path);
  const blocks = cache?.blocks ? Object.values(cache.blocks) : [];
  const pos = Object.fromEntries(blocks.map((b) => [b.id, b.position]));

  return { ok: true, lineCount: lines.length, preview, pos };
})();
