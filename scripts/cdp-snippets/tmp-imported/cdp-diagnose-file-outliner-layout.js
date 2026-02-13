(async () => {
  const wait = (ms) => new Promise((r) => setTimeout(r, ms));

  const pluginId = "block-link-plus";
  const tmpFolder = "_blp_tmp";
  const tmpPath = `${tmpFolder}/file-outliner-ux-layout.md`;

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

  const csPick = (el) => {
    if (!el) return null;
    const cs = getComputedStyle(el);
    return {
      display: cs.display,
      position: cs.position,
      width: cs.width,
      maxWidth: cs.maxWidth,
      alignItems: cs.alignItems,
      justifyContent: cs.justifyContent,
      flexDirection: cs.flexDirection,
      flexWrap: cs.flexWrap,
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

    const block = blocksHost.querySelector('.ls-block[data-blp-outliner-id="child"]');
    const parent = block?.parentElement;

    return {
      ok: true,
      viewType,
      tmpPath,
      styles: {
        root: csPick(root),
        blocksHost: csPick(blocksHost),
        blockParent: csPick(parent),
        block: csPick(block),
      },
      classNames: {
        root: root.className,
        blocksHost: blocksHost.className,
        blockParent: parent?.className ?? null,
        block: block?.className ?? null,
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
