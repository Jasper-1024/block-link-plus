// Setup for measuring whether task hotkeys trigger CM6 keymap, Obsidian command, or both.
(async () => {
  const wait = (ms) => new Promise((r) => setTimeout(r, ms));
  const assert = (cond, msg) => { if (!cond) throw new Error(msg); };

  const pluginId = 'block-link-plus';
  const tmpFolder = '_blp_tmp';
  const tmpPath = `${tmpFolder}/_cdp_task_hotkey_dispatch.md`;

  const now0 = '2026-02-12T00:00:00';
  const content = [
    '---',
    'blp_outliner: true',
    '---',
    '',
    '- hello',
    `  [date:: ${now0}] [updated:: ${now0}] [blp_sys:: 1] [blp_ver:: 2] ^a`,
    '',
  ].join('\n');

  await app.plugins.disablePlugin(pluginId);
  await app.plugins.enablePlugin(pluginId);
  await wait(250);

  const plugin = app?.plugins?.plugins?.[pluginId];
  assert(plugin, 'plugin not found');

  const prevEnabledFiles = Array.isArray(plugin.settings?.fileOutlinerEnabledFiles)
    ? [...plugin.settings.fileOutlinerEnabledFiles]
    : [];

  try {
    if (!app.vault.getAbstractFileByPath(tmpFolder)) {
      try { await app.vault.createFolder(tmpFolder); } catch {}
    }

    let f = app.vault.getAbstractFileByPath(tmpPath);
    if (!f) f = await app.vault.create(tmpPath, content);
    else await app.vault.modify(f, content);

    plugin.settings.fileOutlinerEnabledFiles = Array.from(new Set([...prevEnabledFiles, tmpPath]));
    await plugin.saveSettings();

    await app.workspace.getLeaf(false).openFile(f);
    await wait(350);

    const view = app.workspace.activeLeaf?.view;
    assert(view?.getViewType?.() === 'blp-file-outliner-view', 'not in outliner view');

    const root = view.contentEl.querySelector('.blp-file-outliner-root') || view.contentEl;
    const blocksHost = root.querySelector('.blp-file-outliner-blocks') || root;

    // Enter edit mode.
    const aDisplay = blocksHost.querySelector('.ls-block[data-blp-outliner-id="a"] .blp-file-outliner-display');
    assert(aDisplay, 'missing a display');
    aDisplay.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    await wait(150);
    assert(view.editingId === 'a', `expected editingId=a, got ${String(view.editingId)}`);

    const editor = view.editorView;
    assert(editor, 'missing editor');
    editor.dispatch({ changes: { from: 0, to: editor.state.doc.length, insert: 'hello' }, selection: { anchor: 5 } });
    await wait(100);

    const counters = {
      onEditorToggleTask: 0,
      onEditorToggleTaskMarker: 0,
      toggleActiveTaskStatus: 0,
      toggleActiveTaskMarker: 0,
      executeCommandById: 0,
      executed: [],
    };

    const original = {
      onEditorToggleTask: view.onEditorToggleTask?.bind?.(view),
      onEditorToggleTaskMarker: view.onEditorToggleTaskMarker?.bind?.(view),
      toggleActiveTaskStatus: view.toggleActiveTaskStatus?.bind?.(view),
      toggleActiveTaskMarker: view.toggleActiveTaskMarker?.bind?.(view),
      executeCommandById: app.commands.executeCommandById?.bind?.(app.commands),
    };

    // Wrap.
    if (typeof original.onEditorToggleTask === 'function') {
      view.onEditorToggleTask = (...args) => {
        counters.onEditorToggleTask += 1;
        return original.onEditorToggleTask(...args);
      };
    }

    if (typeof original.onEditorToggleTaskMarker === 'function') {
      view.onEditorToggleTaskMarker = (...args) => {
        counters.onEditorToggleTaskMarker += 1;
        return original.onEditorToggleTaskMarker(...args);
      };
    }

    if (typeof original.toggleActiveTaskStatus === 'function') {
      view.toggleActiveTaskStatus = (...args) => {
        counters.toggleActiveTaskStatus += 1;
        return original.toggleActiveTaskStatus(...args);
      };
    }

    if (typeof original.toggleActiveTaskMarker === 'function') {
      view.toggleActiveTaskMarker = (...args) => {
        counters.toggleActiveTaskMarker += 1;
        return original.toggleActiveTaskMarker(...args);
      };
    }

    if (typeof original.executeCommandById === 'function') {
      app.commands.executeCommandById = (id, ...rest) => {
        counters.executeCommandById += 1;
        try { counters.executed.push(String(id)); } catch {}
        return original.executeCommandById(id, ...rest);
      };
    }

    window.__blpHotkeyTest = {
      tmpPath,
      prevEnabledFiles,
      counters,
      getEditorDoc: () => String(view.editorView?.state?.doc?.toString?.() ?? ''),
      restore: async () => {
        try {
          if (typeof original.onEditorToggleTask === 'function') view.onEditorToggleTask = original.onEditorToggleTask;
          if (typeof original.onEditorToggleTaskMarker === 'function') view.onEditorToggleTaskMarker = original.onEditorToggleTaskMarker;
          if (typeof original.toggleActiveTaskStatus === 'function') view.toggleActiveTaskStatus = original.toggleActiveTaskStatus;
          if (typeof original.toggleActiveTaskMarker === 'function') view.toggleActiveTaskMarker = original.toggleActiveTaskMarker;
          if (typeof original.executeCommandById === 'function') app.commands.executeCommandById = original.executeCommandById;
        } catch {}
        try {
          plugin.settings.fileOutlinerEnabledFiles = prevEnabledFiles;
          await plugin.saveSettings();
        } catch {}
        try {
          const f2 = app.vault.getAbstractFileByPath(tmpPath);
          if (f2) await app.vault.delete(f2);
        } catch {}
      },
    };

    return { ok: true, tmpPath };
  } catch (e) {
    try {
      // best-effort cleanup
      plugin.settings.fileOutlinerEnabledFiles = prevEnabledFiles;
      await plugin.saveSettings();
    } catch {}
    throw e;
  }
})();
