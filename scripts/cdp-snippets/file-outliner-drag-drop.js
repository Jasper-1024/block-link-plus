// CDP regression: file-outliner view supports Logseq-like drag-and-drop for blocks.
//
// Run:
//   node scripts/obsidian-cdp.js eval-file "scripts/cdp-snippets/file-outliner-drag-drop.js"
//
// Covers:
// 1) Drag block B after block C (reorder siblings).
// 2) Drag block B inside block A (append as child).
//
// Note: this snippet dispatches PointerEvents on the bullet handle. Obsidian must be
// running with `--remote-debugging-port=9222` and a vault must be open.

(async () => {
  const wait = (ms) => new Promise((r) => setTimeout(r, ms));
  const assert = (cond, msg) => {
    if (!cond) throw new Error(msg);
  };

  const pluginId = "block-link-plus";
  const tmpFolder = "_blp_tmp";
  const outlinerPath = `${tmpFolder}/outliner-dnd.md`;

  const now = "2026-02-06T00:00:00";
  const sys = (id) =>
    `  [date:: ${now}] [updated:: ${now}] [blp_sys:: 1] [blp_ver:: 2] ^${id}`;

  const content = [
    "---",
    "blp_outliner: true",
    "---",
    "",
    "- a",
    sys("a"),
    "- b",
    sys("b"),
    "- c",
    sys("c"),
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
  const prevActivePath = app.workspace.getActiveFile?.()?.path ?? null;

  try {
    try {
      if (!app.vault.getAbstractFileByPath(tmpFolder)) await app.vault.createFolder(tmpFolder);
    } catch {
      // ignore
    }

    let file = app.vault.getAbstractFileByPath(outlinerPath);
    if (!file) file = await app.vault.create(outlinerPath, content);
    else await app.vault.modify(file, content);

    plugin.settings.fileOutlinerEnabledFiles = Array.from(new Set([...prevEnabledFiles, outlinerPath]));
    plugin.settings.fileOutlinerViewEnabled = true;
    await plugin.saveSettings();

    await app.workspace.getLeaf(false).openFile(file);
    const outlinerView = await waitFor(() => {
      const v = app.workspace.activeLeaf?.view;
      return v?.getViewType?.() === "blp-file-outliner-view" ? v : null;
    });
    assert(outlinerView, "expected file to open in blp-file-outliner-view");

    const rootBlocksEl = outlinerView.contentEl.querySelector(".blp-file-outliner-blocks");
    assert(rootBlocksEl, "missing .blp-file-outliner-blocks");

    const getRootIds = () =>
      Array.from(rootBlocksEl.children)
        .filter((el) => el instanceof HTMLElement && el.classList.contains("ls-block"))
        .map((el) => el.dataset?.blpOutlinerId)
        .filter(Boolean);

    const getBullet = (id) =>
      outlinerView.contentEl.querySelector(`[data-blp-outliner-id="${id}"] .bullet-container`);

    const rectCenter = (el) => {
      const r = el.getBoundingClientRect();
      return { x: r.left + r.width / 2, y: r.top + r.height / 2, r };
    };

    const getRowRects = (id) => {
      const blockEl = outlinerView.contentEl.querySelector(`[data-blp-outliner-id="${id}"]`);
      assert(blockEl, `missing blockEl for ${id}`);
      const rowEl = blockEl.querySelector(":scope > .block-main-container");
      const contentWrap = blockEl.querySelector(":scope > .block-main-container > .block-content-wrapper");
      const childrenContainer = blockEl.querySelector(":scope > .block-children-container");
      return {
        blockEl,
        rowRect: (rowEl ?? blockEl).getBoundingClientRect(),
        contentRect: (contentWrap ?? blockEl).getBoundingClientRect(),
        childrenMarginLeftPx: childrenContainer ? parseFloat(getComputedStyle(childrenContainer).marginLeft) || 0 : 0,
      };
    };

    // --- 1) Drag B after C.
    {
      const bBullet = await waitFor(() => getBullet("b"));
      assert(bBullet, "missing bullet for b");
      const cRow = getRowRects("c");

      const start = rectCenter(bBullet);
      const dropX = start.x; // keep x near bullet => where=after (not inside)
      const dropY = cRow.rowRect.top + cRow.rowRect.height * 0.8;

      bBullet.dispatchEvent(
        new PointerEvent("pointerdown", { bubbles: true, pointerId: 1, button: 0, clientX: start.x, clientY: start.y })
      );
      bBullet.dispatchEvent(
        new PointerEvent("pointermove", { bubbles: true, pointerId: 1, clientX: start.x + 8, clientY: start.y + 8 })
      );
      bBullet.dispatchEvent(
        new PointerEvent("pointermove", { bubbles: true, pointerId: 1, clientX: dropX, clientY: dropY })
      );
      bBullet.dispatchEvent(
        new PointerEvent("pointerup", { bubbles: true, pointerId: 1, button: 0, clientX: dropX, clientY: dropY })
      );
      await wait(200);

      const ids = getRootIds();
      assert(
        JSON.stringify(ids) === JSON.stringify(["a", "c", "b"]),
        `expected root order a,c,b after drag (got ${JSON.stringify(ids)})`
      );
    }

    // --- 2) Drag B inside A (append).
    {
      const bBullet = await waitFor(() => getBullet("b"));
      assert(bBullet, "missing bullet for b (after reorder)");
      const aRow = getRowRects("a");

      const start = rectCenter(bBullet);
      const insideX = aRow.contentRect.left + Math.max(32, aRow.childrenMarginLeftPx); // ensure x > inside threshold
      const insideY = aRow.rowRect.top + aRow.rowRect.height * 0.8;

      bBullet.dispatchEvent(
        new PointerEvent("pointerdown", { bubbles: true, pointerId: 2, button: 0, clientX: start.x, clientY: start.y })
      );
      bBullet.dispatchEvent(
        new PointerEvent("pointermove", { bubbles: true, pointerId: 2, clientX: start.x + 8, clientY: start.y + 8 })
      );
      bBullet.dispatchEvent(
        new PointerEvent("pointermove", { bubbles: true, pointerId: 2, clientX: insideX, clientY: insideY })
      );
      bBullet.dispatchEvent(
        new PointerEvent("pointerup", { bubbles: true, pointerId: 2, button: 0, clientX: insideX, clientY: insideY })
      );
      await wait(200);

      const ids = getRootIds();
      assert(
        JSON.stringify(ids) === JSON.stringify(["a", "c"]),
        `expected root order a,c after inside drag (got ${JSON.stringify(ids)})`
      );

      const aChildren = outlinerView.contentEl.querySelector(
        `[data-blp-outliner-id="a"] .block-children [data-blp-outliner-id="b"]`
      );
      assert(aChildren, "expected b to be inside a as a child");
    }

    return { ok: true };
  } finally {
    try {
      plugin.settings.fileOutlinerEnabledFiles = prevEnabledFiles;
      plugin.settings.fileOutlinerViewEnabled = prevRouting;
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

