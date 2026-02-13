(async () => {
  const t0 = Date.now();
  const times = {};
  const step = async (name, fn) => {
    const s = Date.now();
    const r = await fn();
    times[name] = Date.now() - s;
    return r;
  };

  const wait = (ms) => new Promise((r) => setTimeout(r, ms));
  const waitFor = async (cond, { timeoutMs = 2000, intervalMs = 50 } = {}) => {
    const start = Date.now();
    while (Date.now() - start < timeoutMs) {
      try {
        if (cond()) return true;
      } catch {
        // ignore
      }
      await wait(intervalMs);
    }
    return false;
  };

  const pluginId = "block-link-plus";
  const tmpFolder = "_blp_tmp";
  const tmpPath = `${tmpFolder}/file-outliner-smoke-timing-full.md`;

  await step("reload:disable", () => app.plugins.disablePlugin(pluginId));
  await step("reload:enable", () => app.plugins.enablePlugin(pluginId));
  await wait(250);

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
    await wait(150);

    const leaf = app.workspace.activeLeaf;
    const view = leaf?.view;
    const viewType = view?.getViewType?.() ?? null;

    if (viewType !== "blp-file-outliner-view") {
      return { ok: false, step: "open", viewType };
    }

    const root = view.contentEl.querySelector(".blp-file-outliner-root") || view.contentEl;

    // Activate first block.
    await step("ui:activate-first", async () => {
      const firstDisplay = root.querySelector(".blp-file-outliner-display");
      if (!firstDisplay) throw new Error("No display element found");
      firstDisplay.dispatchEvent(new MouseEvent("click", { bubbles: true }));
      await wait(50);
    });

    const cm = view.editorView;
    if (!cm) throw new Error("No outliner CodeMirror editorView found");
    const cmContent = cm.contentDOM || cm.dom?.querySelector?.(".cm-content");
    if (!cmContent) throw new Error("No outliner CodeMirror contentDOM found");

    await step("cm:type-hello", async () => {
      cm.dispatch({ changes: { from: 0, to: cm.state.doc.length, insert: "hello" }, selection: { anchor: 5 } });
    });

    await step("cm:enter-split", async () => {
      cmContent.dispatchEvent(new KeyboardEvent("keydown", { key: "Enter", code: "Enter", bubbles: true, cancelable: true }));
      await wait(80);
    });

    const countAfterEnter = root.querySelectorAll(".ls-block").length;

    await step("cm:backspace-merge", async () => {
      cm.dispatch({ selection: { anchor: 0 } });
      cmContent.dispatchEvent(new KeyboardEvent("keydown", { key: "Backspace", code: "Backspace", bubbles: true, cancelable: true }));
      await wait(80);
    });

    const countAfterBackspace = root.querySelectorAll(".ls-block").length;

    await step("cm:enter-new-sibling", async () => {
      cm.dispatch({ selection: { anchor: cm.state.doc.length } });
      cmContent.dispatchEvent(new KeyboardEvent("keydown", { key: "Enter", code: "Enter", bubbles: true, cancelable: true }));
      await wait(80);
    });

    await step("cm:tab-indent", async () => {
      cm.dispatch({ selection: { anchor: 0 } });
      cmContent.dispatchEvent(new KeyboardEvent("keydown", { key: "Tab", code: "Tab", bubbles: true, cancelable: true }));
      await wait(80);
    });

    const rootDirectChildrenAfterIndent = Array.from((root.querySelector(".blp-file-outliner-root") || root).children)
      .filter((el) => el.classList && el.classList.contains("ls-block")).length;

    await step("cm:shift-tab-outdent", async () => {
      cmContent.dispatchEvent(new KeyboardEvent("keydown", { key: "Tab", code: "Tab", shiftKey: true, bubbles: true, cancelable: true }));
      await wait(80);
    });

    const rootDirectChildrenAfterOutdent = Array.from((root.querySelector(".blp-file-outliner-root") || root).children)
      .filter((el) => el.classList && el.classList.contains("ls-block")).length;

    await step("ui:activate-first-again", async () => {
      const firstBullet = root.querySelector(".ls-block .bullet-container");
      if (firstBullet) {
        firstBullet.dispatchEvent(new MouseEvent("click", { bubbles: true }));
        await wait(50);
      }
    });

    await step("cm:delete-merge-next", async () => {
      cm.dispatch({ selection: { anchor: cm.state.doc.length } });
      cmContent.dispatchEvent(new KeyboardEvent("keydown", { key: "Delete", code: "Delete", bubbles: true, cancelable: true }));
      await wait(80);
    });

    const countAfterDelete = root.querySelectorAll(".ls-block").length;

    await step("cm:set-newlines", async () => {
      cm.dispatch({ changes: { from: 0, to: cm.state.doc.length, insert: "hello\nworld" }, selection: { anchor: 11 } });
    });

    await step("cm:blur1", async () => {
      cmContent.blur();
      await waitFor(() => (root.querySelector(".ls-block .blp-file-outliner-display")?.innerText ?? "").includes("world"));
    });

    await step("ui:activate-first-display2", async () => {
      const firstDisplay2 = root.querySelector(".ls-block .blp-file-outliner-display");
      if (firstDisplay2) {
        firstDisplay2.dispatchEvent(new MouseEvent("click", { bubbles: true }));
        await wait(50);
      }
    });

    const md = ["> quote", "", "- item", "", "```js", "console.log(1)", "```"].join("\n");

    await step("cm:set-md", async () => {
      cm.dispatch({ changes: { from: 0, to: cm.state.doc.length, insert: md }, selection: { anchor: md.length } });
    });

    await step("cm:blur2", async () => {
      cmContent.blur();
      await waitFor(() => !!root.querySelector(".ls-block .blp-file-outliner-display pre"));
    });

    const host = root.querySelector(".ls-block .blp-file-outliner-display");
    const pre = host?.querySelector("pre");
    const ul = host?.querySelector("ul");
    const quote = host?.querySelector("blockquote");

    const markdownReset = {
      pre: pre ? { marginTop: getComputedStyle(pre).marginTop, marginBottom: getComputedStyle(pre).marginBottom } : null,
      ul: ul
        ? { marginTop: getComputedStyle(ul).marginTop, marginBottom: getComputedStyle(ul).marginBottom, paddingLeft: getComputedStyle(ul).paddingLeft }
        : null,
      blockquote: quote
        ? { marginTop: getComputedStyle(quote).marginTop, marginBottom: getComputedStyle(quote).marginBottom, paddingLeft: getComputedStyle(quote).paddingLeft }
        : null,
    };

    const hasCopyButton = !!host?.querySelector("button.copy-code-button");

    return {
      ok: true,
      viewType,
      counts: { afterEnter: countAfterEnter, afterBackspace: countAfterBackspace, afterDelete: countAfterDelete },
      rootDirectChildren: { afterIndent: rootDirectChildrenAfterIndent, afterOutdent: rootDirectChildrenAfterOutdent },
      markdownReset,
      hasCopyButton,
      times,
      totalMs: Date.now() - t0,
    };
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
