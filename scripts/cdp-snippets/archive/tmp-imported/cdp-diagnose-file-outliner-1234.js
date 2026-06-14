(async () => {
  const wait = (ms) => new Promise((r) => setTimeout(r, ms));

  const pluginId = "block-link-plus";
  const tmpFolder = "_blp_tmp";
  const tmpPath = `${tmpFolder}/file-outliner-ux-1234.md`;

  const now0 = "2026-02-03T00:00:00";
  const now1 = "2026-02-03T00:00:01";
  const now2 = "2026-02-03T00:00:02";
  const now3 = "2026-02-03T00:00:03";

  const content = [
    "---",
    "blp_outliner: true",
    "---",
    "",
    "- a",
    "  - v",
    `    [date:: ${now1}] [updated:: ${now1}] [blp_sys:: 1] [blp_ver:: 2] ^v1`,
    "  - c",
    `    [date:: ${now2}] [updated:: ${now2}] [blp_sys:: 1] [blp_ver:: 2] ^c1`,
    "  - b",
    `    [date:: ${now3}] [updated:: ${now3}] [blp_sys:: 1] [blp_ver:: 2] ^b1`,
    "  ",
    `  [date:: ${now0}] [updated:: ${now0}] [blp_sys:: 1] [blp_ver:: 2] ^a1`,
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

  const diag = {
    tmpPath,
    viewType: null,
    counts: {},
    issue1: {},
    issue2: {},
    issue3: {},
    issue4: {},
  };

  try {
    // Ensure folder.
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

    const leaf = app.workspace.activeLeaf;
    const view = leaf?.view;
    diag.viewType = view?.getViewType?.() ?? null;

    if (diag.viewType !== "blp-file-outliner-view") {
      return { ok: false, step: "open", ...diag, activeFile: app.workspace.getActiveFile?.()?.path ?? null };
    }

    const root = view.contentEl.querySelector(".blp-file-outliner-root") || view.contentEl;
    const blocksHost = root.querySelector(".blp-file-outliner-blocks") || root;

    const allBlocks = Array.from(blocksHost.querySelectorAll(".ls-block"));
    const allInsertHints = Array.from(blocksHost.querySelectorAll(".blp-outliner-insert-hint"));

    diag.counts = {
      blocks: allBlocks.length,
      insertHints: allInsertHints.length,
    };

    // Issue 1: insert hint multiplicity + layout impact.
    const ids = ["v1", "c1", "b1", "a1"];
    const hintById = {};
    const mainById = {};
    for (const id of ids) {
      const el = blocksHost.querySelector(`.ls-block[data-blp-outliner-id="${id}"]`);
      if (!el) continue;
      const main = el.querySelector(".block-main-container");
      const hint = el.querySelector(".blp-outliner-insert-hint");
      if (main) {
        const r = main.getBoundingClientRect();
        mainById[id] = { top: r.top, bottom: r.bottom, height: r.height };
      }
      if (hint) {
        const r = hint.getBoundingClientRect();
        const cs = getComputedStyle(hint);
        hintById[id] = {
          display: cs.display,
          opacity: cs.opacity,
          height: r.height,
        };
      }
    }

    const gap = (fromId, toId) => {
      const a = mainById[fromId];
      const b = mainById[toId];
      if (!a || !b) return null;
      return Math.round((b.top - a.bottom) * 10) / 10;
    };

    diag.issue1 = {
      perBlockHintPresent: {
        v1: Boolean(hintById.v1),
        c1: Boolean(hintById.c1),
        b1: Boolean(hintById.b1),
        a1: Boolean(hintById.a1),
      },
      hintStyle: hintById,
      mainRect: mainById,
      siblingMainGaps: {
        v1_to_c1: gap("v1", "c1"),
        c1_to_b1: gap("c1", "b1"),
      },
    };

    // Issue 4: click target area (right-side click doesn't enter edit).
    const beforeEditing = view.editingId ?? null;

    // Click on wrapper (simulates clicking in the row area outside the display).
    const vEl = blocksHost.querySelector('.ls-block[data-blp-outliner-id="v1"]');
    const vWrap = vEl?.querySelector('.block-content-wrapper');
    if (vWrap) vWrap.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    await wait(50);
    const afterWrapClick = view.editingId ?? null;

    // Click on display (should enter edit).
    const vDisplay = vEl?.querySelector('.blp-file-outliner-display');
    if (vDisplay) vDisplay.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    await wait(50);
    const afterDisplayClick = view.editingId ?? null;

    diag.issue4 = {
      editingId: { before: beforeEditing, afterWrapClick, afterDisplayClick },
      wrapClickTargetTag: vWrap?.tagName ?? null,
    };

    // Ensure parent is active to show fold toggle.
    const aEl = blocksHost.querySelector('.ls-block[data-blp-outliner-id="a1"]');
    const aDisplay = aEl?.querySelector('.blp-file-outliner-display');
    if (aDisplay) aDisplay.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    await wait(50);

    // Issue 2: fold toggle geometry vs bullet.
    const fold = aEl?.querySelector('.blp-outliner-fold-toggle');
    const bulletContainer = aEl?.querySelector('.bullet-container');
    if (fold && bulletContainer) {
      const fr = fold.getBoundingClientRect();
      const br = bulletContainer.getBoundingClientRect();
      const fcs = getComputedStyle(fold);
      const bcs = getComputedStyle(bulletContainer);
      diag.issue2 = {
        fold: {
          opacity: fcs.opacity,
          transform: fcs.transform,
          rect: { left: fr.left, top: fr.top, width: fr.width, height: fr.height },
          center: { x: fr.left + fr.width / 2, y: fr.top + fr.height / 2 },
        },
        bulletContainer: {
          transform: bcs.transform,
          rect: { left: br.left, top: br.top, width: br.width, height: br.height },
          center: { x: br.left + br.width / 2, y: br.top + br.height / 2 },
        },
        centerDelta: {
          dx: Math.round(((fr.left + fr.width / 2) - (br.left + br.width / 2)) * 10) / 10,
          dy: Math.round(((fr.top + fr.height / 2) - (br.top + br.height / 2)) * 10) / 10,
        },
      };
    }

    // Issue 3: zoom header contents.
    const bullet = aEl?.querySelector('.bullet-container');
    if (bullet) bullet.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    await wait(200);

    const header = root.querySelector('.blp-file-outliner-zoom-header');
    const headerText = header ? header.textContent : null;
    diag.issue3 = {
      headerDisplay: header ? getComputedStyle(header).display : null,
      headerText,
      activeFile: app.workspace.getActiveFile?.()?.path ?? null,
    };

    return { ok: true, ...diag };
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
