// CDP smoke (subfolder formats): Journal Feed must discover daily notes whose
// date format includes path separators (e.g. YYYY/M/YYYY-M-D).
//
// Run:
//   $env:OB_CDP_PORT=19225; $env:OB_CDP_TITLE_CONTAINS=' - blp - '; node scripts/obsidian-cdp.js eval-file "scripts/cdp-snippets/journal-feed-subfolder-smoke.js"
//
// Notes:
// - This script creates temporary daily notes and an anchor note, then attempts
//   best-effort cleanup at the end.

(async () => {
  const wait = (ms) => new Promise((r) => setTimeout(r, ms));
  const assert = (cond, msg) => {
    if (!cond) throw new Error(msg);
  };

  const waitFor = async (fn, { timeoutMs = 8000, stepMs = 50 } = {}) => {
    const t0 = Date.now();
    while (Date.now() - t0 < timeoutMs) {
      const v = fn();
      if (v) return v;
      await wait(stepMs);
    }
    return null;
  };

  const pluginId = "block-link-plus";
  const tmpFolder = "_blp_tmp";
  const anchorPath = `${tmpFolder}/journal-feed-anchor-subfolders.md`;

  const dailyPlugin = app?.internalPlugins?.getPluginById?.("daily-notes");
  assert(dailyPlugin?.enabled === true, "Daily Notes internal plugin is disabled.");
  const inst = dailyPlugin.instance;
  assert(inst && typeof inst.getFormat === "function", "Daily Notes instance missing getFormat().");

  const moment = window.moment;
  assert(moment && typeof moment === "function", "moment() not available on window.");

  const testFolderPath = `${tmpFolder}/daily-subfolders`;
  const testFormat = "YYYY/M/YYYY-M-D";

  const origGetFolder = inst.getFolder?.bind(inst);
  const origGetFormat = inst.getFormat?.bind(inst);

  // Force a subfolder format to exercise Journal Feed's fallback vault scan.
  inst.getFolder = () => ({ path: testFolderPath });
  inst.getFormat = () => testFormat;

  const folderObj = inst.getFolder?.();
  const folderPath = folderObj?.path ?? (typeof folderObj === "string" ? folderObj : "");
  const format = inst.getFormat?.() || "YYYY-MM-DD";

  const normalizeFolder = (p) => String(p || "").replace(/\/+$/, "");
  const baseFolder = normalizeFolder(folderPath);

  const ensureFolder = async (folder) => {
    const parts = String(folder || "").split("/").filter(Boolean);
    let cur = "";
    for (const part of parts) {
      cur = cur ? `${cur}/${part}` : part;
      try {
        if (!app.vault.getAbstractFileByPath(cur)) await app.vault.createFolder(cur);
      } catch {
        // ignore
      }
    }
  };

  const ensureParentFolder = async (filePath) => {
    const p = String(filePath || "");
    const parent = p.split("/").slice(0, -1).join("/");
    if (parent) await ensureFolder(parent);
  };

  const makeDailyPath = (daysAgo) => {
    const dateStr = moment().startOf("day").subtract(daysAgo, "day").format(format);
    return baseFolder ? `${baseFolder}/${dateStr}.md` : `${dateStr}.md`;
  };

  const day0Path = makeDailyPath(0);
  const day1Path = makeDailyPath(1);
  const day2Path = makeDailyPath(2);

  const upsert = async (path, content) => {
    await ensureParentFolder(path);
    let f = app.vault.getAbstractFileByPath(path);
    if (!f) f = await app.vault.create(path, content);
    else await app.vault.modify(f, content);
    return f;
  };

  // Ensure Obsidian reloads the plugin after we rebuild `main.js`.
  await app.plugins.disablePlugin(pluginId);
  await app.plugins.enablePlugin(pluginId);
  await wait(250);

  const plugin = app?.plugins?.plugins?.[pluginId];
  assert(plugin, `plugin not found after reload: ${pluginId}`);
  const viewReady = await waitFor(
    () => app.viewRegistry.getViewCreatorByType?.("blp-journal-feed-view") ? true : null,
    { timeoutMs: 15000, stepMs: 50 }
  );
  assert(viewReady, "journal feed view was not registered after plugin reload.");

  let anchorFile = null;
  try {
    await ensureFolder(tmpFolder);
    if (baseFolder) await ensureFolder(baseFolder);

    const marker0 = `blp-journal-feed-subfolders-day0-${Date.now()}`;
    const marker1 = `blp-journal-feed-subfolders-day1-${Date.now()}`;

    await upsert(day0Path, `# day0\n\n${marker0}\n`);
    await upsert(day1Path, `# day1\n\n${marker1}\n`);
    await upsert(day2Path, `# day2\n\n`);

    const anchorContent = [
      "---",
      "blp_journal_view: true",
      "blp_journal_initial_days: 3",
      "---",
      "",
      "# Journal Feed Anchor (Subfolders)",
      "",
    ].join("\n");
    anchorFile = await upsert(anchorPath, anchorContent);

    const openLeaf = app.workspace.getLeaf(true);
    await openLeaf.openFile(anchorFile);

    const opened = await waitFor(
      () => openLeaf?.view?.getViewType?.() === "blp-journal-feed-view" ? true : null,
      { timeoutMs: 15000, stepMs: 50 }
    );
    assert(opened, `anchor did not open journal feed view. got=${openLeaf?.view?.getViewType?.()}`);

    const view = openLeaf.view;
    const hasSections = await waitFor(() => Array.isArray(view.sections) && view.sections.length >= 3 ? true : null, {
      timeoutMs: 15000,
      stepMs: 50,
    });
    assert(hasSections, "journal feed did not create enough day sections.");

    const paths = view.sections.slice(0, 3).map((s) => s?.file?.path ?? null);
    const expected = [day0Path, day1Path, day2Path];
    for (const p of expected) {
      assert(paths.includes(p), `expected daily note in sections: ${p}. got=${JSON.stringify(paths)}`);
    }

    return { ok: true, format, baseFolder, expected, got: paths };
  } finally {
    try {
      if (origGetFolder) inst.getFolder = origGetFolder;
      if (origGetFormat) inst.getFormat = origGetFormat;
    } catch {
      // ignore
    }

    // Best-effort cleanup (keep failures non-fatal).
    try {
      const del = async (p) => {
        const f = app.vault.getAbstractFileByPath(p);
        if (f) await app.vault.delete(f, true);
      };
      await del(day0Path);
      await del(day1Path);
      await del(day2Path);
      if (anchorFile) await del(anchorPath);
    } catch {
      // ignore
    }
  }
})();
