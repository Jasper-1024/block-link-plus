(async () => {
  const t0 = Date.now();
  const times = {};
  const step = async (name, fn) => {
    const s = Date.now();
    const r = await fn();
    times[name] = Date.now() - s;
    return r;
  };

  const pluginId = "block-link-plus";
  const tmpFolder = "_blp_tmp";
  const tmpPath = `${tmpFolder}/file-outliner-smoke-timing.md`;

  await step("reload:disable", () => app.plugins.disablePlugin(pluginId));
  await step("reload:enable", () => app.plugins.enablePlugin(pluginId));
  await new Promise((r) => setTimeout(r, 250));

  const plugin = app?.plugins?.plugins?.[pluginId];
  if (!plugin) throw new Error(`Plugin not found after reload: ${pluginId}`);

  const prevSettingsEnabledFiles = Array.isArray(plugin.settings?.fileOutlinerEnabledFiles)
    ? [...plugin.settings.fileOutlinerEnabledFiles]
    : [];

  const prevActivePath = app.workspace.getActiveFile?.()?.path ?? null;

  try {
    await step("vault:ensure-folder", async () => {
      try {
        if (!app.vault.getAbstractFileByPath(tmpFolder)) {
          await app.vault.createFolder(tmpFolder);
        }
      } catch {
        // ignore
      }
    });

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

    let f;
    await step("vault:create-or-modify", async () => {
      f = app.vault.getAbstractFileByPath(tmpPath);
      if (!f) f = await app.vault.create(tmpPath, content);
      else await app.vault.modify(f, content);
    });

    await step("settings:save", async () => {
      plugin.settings.fileOutlinerEnabledFiles = Array.from(new Set([...prevSettingsEnabledFiles, tmpPath]));
      await plugin.saveSettings();
    });

    await step("workspace:open-file", () => app.workspace.getLeaf(false).openFile(f));
    await new Promise((r) => setTimeout(r, 150));

    const leaf = app.workspace.activeLeaf;
    const view = leaf?.view;
    const viewType = view?.getViewType?.() ?? null;

    if (viewType !== "blp-file-outliner-view") {
      return { ok: false, step: "open", viewType };
    }

    const root = view.contentEl.querySelector(".blp-file-outliner-root") || view.contentEl;

    const firstDisplay = root.querySelector(".blp-file-outliner-display");
    if (!firstDisplay) throw new Error("No display element found");
    firstDisplay.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    await new Promise((r) => setTimeout(r, 50));

    const cm = view.editorView;
    if (!cm) throw new Error("No outliner CodeMirror editorView found");
    const cmContent = cm.contentDOM || cm.dom?.querySelector?.(".cm-content");
    if (!cmContent) throw new Error("No outliner CodeMirror contentDOM found");

    await step("cm:set-hello", async () => {
      cm.dispatch({ changes: { from: 0, to: cm.state.doc.length, insert: "hello" }, selection: { anchor: 5 } });
    });

    await step("cm:enter-split", async () => {
      cmContent.dispatchEvent(new KeyboardEvent("keydown", { key: "Enter", code: "Enter", bubbles: true, cancelable: true }));
      await new Promise((r) => setTimeout(r, 80));
    });

    await step("cm:blur", async () => {
      cmContent.blur();
      await new Promise((r) => setTimeout(r, 80));
    });

    return { ok: true, viewType, times, totalMs: Date.now() - t0 };
  } finally {
    await step("finally:restore-settings", async () => {
      try {
        plugin.settings.fileOutlinerEnabledFiles = prevSettingsEnabledFiles;
        await plugin.saveSettings();
      } catch {
        // ignore
      }
    });

    await step("finally:restore-active-file", async () => {
      try {
        if (prevActivePath) {
          const prev = app.vault.getAbstractFileByPath(prevActivePath);
          if (prev) await app.workspace.getLeaf(false).openFile(prev);
        }
      } catch {
        // ignore
      }
    });

    await step("finally:delete-tmp", async () => {
      try {
        const f = app.vault.getAbstractFileByPath(tmpPath);
        if (f) await app.vault.delete(f);
      } catch {
        // ignore
      }
    });
  }
})();
