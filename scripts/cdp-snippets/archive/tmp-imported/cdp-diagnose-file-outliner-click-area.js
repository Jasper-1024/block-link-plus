(async () => {
  const wait = (ms) => new Promise((r) => setTimeout(r, ms));

  const pluginId = "block-link-plus";
  const tmpFolder = "_blp_tmp";
  const tmpPath = `${tmpFolder}/file-outliner-ux-click-area.md`;

  const now0 = "2026-02-03T00:00:00";
  const now1 = "2026-02-03T00:00:01";
  const now2 = "2026-02-03T00:00:02";

  const content = [
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
    `  [date:: ${now0}] [updated:: ${now0}] [blp_sys:: 1] [blp_ver:: 2] ^sib`,
    "",
  ].join("\n");

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
    if (viewType !== "blp-file-outliner-view") {
      return { ok: false, step: "open", viewType, activeFile: app.workspace.getActiveFile?.()?.path ?? null };
    }

    const root = view.contentEl.querySelector(".blp-file-outliner-root") || view.contentEl;
    const blocksHost = root.querySelector(".blp-file-outliner-blocks") || root;

    const el = blocksHost.querySelector('.ls-block[data-blp-outliner-id="child"]');
    if (!el) throw new Error("child block missing");

    const main = el.querySelector('.block-main-container');
    const wrap = el.querySelector('.block-content-wrapper');
    const display = el.querySelector('.blp-file-outliner-display');

    const rEl = el.getBoundingClientRect();
    const rMain = main?.getBoundingClientRect();
    const rWrap = wrap?.getBoundingClientRect();
    const rDisplay = display?.getBoundingClientRect();

    const pick = (r) => (r ? { left: r.left, right: r.right, top: r.top, bottom: r.bottom, width: r.width, height: r.height } : null);

    const pt = rMain
      ? { x: Math.floor(rMain.right - 5), y: Math.floor(rMain.top + rMain.height / 2) }
      : null;

    const hit = pt ? document.elementFromPoint(pt.x, pt.y) : null;

    return {
      ok: true,
      viewType,
      tmpPath,
      rects: {
        block: pick(rEl),
        main: pick(rMain),
        wrap: pick(rWrap),
        display: pick(rDisplay),
        blocksHost: pick(blocksHost.getBoundingClientRect()),
      },
      hitTest: pt
        ? {
            point: pt,
            hit: hit ? { tag: hit.tagName, class: hit.className, id: hit.id } : null,
            hitIsInsideBlock: hit ? Boolean(hit.closest('.ls-block[data-blp-outliner-id="child"]')) : null,
          }
        : null,
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
      const f = app.vault.getAbstractFileByPath(tmpPath);
      if (f) await app.vault.delete(f);
    } catch {
      // ignore
    }
  }
})();
