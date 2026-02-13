// Validate lazy display rendering (visible area + buffer) for the file-level outliner view.
// Run: node scripts/obsidian-cdp.js eval-file "scripts/cdp-snippets/file-outliner-lazy-display-render.js"

(async () => {
  const wait = (ms) => new Promise((r) => setTimeout(r, ms));
  const waitFor = async (cond, { timeoutMs = 4000, intervalMs = 50 } = {}) => {
    const start = Date.now();
    while (Date.now() - start < timeoutMs) {
      try {
        if (cond()) return true;
      } catch {
        // ignore
      }
      await wait(intervalMs);
    }
    return false;
  };

  const pluginId = "block-link-plus";
  const tmpFolder = "_blp_tmp";
  const tmpPath = `${tmpFolder}/file-outliner-lazy-display-render.md`;

  // Ensure Obsidian reloads the plugin after we rebuild `main.js`.
  await app.plugins.disablePlugin(pluginId);
  await app.plugins.enablePlugin(pluginId);
  await wait(250);

  const plugin = app?.plugins?.plugins?.[pluginId];
  if (!plugin) throw new Error(`Plugin not found after reload: ${pluginId}`);

  // Wait for the view type to be registered.
  await waitFor(() => typeof app.viewRegistry?.viewByType?.["blp-file-outliner-view"] === "function", {
    timeoutMs: 5000,
    intervalMs: 50,
  });

  const prevSettingsEnabledFiles = Array.isArray(plugin.settings?.fileOutlinerEnabledFiles)
    ? [...plugin.settings.fileOutlinerEnabledFiles]
    : [];
  const prevRouting = plugin.settings.fileOutlinerViewEnabled;

  try {
    // Ensure folder.
    try {
      if (!app.vault.getAbstractFileByPath(tmpFolder)) {
        await app.vault.createFolder(tmpFolder);
      }
    } catch {
      // ignore
    }

    const now = "2026-02-03T00:00:00";
    const lines = ["---", "blp_outliner: true", "---", ""];
    for (let i = 0; i < 220; i++) {
      const id = `lr${String(i).padStart(3, "0")}`;
      lines.push(`- block ${i} **bold** \\\\ backslash`);
      lines.push(`  [date:: ${now}] [updated:: ${now}] [blp_sys:: 1] [blp_ver:: 2] ^${id}`);
    }
    lines.push("");
    const content = lines.join("\n");

    // Create/overwrite the temp note.
    let f = app.vault.getAbstractFileByPath(tmpPath);
    if (!f) {
      f = await app.vault.create(tmpPath, content);
    } else {
      await app.vault.modify(f, content);
    }

    // Deterministic routing.
    plugin.settings.fileOutlinerEnabledFiles = Array.from(new Set([...prevSettingsEnabledFiles, tmpPath]));
    plugin.settings.fileOutlinerViewEnabled = true;
    await plugin.saveSettings();

    const leaf = app.workspace.getLeaf(false);
    await leaf.openFile(f, { active: true });

    await waitFor(() => leaf.view?.getViewType?.() === "blp-file-outliner-view", {
      timeoutMs: 5000,
      intervalMs: 50,
    });

    const view = leaf?.view;
    if (!view || view.getViewType?.() !== "blp-file-outliner-view") {
      return { ok: false, step: "open", viewType: view?.getViewType?.() ?? null };
    }

    // Patch render counter.
    window.__blpLazyRenderDebug = { renderCalls: 0 };
    const origRender = view.renderBlockDisplay?.bind(view);
    if (typeof origRender !== "function") throw new Error("renderBlockDisplay missing on view");
    view.renderBlockDisplay = (id) => {
      window.__blpLazyRenderDebug.renderCalls++;
      return origRender(id);
    };

    // Force rebuild to measure from a clean state.
    view.render?.({ forceRebuild: true });
    await wait(300);

    const root = view.contentEl.querySelector(".blp-file-outliner-root") || view.contentEl;
    const blocksHost = root.querySelector(".blp-file-outliner-blocks") || root;

    await wait(600);
    const totalBlocks = blocksHost.querySelectorAll(".ls-block").length;
    const markdownRendered1 = blocksHost.querySelectorAll(".markdown-rendered").length;
    const renderCalls1 = window.__blpLazyRenderDebug.renderCalls;

    // Scroll near the bottom and wait for additional renders.
    view.contentEl.scrollTop = Math.max(0, view.contentEl.scrollHeight - view.contentEl.clientHeight - 8);
    // Programmatic scrollTop updates do not always emit a scroll event (especially when the doc is hidden).
    view.contentEl.dispatchEvent(new Event("scroll"));
    await wait(900);

    const markdownRendered2 = blocksHost.querySelectorAll(".markdown-rendered").length;
    const renderCalls2 = window.__blpLazyRenderDebug.renderCalls;

    return {
      ok: true,
      counts: {
        totalBlocks,
        markdownRendered1,
        markdownRendered2,
        renderCalls1,
        renderCalls2,
      },
      invariant: {
        lazyEvidence: {
          initialNotAllMarkdownRendered: markdownRendered1 < totalBlocks,
          scrollCausesMoreRenders: markdownRendered2 > markdownRendered1 || renderCalls2 > renderCalls1,
        },
      },
    };
  } finally {
    try {
      plugin.settings.fileOutlinerEnabledFiles = prevSettingsEnabledFiles;
      plugin.settings.fileOutlinerViewEnabled = prevRouting;
      await plugin.saveSettings();
    } catch {
      // ignore
    }

    try {
      const f = app.vault.getAbstractFileByPath(tmpPath);
      if (f) await app.vault.delete(f);
    } catch {
      // ignore
    }
  }
})();
