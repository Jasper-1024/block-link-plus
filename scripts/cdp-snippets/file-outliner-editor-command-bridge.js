// CDP regression checks for Outliner editor command bridge + strict allowlist gate.
// Run:
//   node scripts/obsidian-cdp.js eval-file "scripts/cdp-snippets/file-outliner-editor-command-bridge.js"
//
// Validates (in Outliner edit mode):
// - core editor command executes (e.g. `editor:toggle-bold`)
// - non-allowlisted plugin editor command is blocked
// - allowlisted plugin editor command is allowed

(async () => {
  const wait = (ms) => new Promise((r) => setTimeout(r, ms));
  const assert = (cond, msg) => {
    if (!cond) throw new Error(msg);
  };

  const pluginId = "block-link-plus";
  const tmpFolder = "_blp_tmp";
  const tmpPath = `${tmpFolder}/file-outliner-editor-command-bridge.md`;

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

  const fakePluginId = "fake-plugin";
  const fakeCommandId = `${fakePluginId}:Wrap`;

  // Ensure Obsidian reloads the plugin after we rebuild `main.js`.
  await app.plugins.disablePlugin(pluginId);
  await app.plugins.enablePlugin(pluginId);
  await wait(250);

  const plugin = app?.plugins?.plugins?.[pluginId];
  if (!plugin) throw new Error(`Plugin not found after reload: ${pluginId}`);

  const prevEnabledFiles = Array.isArray(plugin.settings?.fileOutlinerEnabledFiles)
    ? [...plugin.settings.fileOutlinerEnabledFiles]
    : [];
  const prevBridgeEnabled =
    typeof plugin.settings?.fileOutlinerEditorCommandBridgeEnabled === "boolean"
      ? plugin.settings.fileOutlinerEditorCommandBridgeEnabled
      : true;
  const prevAllowed = Array.isArray(plugin.settings?.fileOutlinerEditorCommandAllowedPlugins)
    ? [...plugin.settings.fileOutlinerEditorCommandAllowedPlugins]
    : [];

  const prevManifest = app?.plugins?.manifests?.[fakePluginId];
  const prevFakeCommand = app?.commands?.commands?.[fakeCommandId];

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
    plugin.settings.fileOutlinerEditorCommandBridgeEnabled = true;
    plugin.settings.fileOutlinerEditorCommandAllowedPlugins = ["core"];
    await plugin.saveSettings();

    await app.workspace.getLeaf(false).openFile(f);
    await wait(350);

    const view = app.workspace.activeLeaf?.view;
    const viewType = view?.getViewType?.() ?? null;
    assert(viewType === "blp-file-outliner-view", `expected viewType=blp-file-outliner-view, got ${String(viewType)}`);

    const root = view.contentEl.querySelector(".blp-file-outliner-root") || view.contentEl;
    const blocksHost = root.querySelector(".blp-file-outliner-blocks") || root;

    // Enter edit mode.
    const display = blocksHost.querySelector(`.ls-block[data-blp-outliner-id="a1"] .blp-file-outliner-display`);
    assert(display, "missing display for a1");
    display.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    await wait(140);
    assert(view.editingId === "a1", `expected editingId='a1', got ${String(view.editingId)}`);

    // Select "hello".
    view.suggestEditor.setSelection({ line: 0, ch: 0 }, { line: 0, ch: 5 });

    // Core editor command should execute (uses activeEditor bridge).
    const okBold = await app.commands.executeCommandById("editor:toggle-bold");
    assert(okBold !== false, "expected editor:toggle-bold to execute");
    assert(view.suggestEditor.getValue() === "**hello**", `expected '**hello**', got '${view.suggestEditor.getValue()}'`);

    // Reset editor content for the fake command checks.
    view.suggestEditor.setValue("hello");
    view.suggestEditor.setSelection({ line: 0, ch: 0 }, { line: 0, ch: 5 });

    // Install a synthetic plugin manifest so the gate can attribute ownership.
    if (!app.plugins.manifests) app.plugins.manifests = {};
    app.plugins.manifests[fakePluginId] = { id: fakePluginId, name: "Fake Plugin (CDP)" };

    // Install a synthetic editor command that wraps the current selection.
    app.commands.commands[fakeCommandId] = {
      id: fakeCommandId,
      name: "Fake: Wrap",
      editorCallback(editor) {
        const sel = String(editor.getSelection?.() ?? "");
        editor.replaceSelection?.(`<<${sel}>>`);
      },
      checkCallback(checking) {
        if (checking) return true;
        // Fall back to activeEditor for safety (mirrors real-world gating patterns).
        const ae = app.workspace.activeEditor;
        if (!ae?.editor) return null;
        const sel = String(ae.editor.getSelection?.() ?? "");
        ae.editor.replaceSelection?.(`<<${sel}>>`);
        return true;
      },
    };

    // Not allowlisted -> blocked.
    plugin.settings.fileOutlinerEditorCommandAllowedPlugins = ["core"];
    await plugin.saveSettings();
    const beforeBlocked = view.suggestEditor.getValue();
    const okBlocked = await app.commands.executeCommandById(fakeCommandId);
    assert(okBlocked === false || view.suggestEditor.getValue() === beforeBlocked, "expected fake command to be blocked");
    assert(view.suggestEditor.getValue() === "hello", `expected 'hello' unchanged, got '${view.suggestEditor.getValue()}'`);

    // Allowlisted -> executes.
    plugin.settings.fileOutlinerEditorCommandAllowedPlugins = ["core", fakePluginId];
    await plugin.saveSettings();
    const okAllowed = await app.commands.executeCommandById(fakeCommandId);
    assert(okAllowed !== false, "expected allowlisted fake command to execute");
    assert(view.suggestEditor.getValue() === "<<hello>>", `expected '<<hello>>', got '${view.suggestEditor.getValue()}'`);

    return { ok: true };
  } finally {
    try {
      plugin.settings.fileOutlinerEnabledFiles = prevEnabledFiles;
      plugin.settings.fileOutlinerEditorCommandBridgeEnabled = prevBridgeEnabled;
      plugin.settings.fileOutlinerEditorCommandAllowedPlugins = prevAllowed;
      await plugin.saveSettings();
    } catch {
      // ignore
    }

    try {
      if (prevManifest) app.plugins.manifests[fakePluginId] = prevManifest;
      else delete app.plugins.manifests[fakePluginId];
    } catch {
      // ignore
    }

    try {
      if (prevFakeCommand) app.commands.commands[fakeCommandId] = prevFakeCommand;
      else delete app.commands.commands[fakeCommandId];
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

