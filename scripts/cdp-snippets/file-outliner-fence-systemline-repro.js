// CDP repro: system tail lines drift when a fenced code block starts on the list item line (`- ```lang`).
// Run:
//   node scripts/obsidian-cdp.js eval-file "scripts/cdp-snippets/file-outliner-fence-systemline-repro.js"
//
// This snippet:
// - Creates `_blp_tmp/file-outliner-fence-systemline-repro.md`
// - Adds it to the outliner enabled-files list (deterministic routing)
// - Reopens it multiple times to observe normalization drift on disk
// - Cleans up (best-effort)

(async () => {
  const wait = (ms) => new Promise((r) => setTimeout(r, ms));

  const pluginId = "block-link-plus";
  const tmpFolder = "_blp_tmp";
  const tmpPath = `${tmpFolder}/file-outliner-fence-systemline-repro.md`;

  const hash = (s) => {
    // tiny, stable hash for drift detection (djb2-ish)
    let h = 5381;
    for (let i = 0; i < s.length; i++) h = ((h << 5) + h) ^ s.charCodeAt(i);
    return (h >>> 0).toString(36);
  };

  const preview = (s, { head = 12, tail = 8 } = {}) => {
    const lines = String(s ?? "").split("\n");
    if (lines.length <= head + tail) return lines;
    return [...lines.slice(0, head), "...", ...lines.slice(Math.max(head, lines.length - tail))];
  };

  const readDisk = async () => app.vault.adapter.read(tmpPath);

  const readUntilStable = async ({ timeoutMs = 7000, intervalMs = 150 } = {}) => {
    const start = Date.now();
    let last = await readDisk();
    while (Date.now() - start < timeoutMs) {
      await wait(intervalMs);
      const next = await readDisk();
      if (next === last) return next;
      last = next;
    }
    return last;
  };

  const waitForModify = async ({ timeoutMs = 6000 } = {}) =>
    new Promise((resolve) => {
      const off = app.vault.on("modify", (file) => {
        if (file?.path === tmpPath) {
          try {
            app.vault.offref(off);
          } catch {
            // ignore
          }
          resolve(true);
        }
      });
      setTimeout(() => {
        try {
          app.vault.offref(off);
        } catch {
          // ignore
        }
        resolve(false);
      }, timeoutMs);
    });

  // Ensure Obsidian reloads the plugin after we rebuild `main.js`.
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
    // Ensure folder.
    try {
      if (!app.vault.getAbstractFileByPath(tmpFolder)) {
        await app.vault.createFolder(tmpFolder);
      }
    } catch {
      // ignore
    }

    // Canonical-ish file that SHOULD roundtrip, but currently drifts because the
    // opening fence is on the list-item line (`- ```bash`).
    const content = [
      "---",
      "blp_outliner: true",
      "---",
      "- ```bash",
      "  echo 1",
      "  ```",
      "  - child",
      "    [date:: 2026-02-06T00:00:01] [updated:: 2026-02-06T00:00:01] [blp_sys:: 1] [blp_ver:: 2] ^child",
      "  ",
      "  [date:: 2026-02-06T00:00:00] [updated:: 2026-02-06T00:00:00] [blp_sys:: 1] [blp_ver:: 2] ^root",
      "- sibling",
      "  [date:: 2026-02-06T00:00:02] [updated:: 2026-02-06T00:00:02] [blp_sys:: 1] [blp_ver:: 2] ^sib",
      "",
    ].join("\n");

    // Create/overwrite the temp note.
    let f = app.vault.getAbstractFileByPath(tmpPath);
    if (!f) {
      f = await app.vault.create(tmpPath, content);
    } else {
      await app.vault.modify(f, content);
    }

    // Deterministic routing.
    plugin.settings.fileOutlinerEnabledFiles = Array.from(new Set([...prevSettingsEnabledFiles, tmpPath]));
    await plugin.saveSettings();

    const before = await readDisk();

    const cycles = [];
    for (let iter = 1; iter <= 3; iter++) {
      await app.workspace.getLeaf(false).openFile(f);
      await wait(250);

      const leaf = app.workspace.activeLeaf;
      const view = leaf?.view;
      const viewType = view?.getViewType?.() ?? null;
      if (viewType !== "blp-file-outliner-view") {
        return {
          ok: false,
          step: "open",
          iter,
          viewType,
          activeFile: app.workspace.getActiveFile?.()?.path ?? null,
        };
      }

      const parsed = view?.outlinerFile?.blocks ?? null;
      const rootCount = Array.isArray(parsed) ? parsed.length : null;
      const totalCount = Array.isArray(parsed)
        ? (() => {
            let n = 0;
            const walk = (xs) => {
              for (const b of xs) {
                n++;
                walk(b.children ?? []);
              }
            };
            walk(parsed);
            return n;
          })()
        : null;

      // If normalization triggers an async save, wait for it (best-effort) so we
      // can observe on-disk drift deterministically.
      const didModify = await waitForModify();
      if (didModify) await wait(250);

      const viewData = typeof view?.getViewData === "function" ? view.getViewData() : null;
      const disk = await readUntilStable();
      const sysCount = (disk.match(/\[blp_sys::\s*1\]/g) ?? []).length;
      const idCount = (disk.match(/\^[a-zA-Z0-9_-]+\s*$/gm) ?? []).length;

      cycles.push({
        iter,
        viewType,
        parsed: { rootCount, totalCount },
        viewData: viewData
          ? {
              hash: hash(viewData),
              length: viewData.length,
              lines: viewData.split("\n").length,
              sysCount: (viewData.match(/\[blp_sys::\s*1\]/g) ?? []).length,
              idCount: (viewData.match(/\^[a-zA-Z0-9_-]+\s*$/gm) ?? []).length,
              preview: preview(viewData),
            }
          : null,
        disk: {
          hash: hash(disk),
          length: disk.length,
          lines: disk.split("\n").length,
          sysCount,
          idCount,
          preview: preview(disk),
        },
      });
    }

    return {
      ok: true,
      tmpPath,
      before: {
        hash: hash(before),
        length: before.length,
        lines: before.split("\n").length,
        sysCount: (before.match(/\[blp_sys::\s*1\]/g) ?? []).length,
        idCount: (before.match(/\^[a-zA-Z0-9_-]+\s*$/gm) ?? []).length,
        preview: preview(before),
      },
      cycles,
      expected: {
        // If parsing/normalization is correct, these should stay stable:
        stableDiskHash: hash(before),
        parsedRootCount: 2,
        parsedTotalCount: 3,
        sysCount: 3,
      },
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
