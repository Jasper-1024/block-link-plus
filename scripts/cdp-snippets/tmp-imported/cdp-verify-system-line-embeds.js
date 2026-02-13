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

  const embedLink = `![[${tmpFolder}/outliner-src#^child]]`;

  const normalContent = [
    "# normal",
    "",
    "embed:",
    embedLink,
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

  const waitFor = async (fn, { timeoutMs = 5000, stepMs = 50 } = {}) => {
    const t0 = Date.now();
    while (Date.now() - t0 < timeoutMs) {
      try {
        const v = fn();
        if (v) return v;
      } catch {
        // ignore
      }
      await wait(stepMs);
    }
    return null;
  };

  const openFileMode = async (path, mode) => {
    const af = app.vault.getAbstractFileByPath(path);
    assert(af, `missing file: ${path}`);
    await app.workspace.getLeaf(false).setViewState({ type: "markdown", state: { file: path, mode }, active: true });
    await wait(250);
    return app.workspace.activeLeaf?.view ?? null;
  };

  const summarizeEmbeds = (container) => {
    const embeds = Array.from(container.querySelectorAll(".markdown-embed, .internal-embed"));
    const out = [];
    for (const el of embeds) {
      const markdownContent = el.querySelector(".markdown-embed-content") || el;
      const it = (markdownContent instanceof HTMLElement ? markdownContent.innerText : "") || "";
      const hiddenTokens = el.querySelectorAll('span[data-blp-outliner-system-line-hidden="token"]').length;
      const hiddenEls = el.querySelectorAll('br[data-blp-outliner-system-line-hidden="el"]').length;
      const hasSysVisible = it.includes("[blp_sys::") || it.includes("[date::") || it.includes("[updated::");
      const hasSysText = (el.textContent || "").includes("blp_sys::");
      const src = el.getAttribute("src") || el.getAttribute("data-embed-link") || "";
      const cls = el.className || "";
      out.push({ cls, src, innerText: it.trim(), hasSysVisible, hasSysText, hiddenTokens, hiddenEls });
    }
    return out;
  };

  // Ensure plugin reload so state is consistent.
  await app.plugins.disablePlugin(pluginId);
  await app.plugins.enablePlugin(pluginId);
  await wait(300);

  const plugin = app?.plugins?.plugins?.[pluginId];
  assert(plugin, `plugin not found: ${pluginId}`);

  const prevEnabledFiles = Array.isArray(plugin.settings?.fileOutlinerEnabledFiles)
    ? [...plugin.settings.fileOutlinerEnabledFiles]
    : [];
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
    await upsert(outlinerEmbedPath, outlinerEmbedContent);

    // Make routing deterministic.
    plugin.settings.fileOutlinerEnabledFiles = Array.from(
      new Set([...prevEnabledFiles, srcPath, outlinerEmbedPath])
    );
    await plugin.saveSettings();

    // --- Round A: normal file in preview mode.
    const viewPreview = await openFileMode(normalPath, "preview");
    assert(viewPreview?.containerEl, "missing preview view container");
    await wait(800);
    const embedsPreview = summarizeEmbeds(viewPreview.containerEl);

    // --- Round B: normal file in source mode (Live Preview).
    const viewSource = await openFileMode(normalPath, "source");
    assert(viewSource?.containerEl, "missing source view container");
    await wait(1200);
    const embedsSource = summarizeEmbeds(viewSource.containerEl);

    // --- Round C: outliner view file with embed inside a block display.
    await app.workspace.getLeaf(false).openFile(app.vault.getAbstractFileByPath(outlinerEmbedPath));
    await wait(500);
    const outlinerView = app.workspace.activeLeaf?.view;
    const outlinerViewType = outlinerView?.getViewType?.() ?? null;

    let outlinerEmbeds = [];
    let clickResult = null;
    if (outlinerViewType === "blp-file-outliner-view") {
      await wait(600);
      outlinerEmbeds = summarizeEmbeds(outlinerView.contentEl);

      // Click the first markdown embed, see if it forces edit mode on the host block.
      const hostId = "host";
      const embedEl = outlinerView.contentEl.querySelector('.markdown-embed') || outlinerView.contentEl.querySelector('.internal-embed');
      if (embedEl) {
        try {
          if (outlinerView.editingId) outlinerView.exitEditMode?.(outlinerView.editingId);
        } catch {
          // ignore
        }
        await wait(50);
        embedEl.dispatchEvent(new MouseEvent('click', { bubbles: true }));
        await wait(120);
        const editingId = outlinerView.editingId ?? null;
        const doc = outlinerView.editorView?.state?.doc?.toString?.() ?? null;
        clickResult = { editingId, expectedHostId: hostId, docContainsEmbed: typeof doc === 'string' ? doc.includes('![[') : null, doc };
      }
    }

    return {
      ok: true,
      embedLink,
      rounds: {
        normalPreview: { viewType: viewPreview?.getViewType?.() ?? null, embeds: embedsPreview },
        normalSource: { viewType: viewSource?.getViewType?.() ?? null, embeds: embedsSource },
        outlinerEmbed: { viewType: outlinerViewType, embeds: outlinerEmbeds, clickResult },
      },
    };
  } finally {
    try {
      plugin.settings.fileOutlinerEnabledFiles = prevEnabledFiles;
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

    // Leave tmp files for manual inspection; user can delete.
  }
})();
