// CDP snippet: verify the Markdown <-> Outliner "open as" toggle works for scoped files.
// Run:
//   node scripts/obsidian-cdp.js eval-file "scripts/cdp-snippets/file-outliner-open-as-toggle.js"

(async () => {
  const wait = (ms) => new Promise((r) => setTimeout(r, ms));

  const pluginId = "block-link-plus";
  const tmpFolder = "_blp_tmp";
  const tmpPath = `${tmpFolder}/file-outliner-open-as-toggle.md`;

  await app.plugins.disablePlugin(pluginId);
  await app.plugins.enablePlugin(pluginId);
  await wait(250);

  const plugin = app?.plugins?.plugins?.[pluginId];
  if (!plugin) throw new Error(`Plugin not found after reload: ${pluginId}`);

  const prevSettingsEnabledFiles = Array.isArray(plugin.settings?.fileOutlinerEnabledFiles)
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

    const now = "2026-02-03T00:00:00";
    const content = [
      "---",
      "blp_outliner: true",
      "---",
      "",
      "- a",
      `  [date:: ${now}] [updated:: ${now}] [blp_sys:: 1] [blp_ver:: 2] ^aa`,
      "",
    ].join("\n");

    let f = app.vault.getAbstractFileByPath(tmpPath);
    if (!f) {
      f = await app.vault.create(tmpPath, content);
    } else {
      await app.vault.modify(f, content);
    }

    plugin.settings.fileOutlinerEnabledFiles = Array.from(new Set([...prevSettingsEnabledFiles, tmpPath]));
    await plugin.saveSettings();

    await app.workspace.getLeaf(false).openFile(f);
    await wait(150);

    const leaf1 = app.workspace.activeLeaf;
    const view1 = leaf1?.view;
    const type1 = view1?.getViewType?.() ?? null;
    if (type1 !== "blp-file-outliner-view") throw new Error(`expected outliner view, got: ${String(type1)}`);

    await view1.openSourceMarkdownView({ newLeaf: false });
    await wait(200);

    const leaf2 = app.workspace.activeLeaf;
    const view2 = leaf2?.view;
    const type2 = view2?.getViewType?.() ?? null;
    if (type2 !== "markdown") throw new Error(`expected markdown view, got: ${String(type2)}`);

    // Call onPaneMenu with a spy menu to capture the injected toggle action without opening the UI.
    const captured = [];
    const spyMenu = new Proxy(
      {},
      {
        get(_t, prop) {
          if (prop === "addSeparator") return () => {};
          if (prop === "addItem")
            return (cb) => {
              let title = "";
              let icon = "";
              let click = null;
              const item = {
                setTitle: (t) => {
                  title = String(t);
                  return item;
                },
                setIcon: (i) => {
                  icon = String(i);
                  return item;
                },
                onClick: (fn) => {
                  click = fn;
                  return item;
                },
                setChecked: () => item,
                setDisabled: () => item,
                setSection: () => item,
              };
              cb(item);
              captured.push({ title, icon, click });
            };
          return () => {};
        },
      }
    );

    view2.onPaneMenu(spyMenu, "more-options");
    const possibleTitles = new Set([
      "Open as Outliner",
      "打开为 Outliner",
      "以 Outliner 開啟",
    ]);

    const openAsOutliner = captured.find((i) => possibleTitles.has(i.title));
    if (!openAsOutliner?.click) {
      throw new Error(
        `"Open as Outliner" menu item not found; captured: ${captured.map((i) => i.title).join(", ")}`
      );
    }

    openAsOutliner.click();
    await wait(200);

    const leaf3 = app.workspace.activeLeaf;
    const view3 = leaf3?.view;
    const type3 = view3?.getViewType?.() ?? null;

    return {
      ok: true,
      view: { before: type1, markdown: type2, after: type3 },
      expected: { after: "blp-file-outliner-view" },
    };
  } finally {
    try {
      plugin.settings.fileOutlinerEnabledFiles = prevSettingsEnabledFiles;
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
