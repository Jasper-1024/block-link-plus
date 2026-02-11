// Debug helper: inspect inline-edit embed CM6 range/hideLine wiring.
//
// Run:
//   node scripts/obsidian-cdp.js eval-file "scripts/cdp-snippets/debug-inline-edit-system-line.js"
//
// This snippet is intentionally non-asserting; it returns diagnostic info for fixing
// system-line leaks in inline-edit embeds.

(async () => {
  const wait = (ms) => new Promise((r) => setTimeout(r, ms));
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

  const srcPath = `${tmpFolder}/outliner-src.md`;
  const normalPath = `${tmpFolder}/normal-embed.md`;

  const embedSrcAttr = `${tmpFolder}/outliner-src#^child`;
  const embedLink = `![[${tmpFolder}/outliner-src#^child]]`;

  const now2 = "2026-02-06T00:00:02";
  const now1 = "2026-02-06T00:00:01";

  const srcContent = [
    "---",
    "blp_outliner: true",
    "---",
    "",
    "- parent",
    "  - child",
    `    [date:: ${now2}] [updated:: ${now2}] [blp_sys:: 1] [blp_ver:: 2] ^child`,
    "  ",
    `  [date:: ${now1}] [updated:: ${now1}] [blp_sys:: 1] [blp_ver:: 2] ^parent`,
    "",
    "- sibling",
    `  [date:: ${now1}] [updated:: ${now1}] [blp_sys:: 1] [blp_ver:: 2] ^sib`,
    "",
  ].join("\n");

  const normalContent = ["# normal", "", "embed:", embedLink, ""].join("\n");

  // Ensure Obsidian reloads the plugin after we rebuild `main.js`.
  await app.plugins.disablePlugin(pluginId);
  await app.plugins.enablePlugin(pluginId);
  await wait(250);

  const plugin = app?.plugins?.plugins?.[pluginId];
  if (!plugin) return { ok: false, error: `plugin not found: ${pluginId}` };

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

    plugin.settings.inlineEditEnabled = true;
    plugin.settings.inlineEditBlock = true;
    plugin.settings.fileOutlinerHideSystemLine = true;
    await plugin.saveSettings();

    // Make scope deterministic: wait until metadata cache sees `blp_outliner: true`.
    await app.workspace.getLeaf(false).setViewState({
      type: "markdown",
      state: { file: srcPath, mode: "source" },
      active: true,
    });
    await waitFor(() => {
      const f = app.vault.getAbstractFileByPath(srcPath);
      const cache = f ? app.metadataCache.getFileCache(f) : null;
      return cache?.frontmatter?.blp_outliner === true ? true : null;
    }, { timeoutMs: 4000, stepMs: 50 });

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
      // Wait until the embedded MarkdownView is actually present.
      if (!el.querySelector(".markdown-source-view")) return null;
      return el;
    }, { timeoutMs: 8000, stepMs: 50 });
    if (!embedEl) return { ok: false, error: "embed not mounted" };

    const embeds = plugin.inlineEditEngine?.leaves?.getActiveEmbeds?.() ?? [];
    const cmDebug = embeds.map((e) => {
      const cm = e?.view?.editor?.cm;
      return {
        file: e?.file?.path ?? null,
        subpath: e?.subpath ?? null,
        hasCm: Boolean(cm),
        hasHideLine: cm?.__blpInlineEditHasHideLine ?? null,
        stateChanged: cm?.__blpInlineEditStateChanged ?? null,
        hideLineDecCount: cm?.__blpInlineEditHideLineDecCount ?? null,
        contentRange: cm?.__blpInlineEditContentRange ?? null,
        editableRange: cm?.__blpInlineEditEditableRange ?? null,
        resolvedVisibleRange: cm?.__blpInlineEditResolvedVisibleRange ?? null,
        resolvedEditableRange: cm?.__blpInlineEditResolvedEditableRange ?? null,
      };
    });

    const dvKeys = embedEl.querySelectorAll(
      '.dataview.inline-field-key[data-dv-key="blp_sys"], .dataview.inline-field-key[data-dv-norm-key="blp_sys"]'
    ).length;
    const t = (embedEl.innerText ?? "").toLowerCase();
    const textHits = (t.match(/blp_sys|blp_ver|\bupdated\b|\bdate\b/g) || []).length;

    return {
      ok: true,
      dvKeys,
      textHits,
      textHead: (embedEl.innerText ?? "").trim().slice(0, 220),
      activeEmbeds: embeds.length,
      cmDebug,
    };
  } finally {
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
