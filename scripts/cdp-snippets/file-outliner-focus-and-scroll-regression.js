// Run:
//   node scripts/obsidian-cdp.js eval-file "scripts/cdp-snippets/file-outliner-focus-and-scroll-regression.js"
//
// Covers:
// 1) The outliner view can enter edit mode programmatically after plugin reload.
// 2) A long outliner can scroll the last block above the bottom edge (usable tail slack).
// 3) Structural edits near the bottom (`Enter` / `Tab` / `Shift+Tab`) do not jump back to file top.

(async () => {
  const wait = (ms) => new Promise((r) => setTimeout(r, ms));
  const assert = (cond, msg) => {
    if (!cond) throw new Error(msg);
  };

  const pluginId = "block-link-plus";
  const tmpFolder = "_blp_tmp";
  const outlinerPath = `${tmpFolder}/focus-scroll-regression.md`;
  const plugin = app?.plugins?.plugins?.[pluginId];
  if (!plugin) throw new Error(`Plugin not found: ${pluginId}`);

  const prevEnabledFiles = Array.isArray(plugin.settings?.fileOutlinerEnabledFiles)
    ? [...plugin.settings.fileOutlinerEnabledFiles]
    : [];
  const prevActivePath = app.workspace.getActiveFile?.()?.path ?? null;

  try {
    if (!app.vault.getAbstractFileByPath(tmpFolder)) {
      await app.vault.createFolder(tmpFolder);
    }

    const lines = ["---", "blp_outliner: true", "---", ""];
    for (let i = 1; i <= 48; i++) lines.push(`- item ${String(i).padStart(2, "0")}`);
    lines.push("");
    const outlinerContent = lines.join("\n");

    let outlinerFile = app.vault.getAbstractFileByPath(outlinerPath);
    if (!outlinerFile) outlinerFile = await app.vault.create(outlinerPath, outlinerContent);
    else await app.vault.modify(outlinerFile, outlinerContent);

    plugin.settings.fileOutlinerEnabledFiles = Array.from(new Set([...prevEnabledFiles, outlinerPath]));
    await plugin.saveSettings();

    const outlinerLeaf = app.workspace.activeLeaf;
    await outlinerLeaf.openFile(outlinerFile);
    app.workspace.setActiveLeaf?.(outlinerLeaf, { focus: true });
    await wait(300);

    const view = outlinerLeaf.view;
    assert(view?.getViewType?.() === "blp-file-outliner-view", `expected outliner view, got ${String(view?.getViewType?.())}`);

    const openFreshLongView = async () => {
      await app.vault.modify(outlinerFile, outlinerContent);
      await outlinerLeaf.setViewState({
        type: "blp-file-outliner-view",
        state: { file: outlinerPath },
        active: true,
      });
      app.workspace.setActiveLeaf?.(outlinerLeaf, { focus: true });
      await wait(300);

      const freshView = outlinerLeaf.view;
      assert(
        freshView?.getViewType?.() === "blp-file-outliner-view",
        `expected outliner view after reset, got ${String(freshView?.getViewType?.())}`
      );

      const freshRows = Array.from(freshView.contentEl.querySelectorAll(".ls-block[data-blp-outliner-id]"));
      const freshLastRow = freshRows[freshRows.length - 1];
      assert(freshLastRow, "missing last row");
      freshView.contentEl.scrollTop = freshView.contentEl.scrollHeight;
      await wait(100);

      const nearBottomIndex = Math.max(0, freshRows.length - 3);
      const freshTargetRow = freshRows[nearBottomIndex];
      const freshTargetId = freshTargetRow?.dataset?.blpOutlinerId ?? null;
      assert(freshTargetId, "missing near-bottom block id");

      return {
        view: freshView,
        rows: freshRows,
        lastRow: freshLastRow,
        targetRow: freshTargetRow,
        targetId: freshTargetId,
      };
    };

    const initial = await openFreshLongView();
    const hostRect = initial.view.contentEl.getBoundingClientRect();
    const lastRect = initial.lastRow.getBoundingClientRect();
    const bottomGap = hostRect.bottom - lastRect.bottom;
    assert(bottomGap > hostRect.height / 4, `expected usable bottom gap, got ${bottomGap} for host height ${hostRect.height}`);

    const snapshotScroll = (activeView) => ({
      scrollTop: activeView.contentEl.scrollTop,
      scrollHeight: activeView.contentEl.scrollHeight,
      clientHeight: activeView.contentEl.clientHeight,
      editingId: activeView.editingId ?? null,
    });

    const assertNotJumpedToTop = (before, after, label) => {
      assert(after.scrollTop > 48, `${label}: expected scrollTop to stay away from file top, got ${after.scrollTop}`);
      assert(
        Math.abs(after.scrollTop - before.scrollTop) <= 160,
        `${label}: expected scrollTop delta to stay small, before=${before.scrollTop}, after=${after.scrollTop}`
      );
    };

    const dispatchKey = async ({ key, code, shiftKey = false }) => {
      const fresh = await openFreshLongView();
      fresh.targetRow.scrollIntoView({ block: "nearest" });
      await wait(60);
      fresh.view.enterEditMode?.(fresh.targetId, { cursorStart: 0, cursorEnd: 0, scroll: false });
      await wait(120);
      const cm = fresh.view.editorView;
      assert(cm?.contentDOM, `missing CM contentDOM for ${key}`);
      cm.dispatch({ selection: { anchor: 0 } });
      const before = snapshotScroll(fresh.view);
      cm.contentDOM.dispatchEvent(new KeyboardEvent("keydown", { key, code, shiftKey, bubbles: true, cancelable: true }));
      await wait(220);
      const after = snapshotScroll(fresh.view);
      assertNotJumpedToTop(before, after, `${key}${shiftKey ? "+shift" : ""}`);
      return { before, after };
    };

    const enterResult = await dispatchKey({ key: "Enter", code: "Enter" });
    const tabResult = await dispatchKey({ key: "Tab", code: "Tab" });
    const shiftTabResult = await dispatchKey({ key: "Tab", code: "Tab", shiftKey: true });

    return {
      ok: true,
      editingId: view.editingId,
      bottomGap,
      hostHeight: hostRect.height,
      enterResult,
      tabResult,
      shiftTabResult,
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

    try {
      const f = app.vault.getAbstractFileByPath(outlinerPath);
      if (f) await app.vault.delete(f);
    } catch {
      // ignore
    }

  }
})();
