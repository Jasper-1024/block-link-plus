// CDP smoke: Journal Feed view routing + focus/commands + edit isolation.
//
// Run:
//   $env:OB_CDP_PORT=9223; $env:OB_CDP_TITLE_CONTAINS='blp'; node scripts/obsidian-cdp.js eval-file "scripts/cdp-snippets/journal-feed-view-smoke.js"
//
// Assertions:
// - Anchor file routes to `blp-journal-feed-view`.
// - BLP editor commands route to the focused embedded day editor.
// - Opening a day file directly does NOT open the journal feed view.
// - Edits are saved and isolated to the touched day file.

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
  const anchorPath = `${tmpFolder}/journal-feed-anchor.md`;

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

  const day0Path = makeDailyPath(0);
  const day1Path = makeDailyPath(1);
  const day2Path = makeDailyPath(2);

  // Ensure Obsidian reloads the plugin after we rebuild `main.js`.
  await app.plugins.disablePlugin(pluginId);
  await app.plugins.enablePlugin(pluginId);
  await wait(250);

  const plugin = app?.plugins?.plugins?.[pluginId];
  assert(plugin, `plugin not found after reload: ${pluginId}`);
  const viewReady = await waitFor(
    () => app.viewRegistry.getViewCreatorByType?.("blp-journal-feed-view") ? true : null,
    { timeoutMs: 15000, stepMs: 50 }
  );
  assert(viewReady, "journal feed view was not registered after plugin reload.");
  const engineReady = await waitFor(
    () => plugin.inlineEditEngine?.isLoaded?.() ? true : null,
    { timeoutMs: 15000, stepMs: 50 }
  );
  assert(engineReady, "inlineEditEngine did not finish loading after plugin reload.");

  const upsert = async (path, content) => {
    let f = app.vault.getAbstractFileByPath(path);
    if (!f) f = await app.vault.create(path, content);
    else await app.vault.modify(f, content);
    return f;
  };

  try {
    try {
      if (!app.vault.getAbstractFileByPath(tmpFolder)) await app.vault.createFolder(tmpFolder);
    } catch {
      // ignore
    }
    try {
      if (baseFolder && !app.vault.getAbstractFileByPath(baseFolder)) await app.vault.createFolder(baseFolder);
    } catch {
      // ignore
    }

    const marker0 = `blp-journal-feed-smoke-day0-${Date.now()}`;
    const marker1 = `blp-journal-feed-smoke-day1-${Date.now()}`;
    await upsert(day0Path, `# day0\n\n${marker0}\n`);
    await upsert(day1Path, `# day1\n\n${marker1}\n`);
    await upsert(day2Path, `# day2\n\n`);

    const anchorContent = [
      "---",
      "blp_journal_view: true",
      "blp_journal_initial_days: 2",
      "blp_journal_page_size: 1",
      "---",
      "",
      "# Journal Feed Anchor",
      "",
    ].join("\n");
    const anchorFile = await upsert(anchorPath, anchorContent);

    const cacheBefore = app.metadataCache.getFileCache(anchorFile);
    const fmBefore = cacheBefore?.frontmatter ?? null;
    const headBefore = String(await app.vault.cachedRead(anchorFile)).slice(0, 160);

    // Now open normally (should route to Journal Feed).
    const openLeaf = app.workspace.getLeaf(true);
    const setViewCalls = [];
    const origSetViewState = openLeaf.setViewState.bind(openLeaf);
    openLeaf.setViewState = async (vs, eState) => {
      setViewCalls.push(vs?.type ?? null);
      return origSetViewState(vs, eState);
    };
    let opened = false;
    for (let i = 0; i < 3; i++) {
      await openLeaf.openFile(anchorFile);
      const ok = await waitFor(
        () => openLeaf?.view?.getViewType?.() === "blp-journal-feed-view" ? true : null,
        { timeoutMs: 5000, stepMs: 50 }
      );
      if (ok) {
        opened = true;
        break;
      }
      await wait(250);
    }
    try {
      assert(opened, `anchor did not route to journal feed view after retries. setViewCalls=${JSON.stringify(setViewCalls)}`);
    } finally {
      openLeaf.setViewState = origSetViewState;
    }
    const leaf = openLeaf;
    if (leaf?.view?.getViewType?.() !== "blp-journal-feed-view") {
      const cache = app.metadataCache.getFileCache(anchorFile);
      const fm = cache?.frontmatter ?? null;
      const activeType = app.workspace.activeLeaf?.view?.getViewType?.() ?? null;
      const activePath = app.workspace.getActiveFile?.()?.path ?? null;
      const parentOk = leaf?.parent != null;
      const leafCtor = leaf?.constructor?.name ?? null;
      const viewRegistered = Boolean(app.viewRegistry.getViewCreatorByType?.("blp-journal-feed-view"));
      throw new Error(
        `anchor did not open journal feed view. openLeafType=${leaf?.view?.getViewType?.() ?? null} activeType=${activeType} activePath=${activePath} leafCtor=${leafCtor} parentOk=${parentOk} viewRegistered=${viewRegistered} frontmatter=${JSON.stringify(fm)} fmBefore=${JSON.stringify(fmBefore)} headBefore=${JSON.stringify(headBefore)}`
      );
    }

    const view = leaf.view;
    await waitFor(() => Array.isArray(view.sections) && view.sections.length >= 2 ? true : null, { timeoutMs: 10000 });

    const sections = view.sections;
    assert(Array.isArray(sections) && sections.length >= 2, "journal feed did not create day sections.");

    // Patch clipboard writes for assertions.
    const writes = [];
    const origClipboard = navigator.clipboard?.writeText;
    if (!navigator.clipboard) navigator.clipboard = {};
    navigator.clipboard.writeText = async (text) => {
      writes.push(String(text));
      return Promise.resolve();
    };

    // Focus first day (mount + bridge).
    await view.mountSectionEditor(sections[0], { focus: true, bridge: true });
    await wait(50);
    const focused0 = plugin.inlineEditEngine?.focus?.getFocused?.();
    assert(focused0, "inlineEditEngine.focus.getFocused() is null after mount (day0).");
    assert(focused0.file?.path === sections[0].file.path, `focused embed is not day0: ${focused0.file?.path} vs ${sections[0].file.path}`);
    assert(focused0.view?.editor, "focused embed has no editor (day0).");
    const cache0 = await waitFor(() => app.metadataCache.getFileCache(sections[0].file) ? true : null, { timeoutMs: 15000, stepMs: 50 });
    assert(cache0, "metadata cache not ready for day0 file (needed by command handler).");
    try {
      // `analyzeHeadings()` treats (0,0) as invalid; place cursor on the marker line.
      focused0.view.editor.setCursor({ line: 2, ch: 0 });
    } catch {
      // ignore
    }
    await app.commands.executeCommandById("block-link-plus:copy-link-to-block");
    await wait(50);
    if (writes.length === 0) {
      const cmd = app.commands.findCommand("block-link-plus:copy-link-to-block");
      let directErr = null;
      try {
        cmd?.editorCheckCallback?.(false, focused0.view.editor, focused0.view);
      } catch (e) {
        directErr = e?.message ?? String(e);
      }
      await wait(50);

      const focusedNow = plugin.inlineEditEngine?.focus?.getFocused?.();
      const activeType = app.workspace.activeLeaf?.view?.getViewType?.() ?? null;
      const focusedFile = focusedNow?.file?.path ?? null;
      const viewFile = focusedNow?.view?.file?.path ?? null;
      const cacheViewFile = focusedNow?.view?.file ? Boolean(app.metadataCache.getFileCache(focusedNow.view.file)) : null;
      const cacheSectionFile = Boolean(app.metadataCache.getFileCache(sections[0].file));
      throw new Error(
        `clipboard not written by copy-link-to-block (day0). activeType=${activeType} focusedFile=${focusedFile} viewFile=${viewFile} cacheViewFile=${cacheViewFile} cacheSectionFile=${cacheSectionFile} directErr=${directErr}`
      );
    }
    const w0 = writes[writes.length - 1];
    assert(w0.includes(sections[0].file.basename), `expected clipboard to include ${sections[0].file.basename}, got: ${w0}`);

    // Focus second day and retry.
    await view.mountSectionEditor(sections[1], { focus: true, bridge: true });
    await wait(50);
    const focused1 = plugin.inlineEditEngine?.focus?.getFocused?.();
    assert(focused1, "inlineEditEngine.focus.getFocused() is null after mount (day1).");
    assert(focused1.file?.path === sections[1].file.path, `focused embed is not day1: ${focused1.file?.path} vs ${sections[1].file.path}`);
    assert(focused1.view?.editor, "focused embed has no editor (day1).");
    const cache1 = await waitFor(() => app.metadataCache.getFileCache(sections[1].file) ? true : null, { timeoutMs: 15000, stepMs: 50 });
    assert(cache1, "metadata cache not ready for day1 file (needed by command handler).");
    try {
      focused1.view.editor.setCursor({ line: 2, ch: 0 });
    } catch {
      // ignore
    }
    await app.commands.executeCommandById("block-link-plus:copy-link-to-block");
    await wait(50);
    if (writes.length <= 1) {
      const cmd = app.commands.findCommand("block-link-plus:copy-link-to-block");
      let directErr = null;
      try {
        cmd?.editorCheckCallback?.(false, focused1.view.editor, focused1.view);
      } catch (e) {
        directErr = e?.message ?? String(e);
      }
      await wait(50);

      const focusedNow = plugin.inlineEditEngine?.focus?.getFocused?.();
      const activeType = app.workspace.activeLeaf?.view?.getViewType?.() ?? null;
      const focusedFile = focusedNow?.file?.path ?? null;
      const viewFile = focusedNow?.view?.file?.path ?? null;
      const cacheViewFile = focusedNow?.view?.file ? Boolean(app.metadataCache.getFileCache(focusedNow.view.file)) : null;
      const cacheSectionFile = Boolean(app.metadataCache.getFileCache(sections[1].file));
      throw new Error(
        `clipboard not written by copy-link-to-block (day1). activeType=${activeType} focusedFile=${focusedFile} viewFile=${viewFile} cacheViewFile=${cacheViewFile} cacheSectionFile=${cacheSectionFile} directErr=${directErr}`
      );
    }
    const w1 = writes[writes.length - 1];
    assert(w1.includes(sections[1].file.basename), `expected clipboard to include ${sections[1].file.basename}, got: ${w1}`);

    // Opening a day file directly MUST NOT open the journal feed view.
    const leaf2 = app.workspace.getLeaf(true);
    await leaf2.openFile(sections[0].file);
    assert(leaf2.view.getViewType() !== "blp-journal-feed-view", "opening a day file was incorrectly routed to journal feed view.");

    // Edit isolation + flush-save on unmount.
    const unique = `BLP_JOURNAL_FEED_SMOKE_EDIT_${Date.now()}`;
    await view.mountSectionEditor(sections[0], { focus: true, bridge: true });
    assert(sections[0].embed?.view?.editor, "day0 embed editor missing after mount.");
    const editor0 = sections[0].embed.view.editor;
    editor0.setValue(editor0.getValue() + `\n${unique}\n`);

    await view.unmountSectionEditor(sections[0]);

    const text0 = await app.vault.read(sections[0].file);
    const text1 = await app.vault.read(sections[1].file);
    assert(text0.includes(unique), "expected unmount to persist edits to day0 file.");
    assert(!text1.includes(unique), "unexpected edit leakage into day1 file.");

    // Restore clipboard.
    if (origClipboard) navigator.clipboard.writeText = origClipboard;

    return {
      ok: true,
      vault: app.vault.getName(),
      anchorPath,
      dayPaths: [day0Path, day1Path, day2Path],
      clipboardSamples: [w0, w1],
    };
  } finally {
    // Best effort cleanup (keep files if deletion fails).
    try {
      const f = app.vault.getAbstractFileByPath(anchorPath);
      if (f) await app.vault.delete(f);
    } catch {
      // ignore
    }
  }
})();
