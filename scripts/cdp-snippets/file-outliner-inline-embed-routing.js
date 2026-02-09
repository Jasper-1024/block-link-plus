// CDP regression: file-outliner routing MUST NOT break InlineEditEngine embeds.
//
// Run:
//   node scripts/obsidian-cdp.js eval-file "scripts/cdp-snippets/file-outliner-inline-embed-routing.js"
//
// Assertion:
// - InlineEditEngine takeover works BOTH when routing is ON and OFF.
// - Regression: routing=ON used to prevent takeover (no `blp-inline-edit-active`).

(async () => {
  const wait = (ms) => new Promise((r) => setTimeout(r, ms));
  const assert = (cond, msg) => {
    if (!cond) throw new Error(msg);
  };

  const pluginId = "block-link-plus";
  const tmpFolder = "_blp_tmp";

  const srcPath = `${tmpFolder}/outliner-src.md`;
  const normalPath = `${tmpFolder}/normal-embed.md`;

  const embedSrcAttr = `${tmpFolder}/outliner-src#^child`;
  const embedLink = `![[${tmpFolder}/outliner-src#^child]]`;

  const now = "2026-02-06T00:00:00";
  const srcContent = [
    "---",
    "blp_outliner: true",
    "---",
    "",
    "- parent",
    "  - child",
    `    [date:: ${now}] [updated:: ${now}] [blp_sys:: 1] [blp_ver:: 2] ^child`,
    "  ",
    `  [date:: ${now}] [updated:: ${now}] [blp_sys:: 1] [blp_ver:: 2] ^parent`,
    "",
  ].join("\n");

  const normalContent = ["# normal", "", "embed:", embedLink, ""].join("\n");

  const waitFor = async (fn, { timeoutMs = 8000, stepMs = 50 } = {}) => {
    const t0 = Date.now();
    while (Date.now() - t0 < timeoutMs) {
      const v = fn();
      if (v) return v;
      await wait(stepMs);
    }
    return null;
  };

  // Ensure Obsidian reloads the plugin after we rebuild `main.js`.
  await app.plugins.disablePlugin(pluginId);
  await app.plugins.enablePlugin(pluginId);
  await wait(250);

  const plugin = app?.plugins?.plugins?.[pluginId];
  assert(plugin, `plugin not found after reload: ${pluginId}`);

  const prevEnabledFiles = Array.isArray(plugin.settings?.fileOutlinerEnabledFiles)
    ? [...plugin.settings.fileOutlinerEnabledFiles]
    : [];
  const prevRouting = plugin.settings.fileOutlinerViewEnabled;
  const prevInlineEditEnabled = plugin.settings.inlineEditEnabled;
  const prevInlineEditBlock = plugin.settings.inlineEditBlock;
  const prevActivePath = app.workspace.getActiveFile?.()?.path ?? null;

  try {
    try {
      if (!app.vault.getAbstractFileByPath(tmpFolder)) await app.vault.createFolder(tmpFolder);
    } catch {
      // ignore
    }

    const upsert = async (path, content) => {
      let f = app.vault.getAbstractFileByPath(path);
      if (!f) f = await app.vault.create(path, content);
      else await app.vault.modify(f, content);
      return f;
    };

    await upsert(srcPath, srcContent);
    await upsert(normalPath, normalContent);

    // Make scope deterministic (embedded file is in outliner scope).
    plugin.settings.fileOutlinerEnabledFiles = Array.from(new Set([...prevEnabledFiles, srcPath]));
    // Ensure InlineEditEngine is enabled.
    plugin.settings.inlineEditEnabled = true;
    plugin.settings.inlineEditBlock = true;
    await plugin.saveSettings();

    // Ensure metadata cache can resolve the block id for InlineEditEngine.
    await app.workspace.getLeaf(false).setViewState({
      type: "markdown",
      state: { file: srcPath, mode: "source" },
      active: true,
    });
    await waitFor(() => {
      const cache = app.metadataCache.getCache(srcPath);
      return cache?.blocks?.child ? true : null;
    });

    const inspect = async (label) => {
      await app.workspace.getLeaf(false).setViewState({
        type: "markdown",
        state: { file: normalPath, mode: "source" },
        active: true,
      });

      const embedEl = await waitFor(() => {
        const view = app.workspace.activeLeaf?.view;
        const el = view?.containerEl?.querySelector(`.internal-embed.markdown-embed[src="${embedSrcAttr}"]`);
        if (!el) return null;
        if (!el.classList.contains("blp-inline-edit-active")) return null;
        if (!el.querySelector(".markdown-source-view")) return null;
        return el;
      }, { timeoutMs: 8000, stepMs: 50 });

      const cls = embedEl?.className ?? null;
      const hasOutlinerView = embedEl ? Boolean(embedEl.querySelector(".blp-file-outliner-view")) : null;
      const surface = embedEl?.querySelector(".markdown-source-view") ?? null;
      const text = (surface?.innerText ?? "").trim();

      return { label, fileOutlinerViewEnabled: plugin.settings.fileOutlinerViewEnabled, ok: !!embedEl, cls, hasOutlinerView, textLen: text.length, textHead: text.slice(0, 140) };
    };

    // Round A: routing ON (regression target).
    plugin.settings.fileOutlinerViewEnabled = true;
    await plugin.saveSettings();
    await wait(250);
    const on = await inspect("routing=ON");

    // Round B: routing OFF (baseline should still work).
    plugin.settings.fileOutlinerViewEnabled = false;
    await plugin.saveSettings();
    await wait(250);
    const off = await inspect("routing=OFF");

    assert(on.ok, `routing=ON: expected InlineEditEngine takeover, got cls=${String(on.cls)} textLen=${on.textLen}`);
    assert(off.ok, `routing=OFF: expected InlineEditEngine takeover, got cls=${String(off.cls)} textLen=${off.textLen}`);
    assert(on.hasOutlinerView === false, "routing=ON: embed mounted file-outliner view (expected MarkdownView)");
    assert(off.hasOutlinerView === false, "routing=OFF: embed mounted file-outliner view (expected MarkdownView)");
    assert(on.textLen > 0, "routing=ON: InlineEditEngine surface is blank");
    assert(off.textLen > 0, "routing=OFF: InlineEditEngine surface is blank");

    return { ok: true, results: [on, off] };
  } finally {
    try {
      plugin.settings.fileOutlinerEnabledFiles = prevEnabledFiles;
      plugin.settings.fileOutlinerViewEnabled = prevRouting;
      plugin.settings.inlineEditEnabled = prevInlineEditEnabled;
      plugin.settings.inlineEditBlock = prevInlineEditBlock;
      await plugin.saveSettings();
    } catch {
      // ignore
    }

    try {
      if (prevActivePath) {
        const prev = app.vault.getAbstractFileByPath(prevActivePath);
        if (prev) await app.workspace.getLeaf(false).openFile(prev);
      }
    } catch {
      // ignore
    }

    try {
      const f1 = app.vault.getAbstractFileByPath(normalPath);
      if (f1) await app.vault.delete(f1);
      const f2 = app.vault.getAbstractFileByPath(srcPath);
      if (f2) await app.vault.delete(f2);
    } catch {
      // ignore
    }
  }
})();
