// Run:
//   node scripts/obsidian-cdp.js eval-file "scripts/cdp-snippets/file-outliner-tab-shift-tab-order-regression.js"
//
// Covers:
// 1) `Tab` keeps visible block order stable and only deepens the current block when possible.
// 2) `Shift+Tab` restores one level while keeping visible order stable.

(async () => {
  const wait = (ms) => new Promise((r) => setTimeout(r, ms));
  const assert = (cond, msg) => {
    if (!cond) throw new Error(msg);
  };

  const pluginId = "block-link-plus";
  const tmpFolder = "_blp_tmp";
  const outlinerPath = `${tmpFolder}/tab-shift-tab-order-regression.md`;
  const plugin = app?.plugins?.plugins?.[pluginId];
  if (!plugin) throw new Error(`Plugin not found: ${pluginId}`);

  const prevActivePath = app.workspace.getActiveFile?.()?.path ?? null;

  const snapshot = (view) => {
    const ids = Array.from(view.contentEl.querySelectorAll(".ls-block[data-blp-outliner-id]")).map(
      (el) => el.dataset.blpOutlinerId
    );
    return {
      ids,
      texts: ids.map((id) => String(view.blockById.get(id)?.text ?? "").split("\n")[0]),
      depths: ids.map((id) => Number(view.blockById.get(id)?.depth ?? -1)),
      editingId: view.editingId ?? null,
      scrollTop: view.contentEl.scrollTop,
    };
  };

  try {
    if (!app.vault.getAbstractFileByPath(tmpFolder)) {
      await app.vault.createFolder(tmpFolder);
    }

    const outlinerContent = ["---", "blp_outliner: true", "---", "", "- A", "  - B", "- C", "  - D", ""].join("\n");

    let outlinerFile = app.vault.getAbstractFileByPath(outlinerPath);
    if (!outlinerFile) outlinerFile = await app.vault.create(outlinerPath, outlinerContent);
    else await app.vault.modify(outlinerFile, outlinerContent);

    const outlinerLeaf = app.workspace.getLeaf(false);
    await outlinerLeaf.setViewState({
      type: "blp-file-outliner-view",
      state: { file: outlinerPath },
      active: true,
    });
    app.workspace.setActiveLeaf?.(outlinerLeaf, { focus: true });
    await wait(400);

    const view = outlinerLeaf.view;
    assert(view?.getViewType?.() === "blp-file-outliner-view", `expected outliner view, got ${String(view?.getViewType?.())}`);

    const before = snapshot(view);
    const targetId = before.ids[2];
    assert(targetId, "missing third visible block");
    view.enterEditMode?.(targetId, { cursorStart: 0, cursorEnd: 0, scroll: false });
    await wait(120);

    const cm = view.editorView;
    assert(cm?.contentDOM, "missing editor view");
    cm.dispatch({ selection: { anchor: 0 } });
    cm.contentDOM.dispatchEvent(
      new KeyboardEvent("keydown", { key: "Tab", code: "Tab", bubbles: true, cancelable: true })
    );
    await wait(180);

    const afterTab = snapshot(view);
    assert(JSON.stringify(afterTab.texts) === JSON.stringify(["A", "B", "C", "D"]), "visible order changed after Tab");
    assert(JSON.stringify(afterTab.depths) === JSON.stringify([0, 1, 1, 1]), `expected 1212 -> 1222 semantics, got ${JSON.stringify(afterTab.depths)}`);

    const targetId2 = afterTab.editingId ?? targetId;
    view.enterEditMode?.(targetId2, { cursorStart: 0, cursorEnd: 0, scroll: false });
    await wait(80);
    const cm2 = view.editorView;
    cm2.dispatch({ selection: { anchor: 0 } });
    cm2.contentDOM.dispatchEvent(
      new KeyboardEvent("keydown", { key: "Tab", code: "Tab", shiftKey: true, bubbles: true, cancelable: true })
    );
    await wait(180);

    const afterShiftTab = snapshot(view);
    assert(JSON.stringify(afterShiftTab.texts) === JSON.stringify(["A", "B", "C", "D"]), "visible order changed after Shift+Tab");
    assert(JSON.stringify(afterShiftTab.depths) === JSON.stringify([0, 1, 0, 1]), `expected restore to 1212, got ${JSON.stringify(afterShiftTab.depths)}`);

    return {
      ok: true,
      before,
      afterTab,
      afterShiftTab,
    };
  } finally {
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
