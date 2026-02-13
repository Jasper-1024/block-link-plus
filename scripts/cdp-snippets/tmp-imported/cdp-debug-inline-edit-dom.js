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

  const now0 = "2026-02-06T00:00:00";
  const now1 = "2026-02-06T00:00:01";
  const now2 = "2026-02-06T00:00:02";

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
    `  [date:: ${now0}] [updated:: ${now0}] [blp_sys:: 1] [blp_ver:: 2] ^dummy`,
    "",
  ].join("\n");

  const normalContent = ["# normal", "", "embed:", embedLink, ""].join("\n");

  // Reload plugin
  await app.plugins.disablePlugin(pluginId);
  await app.plugins.enablePlugin(pluginId);
  await wait(250);

  const plugin = app?.plugins?.plugins?.[pluginId];
  if (!plugin) throw new Error(`Plugin not found after reload: ${pluginId}`);

  // Ensure folder.
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

  // Settings aligned with regression snippet.
  const prevEnabledFiles = Array.isArray(plugin.settings?.fileOutlinerEnabledFiles)
    ? [...plugin.settings.fileOutlinerEnabledFiles]
    : [];
  plugin.settings.fileOutlinerEnabledFiles = Array.from(new Set([...prevEnabledFiles, srcPath]));
  plugin.settings.fileOutlinerViewEnabled = true;
  plugin.settings.inlineEditEnabled = true;
  plugin.settings.inlineEditBlock = true;
  plugin.settings.fileOutlinerHideSystemLine = true;
  await plugin.saveSettings();

  // Wait metadata cache sees outliner frontmatter.
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

  // Open normal note.
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
    return el;
  });

  if (!embedEl) {
    return { ok: false, reason: "embed-not-active" };
  }

  const sourceView = await waitFor(() => {
    const sv = embedEl.querySelector(".markdown-source-view");
    return sv ? sv : null;
  }, { timeoutMs: 6000, stepMs: 50 });

  const contentEl = embedEl.querySelector(".markdown-embed-content");
  const dvKeys = embedEl.querySelectorAll(
    '.dataview.inline-field-key[data-dv-key="blp_sys"], .dataview.inline-field-key[data-dv-norm-key="blp_sys"]'
  ).length;
  const text = (embedEl.innerText ?? "").trim().slice(0, 260);
  const htmlHead = (embedEl.outerHTML ?? "").slice(0, 700);

  return {
    ok: true,
    hasSourceView: !!sourceView,
    hasContentEl: !!contentEl,
    dvKeys,
    text,
    htmlHead,
  };
})();
