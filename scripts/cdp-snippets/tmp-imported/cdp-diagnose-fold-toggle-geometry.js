(async () => {
  const wait = (ms) => new Promise((r) => setTimeout(r, ms));

  const pluginId = "block-link-plus";
  const tmpFolder = "_blp_tmp";
  const tmpPath = `${tmpFolder}/file-outliner-fold-toggle-geometry.md`;

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
    `  [date:: ${now0}] [updated:: ${now0}] [blp_sys:: 1] [blp_ver:: 2] ^dummy`,
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

  const px = (v) => {
    const n = Number.parseFloat(String(v || ""));
    return Number.isFinite(n) ? n : null;
  };

  const pickRect = (el) => {
    if (!el) return null;
    const r = el.getBoundingClientRect();
    return {
      left: Math.round(r.left * 10) / 10,
      top: Math.round(r.top * 10) / 10,
      width: Math.round(r.width * 10) / 10,
      height: Math.round(r.height * 10) / 10,
      right: Math.round(r.right * 10) / 10,
      bottom: Math.round(r.bottom * 10) / 10,
      cx: Math.round((r.left + r.width / 2) * 10) / 10,
      cy: Math.round((r.top + r.height / 2) * 10) / 10,
    };
  };

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
    await wait(300);

    const view = app.workspace.activeLeaf?.view;
    const viewType = view?.getViewType?.() ?? null;
    if (viewType !== "blp-file-outliner-view") return { ok: false, viewType };

    const root = view.contentEl.querySelector(".blp-file-outliner-root") || view.contentEl;
    const blocksHost = root.querySelector(".blp-file-outliner-blocks") || root;

    const parentEl = blocksHost.querySelector('.ls-block[data-blp-outliner-id="parent"]');
    if (!parentEl) throw new Error("missing parent block DOM");

    // Activate to simulate the real UI state (shows caret via :focus-within / active class).
    const display = parentEl.querySelector('.blp-file-outliner-display');
    if (display) display.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    await wait(120);

    const main = parentEl.querySelector('.block-main-container');
    const controlWrap = parentEl.querySelector('.block-control-wrap');
    const fold = parentEl.querySelector('.blp-outliner-fold-toggle');
    const bulletContainer = parentEl.querySelector('.bullet-container');
    const bullet = parentEl.querySelector('.bullet');

    if (!main || !controlWrap || !fold || !bulletContainer || !bullet) {
      return {
        ok: false,
        missing: {
          main: !main,
          controlWrap: !controlWrap,
          fold: !fold,
          bulletContainer: !bulletContainer,
          bullet: !bullet,
        },
      };
    }

    const mainCs = getComputedStyle(main);
    const cwCs = getComputedStyle(controlWrap);
    const foldCs = getComputedStyle(fold);
    const foldArrowCs = getComputedStyle(fold, '::before');
    const bulletCs = getComputedStyle(bullet);
    const bulletContainerCs = getComputedStyle(bulletContainer);

    const arrowTop = px(foldArrowCs.borderTopWidth);
    const arrowBottom = px(foldArrowCs.borderBottomWidth);
    const arrowLeft = px(foldArrowCs.borderLeftWidth);
    const arrowH = (arrowTop ?? 0) + (arrowBottom ?? 0);
    const arrowW = arrowLeft ?? 0;

    const bulletW = px(bulletCs.width) ?? pickRect(bullet)?.width ?? null;
    const bulletH = px(bulletCs.height) ?? pickRect(bullet)?.height ?? null;

    const rectFold = pickRect(fold);
    const rectBulletC = pickRect(bulletContainer);
    const rectBullet = pickRect(bullet);

    return {
      ok: true,
      viewType,
      computed: {
        mainAlignItems: mainCs.alignItems,
        controlWrapAlignItems: cwCs.alignItems,
        controlWrapJustify: cwCs.justifyContent,
        foldTransform: foldCs.transform,
        bulletContainerTransform: bulletContainerCs.transform,
      },
      rects: {
        fold: rectFold,
        bulletContainer: rectBulletC,
        bullet: rectBullet,
      },
      deltas: {
        // Positive means fold center is below bullet center.
        foldCyMinusBulletCy: rectFold && rectBullet ? Math.round((rectFold.cy - rectBullet.cy) * 10) / 10 : null,
        foldCxMinusBulletCx: rectFold && rectBullet ? Math.round((rectFold.cx - rectBullet.cx) * 10) / 10 : null,
        bulletContainerCyMinusBulletCy:
          rectBulletC && rectBullet ? Math.round((rectBulletC.cy - rectBullet.cy) * 10) / 10 : null,
      },
      arrow: {
        borderTopWidth: foldArrowCs.borderTopWidth,
        borderBottomWidth: foldArrowCs.borderBottomWidth,
        borderLeftWidth: foldArrowCs.borderLeftWidth,
        // Visual bbox approximation for border-triangle.
        approxWidthPx: arrowW,
        approxHeightPx: arrowH,
        transform: foldArrowCs.transform,
      },
      bullet: {
        width: bulletCs.width,
        height: bulletCs.height,
        backgroundColor: bulletCs.backgroundColor,
      },
      approx: {
        arrowMinusBulletWidth: bulletW != null ? Math.round((arrowW - bulletW) * 10) / 10 : null,
        arrowMinusBulletHeight: bulletH != null ? Math.round((arrowH - bulletH) * 10) / 10 : null,
      },
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
