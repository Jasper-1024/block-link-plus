// CDP regression checks for file-level outliner UX fixes (issues 1-4).
// Run:
//   node scripts/obsidian-cdp.js eval-file "scripts/cdp-snippets/file-outliner-ux-1234.js"
//
// Covers:
// 1) Insert affordance does not add vertical gaps between sibling blocks (and only shows at end of root list).
// 2) Fold toggle caret color matches bullet state (muted vs active).
// 3) Zoom header renders file > crumbs and crumbs are clickable.
// 4) Child block rows fill width; clicking near the right edge enters edit mode.

(async () => {
  const wait = (ms) => new Promise((r) => setTimeout(r, ms));
  const assert = (cond, msg) => {
    if (!cond) throw new Error(msg);
  };

  const pluginId = "block-link-plus";
  const tmpFolder = "_blp_tmp";
  const tmpPath = `${tmpFolder}/file-outliner-ux-1234.md`;

  const now0 = "2026-02-03T00:00:00";
  const now1 = "2026-02-03T00:00:01";
  const now2 = "2026-02-03T00:00:02";
  const now3 = "2026-02-03T00:00:03";
  const now4 = "2026-02-03T00:00:04";

  // Two root blocks so we can assert the root insert affordance attaches only to the last root block.
  const content = [
    "---",
    "blp_outliner: true",
    "---",
    "",
    "- a",
    "  - v",
    `    [date:: ${now1}] [updated:: ${now1}] [blp_sys:: 1] [blp_ver:: 2] ^v`,
    "  - c",
    `    [date:: ${now2}] [updated:: ${now2}] [blp_sys:: 1] [blp_ver:: 2] ^c`,
    "  - b",
    `    [date:: ${now3}] [updated:: ${now3}] [blp_sys:: 1] [blp_ver:: 2] ^b`,
    "  ",
    `  [date:: ${now0}] [updated:: ${now0}] [blp_sys:: 1] [blp_ver:: 2] ^a`,
    "",
    "- root2",
    `  [date:: ${now4}] [updated:: ${now4}] [blp_sys:: 1] [blp_ver:: 2] ^r2`,
    "",
  ].join("\n");

  // Ensure Obsidian reloads the plugin after we rebuild `main.js`.
  await app.plugins.disablePlugin(pluginId);
  await app.plugins.enablePlugin(pluginId);
  await wait(250);

  const plugin = app?.plugins?.plugins?.[pluginId];
  if (!plugin) throw new Error(`Plugin not found after reload: ${pluginId}`);

  const prevEnabledFiles = Array.isArray(plugin.settings?.fileOutlinerEnabledFiles)
    ? [...plugin.settings.fileOutlinerEnabledFiles]
    : [];
  const prevActivePath = app.workspace.getActiveFile?.()?.path ?? null;

  try {
    try {
      if (!app.vault.getAbstractFileByPath(tmpFolder)) {
        await app.vault.createFolder(tmpFolder);
      }
    } catch {
      // ignore
    }

    // Create/overwrite the temp note.
    let f = app.vault.getAbstractFileByPath(tmpPath);
    if (!f) {
      f = await app.vault.create(tmpPath, content);
    } else {
      await app.vault.modify(f, content);
    }

    // Deterministic routing: add to enabled files list temporarily.
    plugin.settings.fileOutlinerEnabledFiles = Array.from(new Set([...prevEnabledFiles, tmpPath]));
    await plugin.saveSettings();

    await app.workspace.getLeaf(false).openFile(f);
    await wait(250);

    const view = app.workspace.activeLeaf?.view;
    const viewType = view?.getViewType?.() ?? null;
    assert(viewType === "blp-file-outliner-view", `expected viewType=blp-file-outliner-view, got ${String(viewType)}`);

    const root = view.contentEl.querySelector(".blp-file-outliner-root") || view.contentEl;
    const blocksHost = root.querySelector(".blp-file-outliner-blocks") || root;

    const pickRect = (el) => {
      const r = el.getBoundingClientRect();
      return { left: r.left, right: r.right, top: r.top, bottom: r.bottom, width: r.width, height: r.height };
    };

    // --- 1) No vertical gaps between siblings (insert hint must not participate in layout).
    const mainRect = (id) => {
      const el = blocksHost.querySelector(`.ls-block[data-blp-outliner-id="${id}"] > .block-main-container`);
      if (!el) return null;
      return pickRect(el);
    };
    const gap = (a, b) => {
      const ra = mainRect(a);
      const rb = mainRect(b);
      if (!ra || !rb) return null;
      return Math.round((rb.top - ra.bottom) * 10) / 10;
    };

    const vToC = gap("v", "c");
    const cToB = gap("c", "b");
    assert(vToC !== null && Math.abs(vToC) <= 1, `expected v->c gap ~0, got ${String(vToC)}`);
    assert(cToB !== null && Math.abs(cToB) <= 1, `expected c->b gap ~0, got ${String(cToB)}`);

    // Root insert affordance: only on the last root block (r2), not on 'a'.
    const rootBlockA = blocksHost.querySelector(`:scope > .ls-block[data-blp-outliner-id="a"]`);
    const rootBlockR2 = blocksHost.querySelector(`:scope > .ls-block[data-blp-outliner-id="r2"]`);
    assert(rootBlockA && rootBlockR2, "missing expected root blocks a/r2");

    const hintA = rootBlockA.querySelector(`:scope > .blp-outliner-insert-hint`);
    const hintR2 = rootBlockR2.querySelector(`:scope > .blp-outliner-insert-hint`);
    assert(hintA && hintR2, "missing insert-hint nodes on root blocks");

    const hintAStyle = getComputedStyle(hintA);
    const hintR2Style = getComputedStyle(hintR2);
    assert(hintAStyle.display === "none", `expected root 'a' insert hint display=none, got ${hintAStyle.display}`);
    assert(hintR2Style.display !== "none", `expected root 'r2' insert hint to be visible, got display=${hintR2Style.display}`);

    // --- 4) Child rows fill width + right-edge click enters edit mode.
    const blocksHostRect = pickRect(blocksHost);
    const childContainer = blocksHost.querySelector(`.ls-block[data-blp-outliner-id="a"] > .block-children-container > .block-children`);
    assert(childContainer, "missing child container for a");
    const childContainerRect = pickRect(childContainer);
    const ratio = childContainerRect.width / Math.max(1, blocksHostRect.width);
    assert(ratio >= 0.8, `expected child container width ratio >= 0.8, got ${ratio.toFixed(3)}`);

    const vDisplay = blocksHost.querySelector(`.ls-block[data-blp-outliner-id="v"] .blp-file-outliner-display`);
    assert(vDisplay, "missing v display");

    // Ensure we start not editing.
    try {
      if (view.editingId) view.exitEditMode?.(view.editingId);
    } catch {
      // ignore
    }
    await wait(30);

    const vRect = pickRect(vDisplay);
    const pt = { x: Math.floor(vRect.right - 5), y: Math.floor(vRect.top + vRect.height / 2) };
    const hit = document.elementFromPoint(pt.x, pt.y);
    assert(hit, "elementFromPoint returned null");
    hit.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    await wait(80);
    assert(view.editingId === "v", `expected editingId=v after right-edge click, got ${String(view.editingId)}`);

    // --- 2) Fold caret color matches bullet state.
    // Activate the parent to show fold toggle and apply active bullet styling.
    const aDisplay = blocksHost.querySelector(`.ls-block[data-blp-outliner-id="a"] .blp-file-outliner-display`);
    assert(aDisplay, "missing a display");
    aDisplay.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    await wait(80);

    const aEl = blocksHost.querySelector(`.ls-block[data-blp-outliner-id="a"]`);
    const fold = aEl?.querySelector(".blp-outliner-fold-toggle");
    const bullet = aEl?.querySelector(".bullet");
    assert(fold && bullet, "missing fold/bullet for a");

    const arrowCs = getComputedStyle(fold, "::before");
    const bulletCs = getComputedStyle(bullet);
    assert(
      arrowCs.borderLeftColor === bulletCs.backgroundColor,
      `expected fold caret color == bullet color; caret=${arrowCs.borderLeftColor} bullet=${bulletCs.backgroundColor}`
    );

    // --- 3) Zoom breadcrumbs: file > crumbs, clickable.
    // Zoom into a then v.
    const bulletA = blocksHost.querySelector(`.ls-block[data-blp-outliner-id="a"] .bullet-container`);
    assert(bulletA, "missing bullet-container for a");
    bulletA.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    await wait(200);
    assert(Array.isArray(view.zoomStack) && view.zoomStack.length === 1 && view.zoomStack[0] === "a", `expected zoomStack=['a'], got ${JSON.stringify(view.zoomStack)}`);

    const bulletV = blocksHost.querySelector(`.ls-block[data-blp-outliner-id="v"] .bullet-container`);
    assert(bulletV, "missing bullet-container for v");
    bulletV.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    await wait(200);
    assert(Array.isArray(view.zoomStack) && view.zoomStack.length === 2 && view.zoomStack[1] === "v", `expected zoomStack=['a','v'], got ${JSON.stringify(view.zoomStack)}`);

    const crumbButtons = Array.from(root.querySelectorAll(".blp-outliner-zoom-crumb"));
    assert(crumbButtons.length >= 3, `expected >=3 crumbs (file,a,v), got ${crumbButtons.length}`);
    assert(String(crumbButtons[0].textContent || "").includes("file-outliner-ux-1234"), "expected file crumb to include basename");

    // Click crumb \"a\" (index 1) to jump back one level.
    crumbButtons[1].dispatchEvent(new MouseEvent("click", { bubbles: true }));
    await wait(200);
    assert(Array.isArray(view.zoomStack) && view.zoomStack.length === 1 && view.zoomStack[0] === "a", `expected zoomStack=['a'] after crumb click, got ${JSON.stringify(view.zoomStack)}`);

    // Click file crumb (index 0) to return to full view.
    crumbButtons[0].dispatchEvent(new MouseEvent("click", { bubbles: true }));
    await wait(200);
    assert(Array.isArray(view.zoomStack) && view.zoomStack.length === 0, `expected zoomStack=[] after file crumb click, got ${JSON.stringify(view.zoomStack)}`);

    return { ok: true };
  } finally {
    try {
      // Restore settings.
      plugin.settings.fileOutlinerEnabledFiles = prevEnabledFiles;
      await plugin.saveSettings();
    } catch {
      // ignore
    }

    try {
      // Switch back to the previously active file (if any), then delete the temp note.
      if (prevActivePath) {
        const prev = app.vault.getAbstractFileByPath(prevActivePath);
        if (prev) await app.workspace.getLeaf(false).openFile(prev);
      }
    } catch {
      // ignore
    }

    try {
      const f = app.vault.getAbstractFileByPath(tmpPath);
      if (f) await app.vault.delete(f);
    } catch {
      // ignore
    }
  }
})();

