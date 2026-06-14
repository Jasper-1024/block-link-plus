// CDP smoke: Journal Feed must hide outliner system tail lines in the embedded editors.
//
// Run:
//   $env:OB_CDP_PORT=19225; $env:OB_CDP_TITLE_CONTAINS=' - blp - '; node scripts/obsidian-cdp.js eval-file "scripts/cdp-snippets/journal-feed-systemline-hide-smoke.js"

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
  const anchorPath = `${tmpFolder}/journal-feed-anchor-systemline-hide.md`;

  const dailyPlugin = app?.internalPlugins?.getPluginById?.("daily-notes");
  assert(dailyPlugin?.enabled === true, "Daily Notes internal plugin is disabled.");
  const inst = dailyPlugin.instance;
  assert(inst && typeof inst.getFormat === "function", "Daily Notes instance missing getFormat().");

  const moment = window.moment;
  assert(moment && typeof moment === "function", "moment() not available on window.");

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

  const upsert = async (path, content) => {
    await ensureParentFolder(path);
    let f = app.vault.getAbstractFileByPath(path);
    if (!f) f = await app.vault.create(path, content);
    else await app.vault.modify(f, content);
    return f;
  };

  const del = async (p) => {
    const f = app.vault.getAbstractFileByPath(p);
    if (f) await app.vault.delete(f, true);
  };

  // Ensure Obsidian reloads the plugin after we rebuild `main.js`.
  await app.plugins.disablePlugin(pluginId);
  await app.plugins.enablePlugin(pluginId);
  await wait(250);

  const plugin = app?.plugins?.plugins?.[pluginId];
  assert(plugin, `plugin not found after reload: ${pluginId}`);

  let anchorFile = null;
  try {
    await ensureFolder(tmpFolder);
    if (baseFolder) await ensureFolder(baseFolder);

    const sysLine = "  [date:: 2026-04-08T00:00:00] [updated:: 2026-04-08T00:00:00] [blp_sys:: 1] [blp_ver:: 2] ^child";
    const day0Content = ["- child", sysLine, "", ""].join("\n");
    await upsert(day0Path, day0Content);

    const anchorContent = ["---", "blp_journal_view: true", "blp_journal_initial_days: 1", "---", "", "# Anchor", ""].join("\n");
    anchorFile = await upsert(anchorPath, anchorContent);

    const leaf = app.workspace.getLeaf(true);
    await leaf.openFile(anchorFile);

    const opened = await waitFor(() => (leaf?.view?.getViewType?.() === "blp-journal-feed-view" ? true : null), {
      timeoutMs: 15000,
      stepMs: 50,
    });
    assert(opened, `anchor did not open journal feed view. got=${leaf?.view?.getViewType?.()}`);

    const view = leaf.view;
    const hasSections = await waitFor(() => (Array.isArray(view.sections) && view.sections.length >= 1 ? true : null), {
      timeoutMs: 15000,
      stepMs: 50,
    });
    assert(hasSections, "journal feed did not create day sections.");

    await view.mountSectionEditor(view.sections[0], { focus: true, bridge: true });
    await wait(50);

    const embed = view.sections[0].embed;
    assert(embed?.view?.editor?.cm, "day0 embed editor is missing cm.");

    const docText = String(embed.view.editor.cm.state.doc.toString());
    const domText = String(embed.view.editor.cm.dom.textContent || "");

    assert(docText.includes("blp_sys:: 1"), "setup failed: doc does not include system line marker.");
    assert(!domText.includes("blp_sys:: 1"), `system line marker is still visible in DOM: ${domText}`);

    return { ok: true, day0Path, format, baseFolder };
  } finally {
    try {
      await del(day0Path);
      await del(anchorPath);
    } catch {
      // ignore
    }
  }
})();
