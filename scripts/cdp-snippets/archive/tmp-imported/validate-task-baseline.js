// CDP validation: Obsidian baseline behavior for task blocks + system tail line placement (A: tail-before-children).
// Run:
//   node scripts/obsidian-cdp.js eval-file ".tmp/validate-task-baseline.js"

(async () => {
  const wait = (ms) => new Promise((r) => setTimeout(r, ms));

  const pluginId = "block-link-plus";
  const tmpFolder = "_blp_tmp";
  const srcPath = `${tmpFolder}/task-baseline-src.md`;
  const embedPath = `${tmpFolder}/task-baseline-embed.md`;
  const srcLink = srcPath.replace(/\.md$/i, "");

  const pluginEnabled = !!app.plugins?.enabledPlugins?.has?.(pluginId);

  const now = "2026-02-10T00:00:00";

  let result = null;
  let step = "init";
  const prevActivePath = app.workspace.getActiveFile?.()?.path ?? null;
  let leafToClose = null;
  try {
    step = "ensure-folder";
    try {
      if (!app.vault.getAbstractFileByPath(tmpFolder)) {
        await app.vault.createFolder(tmpFolder);
      }
    } catch {
      // ignore
    }

    step = "write-files";
    const src = [
      "---",
      "title: task baseline src",
      "---",
      "",
      "- [ ] parent task",
      `  [date:: ${now}] [updated:: ${now}] [blp_sys:: 1] [blp_ver:: 2] ^p1aa`,
      "  continuation line: ok",
      "  \\- literal list marker line (escaped)",
      "  1\\. literal ordered marker line (escaped)",
      "  ## heading inside block (unescaped)",
      "  - child a",
      `    [date:: ${now}] [updated:: ${now}] [blp_sys:: 1] [blp_ver:: 2] ^c1aa`,
      "  - child b",
      `    [date:: ${now}] [updated:: ${now}] [blp_sys:: 1] [blp_ver:: 2] ^c2aa`,
      "",
    ].join("\n");

    const embed = [
      "---",
      "title: task baseline embed",
      "---",
      "",
      `![[${srcLink}#^p1aa]]`,
      "",
    ].join("\n");

    let srcFile = app.vault.getAbstractFileByPath(srcPath);
    if (!srcFile) srcFile = await app.vault.create(srcPath, src);
    else await app.vault.modify(srcFile, src);

    let embedFile = app.vault.getAbstractFileByPath(embedPath);
    if (!embedFile) embedFile = await app.vault.create(embedPath, embed);
    else await app.vault.modify(embedFile, embed);
    const embedText = await app.vault.read(embedFile);
    const srcText = await app.vault.read(srcFile);

    // Open embed note in preview mode (new leaf for deterministic markdown rendering).
    step = "open-leaf";
    const leaf = app.workspace.getLeaf(true);
    leafToClose = leaf;
    step = "open-file";
    await leaf.openFile(embedFile);
    await wait(800);

    step = "check-view";
    const view = leaf.view;
    if (view?.getViewType?.() !== "markdown") {
      throw new Error(`expected markdown view, got: ${String(view?.getViewType?.())}`);
    }

    // Prefer the official command path; some Obsidian builds expose `setMode()` but it can be flaky.
    step = "activate-leaf";
    try {
      app.workspace.setActiveLeaf?.(leaf, { focus: true });
    } catch {
      // ignore
    }
    step = "toggle-preview";
    const mode0 = typeof view.getMode === "function" ? view.getMode() : null;
    if (mode0 !== "preview") await app.commands.executeCommandById("markdown:toggle-preview");

    await wait(200);
    // Force a rerender: some embeds render lazily.
    try {
      view.previewMode?.rerender?.(true);
    } catch {
      // ignore
    }
    await wait(1200);
    const mode1 = typeof view.getMode === "function" ? view.getMode() : null;

    step = "inspect-dom";
    const previewEl = view.contentEl.querySelector(".markdown-preview-view");
    const previewDisplay = previewEl ? getComputedStyle(previewEl).display : null;
    const text = ((previewEl?.innerText ?? "") || (view.contentEl?.innerText ?? "")).replace(/\r/g, "");

    const hostEl = previewEl || view.contentEl;
    const checkboxCount = hostEl.querySelectorAll('input[type="checkbox"]').length;
    const hasParent = text.includes("parent task");
    const hasChildA = text.includes("child a");
    const hasChildB = text.includes("child b");
    const embedCounts = {
      internalEmbed: hostEl.querySelectorAll(".internal-embed").length,
      markdownEmbed: hostEl.querySelectorAll(".markdown-embed").length,
      markdownEmbedContent: hostEl.querySelectorAll(".markdown-embed-content").length,
    };
    const html0 = String(hostEl.innerHTML ?? "").slice(0, 2000);

    result = {
      ok: true,
      checkboxCount,
      embedContains: { hasParent, hasChildA, hasChildB },
      notePaths: { srcPath, embedPath },
      mode: { before: mode0, after: mode1, previewDisplay },
      viewPath: view.file?.path ?? null,
      activePath: app.workspace.getActiveFile?.()?.path ?? null,
      fileTextPreview: {
        src: srcText.split("\n").slice(0, 12),
        embed: embedText.split("\n").slice(0, 12),
      },
      embedCounts,
      html0,
      previewTextFirstLines: text.split("\n").slice(0, 20),
    };
    return result;
  } catch (e) {
    const err = e && typeof e === "object" ? e : null;
    result = {
      ok: false,
      step,
      error: String(err?.message ?? e),
      stack: String(err?.stack ?? ""),
    };
    return result;
  } finally {
    // Best-effort cleanup.
    try {
      const f1 = app.vault.getAbstractFileByPath(srcPath);
      if (f1) await app.vault.delete(f1);
    } catch {
      // ignore
    }
    try {
      const f2 = app.vault.getAbstractFileByPath(embedPath);
      if (f2) await app.vault.delete(f2);
    } catch {
      // ignore
    }

    // Restore previous active file (best-effort).
    try {
      if (prevActivePath) {
        const prev = app.vault.getAbstractFileByPath(prevActivePath);
        if (prev) await app.workspace.getLeaf(false).openFile(prev);
      }
    } catch {
      // ignore
    }

    try {
      leafToClose?.detach?.();
    } catch {
      // ignore
    }

    // No plugin toggling here; disabling/enabling can leave Obsidian view mode state inconsistent.
    void pluginEnabled;
  }
})();
