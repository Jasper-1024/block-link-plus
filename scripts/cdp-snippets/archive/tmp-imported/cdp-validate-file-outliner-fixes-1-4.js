(async () => {
  const wait = (ms) => new Promise((r) => setTimeout(r, ms));

  const pluginId = "block-link-plus";
  const tmpFolder = "_blp_tmp";
  const tmpPath = `${tmpFolder}/file-outliner-validate-1-4.md`;

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

  const measure = (view) => {
    const root = view.contentEl.querySelector('.blp-file-outliner-root') || view.contentEl;
    const blocksHost = root.querySelector('.blp-file-outliner-blocks') || root;

    const blocks = Array.from(blocksHost.querySelectorAll('.ls-block'));
    const hints = Array.from(blocksHost.querySelectorAll('.blp-outliner-insert-hint'));

    const rectOf = (sel) => {
      const el = blocksHost.querySelector(sel);
      if (!el) return null;
      const r = el.getBoundingClientRect();
      return { left: r.left, right: r.right, top: r.top, bottom: r.bottom, width: r.width, height: r.height };
    };

    const mainRect = (id) => rectOf(`.ls-block[data-blp-outliner-id="${id}"] > .block-main-container`);
    const gap = (a, b) => {
      const ra = mainRect(a);
      const rb = mainRect(b);
      if (!ra || !rb) return null;
      return Math.round((rb.top - ra.bottom) * 10) / 10;
    };

    const childContainer = blocksHost.querySelector('.ls-block[data-blp-outliner-id="a1"] .block-children');

    return {
      counts: { blocks: blocks.length, insertHints: hints.length },
      gaps: { v1_to_c1: gap('v1', 'c1'), c1_to_b1: gap('c1', 'b1') },
      widths: {
        blocksHost: rectOf('.blp-file-outliner-blocks'),
        childContainer: childContainer ? (() => {
          const r = childContainer.getBoundingClientRect();
          return { left: r.left, right: r.right, width: r.width };
        })() : null,
        childBlock: rectOf('.ls-block[data-blp-outliner-id="v1"]'),
        childDisplay: rectOf('.ls-block[data-blp-outliner-id="v1"] .blp-file-outliner-display'),
      },
    };
  };

  const patchInsertHintsToLastOnly = (view) => {
    const root = view.contentEl.querySelector('.blp-file-outliner-root') || view.contentEl;
    const blocksHost = root.querySelector('.blp-file-outliner-blocks') || root;

    // For every container that directly holds ls-block children, hide all hints except the last block's.
    const containers = [blocksHost, ...Array.from(blocksHost.querySelectorAll('.block-children'))];
    for (const container of containers) {
      const directBlocks = Array.from(container.children).filter(
        (el) => el instanceof HTMLElement && el.classList.contains('ls-block')
      );
      for (const b of directBlocks) {
        const hint = b.querySelector(':scope > .blp-outliner-insert-hint');
        if (hint) hint.style.display = 'none';
      }
      const last = directBlocks[directBlocks.length - 1];
      if (last) {
        const hint = last.querySelector(':scope > .blp-outliner-insert-hint');
        if (hint) hint.style.display = 'flex';
      }
    }
  };

  const patchChildrenContainerFullWidth = (view) => {
    const root = view.contentEl.querySelector('.blp-file-outliner-root') || view.contentEl;
    const blocksHost = root.querySelector('.blp-file-outliner-blocks') || root;

    // Mimic the intended CSS fix: the children list flex item should grow to fill the row.
    for (const el of Array.from(blocksHost.querySelectorAll('.block-children'))) {
      el.style.flex = '1 1 auto';
      el.style.minWidth = '0';
    }
  };

  const patchClickAtRightEdge = async (view) => {
    // Click near the right edge of the child display and see if edit mode enters.
    const root = view.contentEl.querySelector('.blp-file-outliner-root') || view.contentEl;
    const blocksHost = root.querySelector('.blp-file-outliner-blocks') || root;

    const vBlock = blocksHost.querySelector('.ls-block[data-blp-outliner-id="v1"]');
    const display = vBlock?.querySelector('.blp-file-outliner-display');
    if (!display) return { ok: false, reason: 'missing display' };

    // Reset editing.
    try {
      if (view.editingId) view.exitEditMode?.(view.editingId);
    } catch {
      // ignore
    }
    await wait(30);

    const before = view.editingId ?? null;

    const r = display.getBoundingClientRect();
    const pt = { x: Math.floor(r.right - 5), y: Math.floor(r.top + r.height / 2) };
    const hit = document.elementFromPoint(pt.x, pt.y);
    if (hit) hit.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    await wait(50);

    const after = view.editingId ?? null;
    return {
      ok: true,
      editingId: { before, after },
      point: pt,
      hit: hit ? { tag: hit.tagName, class: hit.className } : null,
    };
  };

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
      if (!app.vault.getAbstractFileByPath(tmpFolder)) await app.vault.createFolder(tmpFolder);
    } catch {
      // ignore
    }

    let f = app.vault.getAbstractFileByPath(tmpPath);
    if (!f) f = await app.vault.create(tmpPath, content);
    else await app.vault.modify(f, content);

    plugin.settings.fileOutlinerEnabledFiles = Array.from(new Set([...prevEnabledFiles, tmpPath]));
    await plugin.saveSettings();

    await app.workspace.getLeaf(false).openFile(f);
    await wait(250);

    const leaf = app.workspace.activeLeaf;
    const view = leaf?.view;
    const viewType = view?.getViewType?.() ?? null;
    if (viewType !== 'blp-file-outliner-view') {
      return { ok: false, step: 'open', viewType };
    }

    const before = measure(view);

    // Apply runtime patches.
    patchInsertHintsToLastOnly(view);
    patchChildrenContainerFullWidth(view);
    await wait(50);

    const after = measure(view);
    const clickTest = await patchClickAtRightEdge(view);

    return { ok: true, viewType, before, after, clickTest };
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
      const f = app.vault.getAbstractFileByPath(tmpPath);
      if (f) await app.vault.delete(f);
    } catch {
      // ignore
    }
  }
})();
