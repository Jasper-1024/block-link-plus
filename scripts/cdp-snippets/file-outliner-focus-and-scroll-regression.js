// Run:
//   node scripts/obsidian-cdp.js eval-file "scripts/cdp-snippets/file-outliner-focus-and-scroll-regression.js"
//
// Covers:
// 1) The outliner view can enter edit mode programmatically after plugin reload.
// 2) A long outliner can scroll the last block above the bottom edge (usable tail slack).

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

    const firstRow = view.contentEl.querySelector(".ls-block[data-blp-outliner-id]");
    const firstId = firstRow?.dataset?.blpOutlinerId ?? null;
    assert(firstId, "missing first block id");
    view.enterEditMode?.(firstId, { cursorStart: 0, cursorEnd: 0, scroll: false });
    await wait(120);
    assert(view.editingId, "expected editingId after entering edit mode");

    const rows = Array.from(view.contentEl.querySelectorAll(".ls-block[data-blp-outliner-id]"));
    const lastRow = rows[rows.length - 1];
    assert(lastRow, "missing last row");
    view.contentEl.scrollTop = view.contentEl.scrollHeight;
    await wait(100);
    const hostRect = view.contentEl.getBoundingClientRect();
    const lastRect = lastRow.getBoundingClientRect();
    const bottomGap = hostRect.bottom - lastRect.bottom;
    assert(bottomGap > hostRect.height / 4, `expected usable bottom gap, got ${bottomGap} for host height ${hostRect.height}`);

    return {
      ok: true,
      editingId: view.editingId,
      bottomGap,
      hostHeight: hostRect.height,
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
