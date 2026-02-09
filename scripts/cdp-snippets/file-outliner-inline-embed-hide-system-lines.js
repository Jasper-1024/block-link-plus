// CDP regression: outliner v2 system tail lines MUST be hidden in embeds.
//
// Run:
//   node scripts/obsidian-cdp.js eval-file "scripts/cdp-snippets/file-outliner-inline-embed-hide-system-lines.js"
//
// Covers:
// 1) Live Preview inline-edit embed (`![[file#^id]]`) does not expose `blp_sys` tail line text.
// 2) Outliner view block display embeds do not expose `blp_sys` tail line text.
// 3) Clicking an embed inside outliner view does NOT force the host block into edit mode.

(async () => {
  const wait = (ms) => new Promise((r) => setTimeout(r, ms));
  const assert = (cond, msg) => {
    if (!cond) throw new Error(msg);
  };

  const pluginId = "block-link-plus";
  const tmpFolder = "_blp_tmp";

  const srcPath = `${tmpFolder}/outliner-src.md`;
  const normalPath = `${tmpFolder}/normal-embed.md`;
  const outlinerEmbedPath = `${tmpFolder}/outliner-embed.md`;

  const embedSrcAttr = `${tmpFolder}/outliner-src#^child`;
  const embedLink = `![[${tmpFolder}/outliner-src#^child]]`;

  const now0 = "2026-02-06T00:00:00";
  const now1 = "2026-02-06T00:00:01";
  const now2 = "2026-02-06T00:00:02";
  const now3 = "2026-02-06T00:00:03";

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
    `  [date:: ${now3}] [updated:: ${now3}] [blp_sys:: 1] [blp_ver:: 2] ^sib`,
    "",
    `  [date:: ${now0}] [updated:: ${now0}] [blp_sys:: 1] [blp_ver:: 2] ^dummy`,
    "",
  ].join("\n");

  const normalContent = ["# normal", "", "embed:", embedLink, ""].join("\n");

  const outlinerEmbedContent = [
    "---",
    "blp_outliner: true",
    "---",
    "",
    `- host ${embedLink}`,
    `  [date:: ${now1}] [updated:: ${now1}] [blp_sys:: 1] [blp_ver:: 2] ^host`,
    "",
  ].join("\n");

  const waitFor = async (fn, { timeoutMs = 8000, stepMs = 50 } = {}) => {
    const t0 = Date.now();
    while (Date.now() - t0 < timeoutMs) {
      const v = fn();
      if (v) return v;
      await wait(stepMs);
    }
    return null;
  };

  const findSysMarkers = (rootEl) => {
    const dvKeys = rootEl.querySelectorAll(
      '.dataview.inline-field-key[data-dv-key="blp_sys"], .dataview.inline-field-key[data-dv-norm-key="blp_sys"]'
    ).length;
    const t = (rootEl.innerText ?? "").toLowerCase();
    const textHits = (t.match(/blp_sys|blp_ver|\\bupdated\\b|\\bdate\\b/g) || []).length;
    return { dvKeys, textHits, textHead: (rootEl.innerText ?? "").trim().slice(0, 140) };
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
  const prevHideSys = plugin.settings.fileOutlinerHideSystemLine;
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
    const outlinerEmbedFile = await upsert(outlinerEmbedPath, outlinerEmbedContent);

    // Deterministic routing + inline edit.
    plugin.settings.fileOutlinerEnabledFiles = Array.from(new Set([...prevEnabledFiles, srcPath, outlinerEmbedPath]));
    plugin.settings.fileOutlinerViewEnabled = true;
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

    // --- 1) Live Preview inline embed should not show system tail tokens.
    await app.workspace.getLeaf(false).setViewState({
      type: "markdown",
      state: { file: normalPath, mode: "source" },
      active: true,
    });

    const normalEmbed = await waitFor(() => {
      const view = app.workspace.activeLeaf?.view;
      const el = view?.containerEl?.querySelector(`.internal-embed.markdown-embed[src="${embedSrcAttr}"]`);
      if (!el) return null;
      if (!el.classList.contains("blp-inline-edit-active")) return null;
      // Wait until the embedded MarkdownView is actually present.
      if (!el.querySelector(".markdown-source-view")) return null;
      return el;
    });
    assert(normalEmbed, "missing inline-edit embed surface in normal Live Preview note");

    const normalMarkers = findSysMarkers(normalEmbed);
    assert(
      normalMarkers.dvKeys === 0 && normalMarkers.textHits === 0,
      `system line leak in inline embed: dvKeys=${normalMarkers.dvKeys} textHits=${normalMarkers.textHits} text=${JSON.stringify(
        normalMarkers.textHead
      )}`
    );

    // --- 2) Outliner view embed should not show system tail tokens.
    await app.workspace.getLeaf(false).openFile(outlinerEmbedFile);
    await wait(250);

    const outlinerView = app.workspace.activeLeaf?.view;
    const outlinerViewType = outlinerView?.getViewType?.() ?? null;
    assert(
      outlinerViewType === "blp-file-outliner-view",
      `expected outliner view type, got ${String(outlinerViewType)}`
    );

    const outlinerEmbed = await waitFor(() =>
      outlinerView.contentEl.querySelector(`.markdown-embed[src="${embedSrcAttr}"]`)
    );
    assert(outlinerEmbed, "missing embed inside outliner view block display");

    const outlinerMarkers = findSysMarkers(outlinerEmbed);
    assert(
      outlinerMarkers.dvKeys === 0 && outlinerMarkers.textHits === 0,
      `system line leak in outliner embed: dvKeys=${outlinerMarkers.dvKeys} textHits=${outlinerMarkers.textHits} text=${JSON.stringify(
        outlinerMarkers.textHead
      )}`
    );

    // --- 3) Clicking the embed should NOT enter edit mode on the host block.
    try {
      if (outlinerView.editingId) outlinerView.exitEditMode?.(outlinerView.editingId);
    } catch {
      // ignore
    }
    await wait(50);
    assert(outlinerView.editingId == null, `expected no active edit block before click, got ${String(outlinerView.editingId)}`);

    outlinerEmbed.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    await wait(120);
    assert(
      outlinerView.editingId == null,
      `click-to-edit leak: clicking embed forced edit mode (editingId=${String(outlinerView.editingId)})`
    );

    return { ok: true };
  } finally {
    try {
      plugin.settings.fileOutlinerEnabledFiles = prevEnabledFiles;
      plugin.settings.fileOutlinerViewEnabled = prevRouting;
      plugin.settings.inlineEditEnabled = prevInlineEditEnabled;
      plugin.settings.inlineEditBlock = prevInlineEditBlock;
      plugin.settings.fileOutlinerHideSystemLine = prevHideSys;
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
      const f1 = app.vault.getAbstractFileByPath(outlinerEmbedPath);
      if (f1) await app.vault.delete(f1);
      const f2 = app.vault.getAbstractFileByPath(normalPath);
      if (f2) await app.vault.delete(f2);
      const f3 = app.vault.getAbstractFileByPath(srcPath);
      if (f3) await app.vault.delete(f3);
    } catch {
      // ignore
    }
  }
})();
