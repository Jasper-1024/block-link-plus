// CDP regression: Journal Feed embedded Outliner layout should flatten nested leaf chrome
// and keep a compact left gutter inside the day card.
//
// Run:
//   $env:OB_CDP_PORT='9223'; $env:OB_CDP_TITLE_CONTAINS='blp'; node scripts/obsidian-cdp.js eval-file "scripts/cdp-snippets/journal-feed-mobile-embedded-layout.js"

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
  const anchorPath = `${tmpFolder}/journal-feed-mobile-layout-anchor.md`;

  const dailyPlugin = app?.internalPlugins?.getPluginById?.("daily-notes");
  assert(dailyPlugin?.enabled === true, "Daily Notes internal plugin is disabled.");
  const inst = dailyPlugin.instance;
  assert(inst && typeof inst.iterateDailyNotes === "function", "Daily Notes instance is missing iterateDailyNotes.");

  const moment = window.moment;
  assert(moment && typeof moment === "function", "moment() not available on window.");

  const folderObj = inst.getFolder?.();
  const folderPath = folderObj?.path ?? (typeof folderObj === "string" ? folderObj : "");
  const format = inst.getFormat?.() || "YYYY-MM-DD";
  const normalizeFolder = (p) => String(p || "").replace(/\/+$/, "");
  const baseFolder = normalizeFolder(folderPath);

  const makeDailyPath = (daysAgo) => {
    const dateStr = moment().startOf("day").subtract(daysAgo, "day").format(format);
    return baseFolder ? `${baseFolder}/${dateStr}.md` : `${dateStr}.md`;
  };

  const outlinerPath = makeDailyPath(0);
  const markdownPath = makeDailyPath(1);
  const plugin = app?.plugins?.plugins?.[pluginId];
  assert(plugin, `plugin not found: ${pluginId}`);

  const prevEnabledFiles = Array.isArray(plugin.settings?.fileOutlinerEnabledFiles)
    ? [...plugin.settings.fileOutlinerEnabledFiles]
    : [];

  const upsert = async (path, content) => {
    let f = app.vault.getAbstractFileByPath(path);
    if (!f) f = await app.vault.create(path, content);
    else await app.vault.modify(f, content);
    return f;
  };

  const ensureFolderChain = async (folderPath) => {
    const normalized = String(folderPath || "").replace(/^\/+|\/+$/g, "");
    if (!normalized) return;
    const parts = normalized.split("/").filter(Boolean);
    let current = "";
    for (const part of parts) {
      current = current ? `${current}/${part}` : part;
      if (app.vault.getAbstractFileByPath(current)) continue;
      try {
        await app.vault.createFolder(current);
      } catch {
        // ignore
      }
    }
  };

  try {
    await app.plugins.disablePlugin(pluginId);
    await app.plugins.enablePlugin(pluginId);
    await wait(250);

    await ensureFolderChain(tmpFolder);
    await ensureFolderChain(baseFolder);
    await ensureFolderChain(outlinerPath.split("/").slice(0, -1).join("/"));
    await ensureFolderChain(markdownPath.split("/").slice(0, -1).join("/"));

    const outlinerContent = ["---", "blp_outliner: true", "---", "", "- alpha", "  - beta", "  - gamma", ""].join("\n");
    const markdownContent = ["# Plain markdown", "", "body"].join("\n");
    const anchorContent = [
      "---",
      "blp_journal_view: true",
      "blp_journal_initial_days: 2",
      "blp_journal_page_size: 2",
      "---",
      "",
      "# Journal Feed Mobile Layout Anchor",
      "",
    ].join("\n");

    const outlinerFile = await upsert(outlinerPath, outlinerContent);
    await upsert(markdownPath, markdownContent);
    const anchorFile = await upsert(anchorPath, anchorContent);

    const livePlugin = app?.plugins?.plugins?.[pluginId];
    assert(livePlugin, `plugin not found after reload: ${pluginId}`);
    livePlugin.settings.fileOutlinerEnabledFiles = Array.from(new Set([...prevEnabledFiles, outlinerFile.path]));
    await livePlugin.saveSettings();

    const leaf = app.workspace.getLeaf(true);
    await leaf.openFile(anchorFile);

    const view = await waitFor(
      () => (leaf.view?.getViewType?.() === "blp-journal-feed-view" ? leaf.view : null),
      { timeoutMs: 10000, stepMs: 50 }
    );
    assert(view, "anchor did not open Journal Feed view");

    await waitFor(() => (Array.isArray(view.sections) && view.sections.length >= 2 ? true : null), {
      timeoutMs: 10000,
      stepMs: 50,
    });
    assert(Array.isArray(view.sections) && view.sections.length >= 1, "journal feed did not create sections");

    const section = view.sections.find((s) => s?.renderMode === "outliner") ?? view.sections[0];
    assert(section?.renderMode === "outliner", "missing outliner section");

    await view.mountSectionEditor(section, { focus: false, bridge: false });
    await wait(200);

    const host = section.editorHostEl;
    const nestedHeader = host.querySelector(".view-header");
    const outlinerView = host.querySelector(".view-content.blp-file-outliner-view");
    const outlinerRoot = host.querySelector(".blp-file-outliner-root");
    const firstContentWrap = host.querySelector(".block-content-wrapper");

    assert(outlinerView, "missing embedded outliner view");
    assert(outlinerRoot, "missing embedded outliner root");
    assert(firstContentWrap, "missing first outliner content column");

    const dayRect = section.sectionEl.getBoundingClientRect();
    const firstContentRect = firstContentWrap.getBoundingClientRect();
    const firstContentLeftGap = Math.round(firstContentRect.left - dayRect.left);
    const nestedHeaderDisplay = nestedHeader ? getComputedStyle(nestedHeader).display : "missing";
    const outlinerViewStyle = getComputedStyle(outlinerView);
    const pseudoAfter = getComputedStyle(outlinerView, "::after");

    assert(nestedHeaderDisplay === "none", `expected nested header hidden, got ${nestedHeaderDisplay}`);
    assert(outlinerViewStyle.paddingLeft === "0px", `expected embedded outliner padding-left 0px, got ${outlinerViewStyle.paddingLeft}`);
    assert(outlinerViewStyle.paddingRight === "0px", `expected embedded outliner padding-right 0px, got ${outlinerViewStyle.paddingRight}`);
    assert(pseudoAfter.height === "0px", `expected embedded outliner tail spacer height 0px, got ${pseudoAfter.height}`);
    assert(firstContentLeftGap <= 60, `expected compact left gutter <= 60px, got ${firstContentLeftGap}px`);

    return {
      ok: true,
      sectionPath: section.file?.path ?? null,
      viewport: {
        innerWidth: window.innerWidth,
        innerHeight: window.innerHeight,
        media640: matchMedia("(max-width: 640px)").matches,
      },
      metrics: {
        nestedHeaderDisplay,
        outlinerPaddingLeft: outlinerViewStyle.paddingLeft,
        outlinerPaddingRight: outlinerViewStyle.paddingRight,
        afterHeight: pseudoAfter.height,
        firstContentLeftGap,
      },
    };
  } finally {
    try {
      const livePlugin = app?.plugins?.plugins?.[pluginId];
      if (!livePlugin) return;
      livePlugin.settings.fileOutlinerEnabledFiles = prevEnabledFiles;
      await livePlugin.saveSettings();
    } catch {
      // ignore
    }
  }
})();
