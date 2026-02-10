// CDP regression checks for outliner v2 task markers + block-internal markdown validation.
// Run:
//   node scripts/obsidian-cdp.js eval-file "scripts/cdp-snippets/file-outliner-tasks-and-validation.js"
//
// Covers:
// - Task blocks preserve `[ ]`/`[x]` markers as plain text in the outliner view.
// - Blocks containing list/heading syntax show a warning banner and render sanitized content (no nested structure).

(async () => {
  const wait = (ms) => new Promise((r) => setTimeout(r, ms));
  const assert = (cond, msg) => {
    if (!cond) throw new Error(msg);
  };

  const pluginId = "block-link-plus";
  const tmpFolder = "_blp_tmp";
  const tmpPath = `${tmpFolder}/file-outliner-tasks-and-validation.md`;

  const now0 = "2026-02-03T00:00:00";
  const now1 = "2026-02-03T00:00:01";

  const content = [
    "---",
    "blp_outliner: true",
    "---",
    "",
    "- [ ] task block",
    `  [date:: ${now0}] [updated:: ${now0}] [blp_sys:: 1] [blp_ver:: 2] ^task`,
    "- parent",
    `  [date:: ${now1}] [updated:: ${now1}] [blp_sys:: 1] [blp_ver:: 2] ^p`,
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

    // --- Task marker: visible text preserves `[ ]`.
    const taskRow = blocksHost.querySelector(`.ls-block[data-blp-outliner-id="task"]`);
    assert(taskRow, "missing task row");
    const taskText = String(taskRow.textContent || "");
    assert(taskText.includes("[ ]"), `expected task row to include '[ ]', got: ${taskText}`);
    assert(!taskRow.querySelector(".blp-outliner-block-warning"), "did not expect a warning banner on the task row");

    // --- Block-internal markdown validation + sanitization.
    // Inject invalid block text into the view model and force a re-render of that block.
    const parent = view.blockById?.get?.("p");
    assert(parent, "missing parent block in view model");

    parent.text = [
      "parent",
      "- not a real child (should warn + sanitize)",
      "## not a real heading (should warn + sanitize)",
      "```js",
      "- inside fence (no warning expected)",
      "## inside fence (no warning expected)",
      "```",
    ].join("\n");

    view.renderBlockDisplay?.("p");
    await wait(400);

    const parentRow = blocksHost.querySelector(`.ls-block[data-blp-outliner-id="p"]`);
    assert(parentRow, "missing parent row");
    const banner = parentRow.querySelector(".blp-outliner-block-warning");
    assert(banner, "expected warning banner for parent block");

    const display = parentRow.querySelector(".blp-file-outliner-display");
    assert(display, "missing display node for parent block");

    // Sanitized render MUST not create nested structure.
    assert(!display.querySelector("ul, ol"), "expected sanitized render to avoid nested lists");
    assert(!display.querySelector("h1, h2, h3, h4, h5, h6"), "expected sanitized render to avoid headings");

    const displayText = String(display.textContent || "");
    assert(displayText.includes("- not a real child"), "expected list line to render as literal text");
    assert(displayText.includes("## not a real heading"), "expected heading line to render as literal text");

    return { ok: true };
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

