// Debug helper: inspect the DOM that MarkdownRenderer produces for `![[file#^id]]` embeds
// inside the File Outliner View (v2).
//
// Run:
//   node scripts/obsidian-cdp.js eval-file "scripts/cdp-snippets/debug-outliner-embed-dom.js"

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
  const assert = (cond, msg) => {
    if (!cond) throw new Error(msg);
  };

  const pluginId = "block-link-plus";
  const tmpFolder = "_blp_tmp";
  const srcPath = `${tmpFolder}/outliner-src.md`;
  const outlinerEmbedPath = `${tmpFolder}/outliner-embed.md`;

  const embedSrcAttr = `${tmpFolder}/outliner-src#^child`;
  const embedLink = `![[${embedSrcAttr}]]`;

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
    "",
    `  [date:: ${now1}] [updated:: ${now1}] [blp_sys:: 1] [blp_ver:: 2] ^parent`,
    "",
  ].join("\n");

  const outlinerEmbedContent = [
    "---",
    "blp_outliner: true",
    "---",
    "",
    `- host ${embedLink}`,
    `  [date:: ${now1}] [updated:: ${now1}] [blp_sys:: 1] [blp_ver:: 2] ^host`,
    "",
  ].join("\n");

  await app.plugins.disablePlugin(pluginId);
  await app.plugins.enablePlugin(pluginId);
  await wait(250);

  const plugin = app?.plugins?.plugins?.[pluginId];
  assert(plugin, `plugin not found after reload: ${pluginId}`);

  const prevEnabledFiles = Array.isArray(plugin.settings?.fileOutlinerEnabledFiles)
    ? [...plugin.settings.fileOutlinerEnabledFiles]
    : [];
  const prevRouting = plugin.settings.fileOutlinerViewEnabled;
  const prevHideSys = plugin.settings.fileOutlinerHideSystemLine;

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
    const outlinerEmbedFile = await upsert(outlinerEmbedPath, outlinerEmbedContent);

    plugin.settings.fileOutlinerEnabledFiles = Array.from(new Set([...prevEnabledFiles, srcPath, outlinerEmbedPath]));
    plugin.settings.fileOutlinerViewEnabled = true;
    plugin.settings.fileOutlinerHideSystemLine = true;
    await plugin.saveSettings();

    await app.workspace.getLeaf(false).openFile(outlinerEmbedFile);
    await wait(300);

    const outlinerView = app.workspace.activeLeaf?.view;
    assert(outlinerView?.getViewType?.() === "blp-file-outliner-view", "expected outliner view");

    const embedEl = await waitFor(() =>
      outlinerView.contentEl.querySelector(`.markdown-embed[src="${embedSrcAttr}"]`)
    );
    assert(embedEl, "missing embed inside outliner view block display");

    const sample = (sel) => Array.from(embedEl.querySelectorAll(sel)).slice(0, 5).map((el) => ({
      tag: el.tagName,
      className: el.className,
      text: (el.textContent ?? "").trim().slice(0, 80),
      attrs: (() => {
        const out = {};
        for (const a of Array.from(el.attributes ?? [])) out[a.name] = a.value;
        return out;
      })(),
    }));

    const sampleText = (needle) =>
      Array.from(embedEl.querySelectorAll("*"))
        .filter((el) => String(el.textContent || "").includes(needle))
        .slice(0, 5)
        .map((el) => ({
          tag: el.tagName,
          className: el.className,
          text: (el.textContent ?? "").trim().slice(0, 120),
          attrs: (() => {
            const out = {};
            for (const a of Array.from(el.attributes ?? [])) out[a.name] = a.value;
            return out;
          })(),
        }));

    const sampleSmallest = (needle) =>
      Array.from(embedEl.querySelectorAll("*"))
        .filter((el) => String(el.textContent || "").includes(needle))
        .sort((a, b) => (a.textContent ?? "").length - (b.textContent ?? "").length)
        .slice(0, 3)
        .map((el) => ({
          tag: el.tagName,
          className: el.className,
          text: (el.textContent ?? "").trim().slice(0, 120),
          outerHTML: (el.outerHTML ?? "").slice(0, 240),
        }));

    const hasClasses = (needle) =>
      Array.from(embedEl.querySelectorAll("*")).some((el) => String(el.className || "").includes(needle));

    return {
      ok: true,
      embedTextHead: (embedEl.innerText ?? "").trim().slice(0, 220),
      counts: {
        dataview: embedEl.querySelectorAll(".dataview").length,
        inlineFieldKey: embedEl.querySelectorAll(".inline-field-key").length,
        dvInlineFieldKey: embedEl.querySelectorAll(".dataview.inline-field-key").length,
        br: embedEl.querySelectorAll("br").length,
        metadata: embedEl.querySelectorAll('[class*=\"metadata\"], [class*=\"property\"], [data-property-key]').length,
      },
      has: {
        dataviewInlineFieldKey: hasClasses("inline-field-key"),
        dv: hasClasses("dataview"),
        mdProp: hasClasses("metadata"),
      },
      samples: {
        dataviewKeyNodes: sample(".dataview.inline-field-key, .inline-field-key"),
        anyDataview: sample(".dataview"),
        blpSysTextNodes: sampleText("blp_sys"),
        blpSysSmallestNodes: sampleSmallest("blp_sys"),
      },
    };
  } finally {
    try {
      plugin.settings.fileOutlinerEnabledFiles = prevEnabledFiles;
      plugin.settings.fileOutlinerViewEnabled = prevRouting;
      plugin.settings.fileOutlinerHideSystemLine = prevHideSys;
      await plugin.saveSettings();
    } catch {
      // ignore
    }
  }
})();
