// CDP regression checks for outliner v2 editor context menu bridge.
// Run:
//   node scripts/obsidian-cdp.js eval-file "scripts/cdp-snippets/file-outliner-editor-context-menu-bridge.js"
//
// Notes:
// - We validate the *menu builder* using a spy menu (native context menus are not capturable via CDP screenshots).
// - Also validates allowlist filtering by injecting a synthetic `editor-menu` handler with a `plugin:<id>` sourceURL.

(async () => {
  const wait = (ms) => new Promise((r) => setTimeout(r, ms));
  const assert = (cond, msg) => {
    if (!cond) throw new Error(msg);
  };

  const pluginId = "block-link-plus";
  const tmpFolder = "_blp_tmp";
  const tmpPath = `${tmpFolder}/file-outliner-editor-context-menu-bridge.md`;

  const now0 = "2026-02-03T00:00:00";
  const content = [
    "---",
    "blp_outliner: true",
    "---",
    "",
    "- hello",
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
  const prevAllowedPlugins = Array.isArray(plugin.settings?.fileOutlinerEditorContextMenuAllowedPlugins)
    ? [...plugin.settings.fileOutlinerEditorContextMenuAllowedPlugins]
    : [];

  // We'll install a synthetic handler into workspace._["editor-menu"].
  const ws = app.workspace;
  const wsAny = ws;
  const handlerArr = Array.isArray(wsAny._?.["editor-menu"]) ? wsAny._["editor-menu"] : null;
  const handlerStartLen = handlerArr ? handlerArr.length : 0;

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
    await wait(300);

    const view = app.workspace.activeLeaf?.view;
    const viewType = view?.getViewType?.() ?? null;
    assert(viewType === "blp-file-outliner-view", `expected viewType=blp-file-outliner-view, got ${String(viewType)}`);

    const root = view.contentEl.querySelector(".blp-file-outliner-root") || view.contentEl;
    const blocksHost = root.querySelector(".blp-file-outliner-blocks") || root;

    // Enter edit mode.
    const display = blocksHost.querySelector(`.ls-block[data-blp-outliner-id="a1"] .blp-file-outliner-display`);
    assert(display, "missing display for a1");
    display.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    await wait(120);
    assert(view.editingId === "a1", `expected editingId='a1', got ${String(view.editingId)}`);

    // Spy menu helpers.
    const buildSpyMenu = () => {
      const entries = [];
      const makeItem = () => {
        const state = { title: "", disabled: false };
        let proxy = null;
        proxy = new Proxy(
          {},
          {
            get(_t, prop) {
              if (prop === "setTitle") return (t) => ((state.title = String(t ?? "")), proxy);
              if (prop === "setDisabled") return (d) => ((state.disabled = !!d), proxy);
              if (prop === "onClick") return (_fn) => proxy;
              if (prop === "setIcon") return (_x) => proxy;
              if (prop === "setSection") return (_x) => proxy;
              return () => proxy;
            },
          }
        );
        entries.push(state);
        return proxy;
      };

      const menu = {
        addItem(cb) {
          cb(makeItem());
        },
        addSeparator() {
          entries.push({ sep: true });
        },
      };
      return { menu, entries };
    };

    const getTitles = (entries) =>
      entries
        .filter((e) => !e.sep)
        .map((e) => String(e.title || "").trim())
        .filter(Boolean);

    const assertNonEmptyTitleAt = (entries, idx) => {
      const e = entries[idx];
      assert(e && !e.sep, `expected entry[${idx}] to be a menu item`);
      assert(String(e.title || "").trim().length > 0, `expected entry[${idx}] to have a non-empty title`);
    };

    // Base menu includes: 4 clipboard items + separator + 3 BLP block-copy items (language-agnostic assertions).
    plugin.settings.fileOutlinerEditorContextMenuAllowedPlugins = [];
    await plugin.saveSettings();

    {
      const { menu, entries } = buildSpyMenu();
      view.buildEditorContextMenu(menu);
      assert(entries.length === 8, `expected 8 menu entries, got ${entries.length}`);
      assert(entries[4]?.sep === true, "expected a separator after the 4 clipboard items");
      for (const idx of [0, 1, 2, 3, 5, 6, 7]) assertNonEmptyTitleAt(entries, idx);
    }

    // Inject a synthetic plugin editor-menu handler and verify allowlist filtering.
    if (!handlerArr) {
      return { ok: true, skipped: "workspace._['editor-menu'] unavailable" };
    }

    const fakeId = "fake-plugin";
    const fakeTitle = "FAKE MENU ITEM";
    const fakeFn = eval(
      `(menu, editor, view) => { menu.addItem((item) => item.setTitle(${JSON.stringify(fakeTitle)})); }\n` +
        `//# sourceURL=plugin:${fakeId}:1`
    );
    handlerArr.push({ e: ws, name: "editor-menu", fn: fakeFn, ctx: undefined });

    // Allowlisted -> appears.
    plugin.settings.fileOutlinerEditorContextMenuAllowedPlugins = [fakeId];
    await plugin.saveSettings();
    {
      const { menu, entries } = buildSpyMenu();
      view.buildEditorContextMenu(menu);
      const titles = getTitles(entries);
      assert(titles.includes(fakeTitle), "expected allowlisted fake plugin item to appear");
    }

    // Not allowlisted -> filtered out.
    plugin.settings.fileOutlinerEditorContextMenuAllowedPlugins = [];
    await plugin.saveSettings();
    {
      const { menu, entries } = buildSpyMenu();
      view.buildEditorContextMenu(menu);
      const titles = getTitles(entries);
      assert(!titles.includes(fakeTitle), "expected non-allowlisted fake plugin item to be filtered out");
    }

    return { ok: true };
  } finally {
    try {
      plugin.settings.fileOutlinerEnabledFiles = prevEnabledFiles;
      plugin.settings.fileOutlinerEditorContextMenuAllowedPlugins = prevAllowedPlugins;
      await plugin.saveSettings();
    } catch {
      // ignore
    }

    try {
      if (handlerArr) handlerArr.splice(handlerStartLen);
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
