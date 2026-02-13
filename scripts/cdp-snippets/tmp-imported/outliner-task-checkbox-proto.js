// Prototype (no code changes): render outliner task blocks as checkboxes by post-processing DOM.
//
// Run:
//   node scripts/obsidian-cdp.js eval-file ".tmp/outliner-task-checkbox-proto.js"
//
// Validates key assumptions before implementing:
// - We can hide the `[ ]` / `[x]` prefix in display while keeping the rest of the rendered DOM intact.
// - Clicking the checkbox does NOT enter edit mode.
// - Toggling updates the underlying file content (`- [ ]` <-> `- [x]`).

(async () => {
  const wait = (ms) => new Promise((r) => setTimeout(r, ms));
  const assert = (cond, msg) => {
    if (!cond) throw new Error(msg);
  };

  const pluginId = 'block-link-plus';
  const tmpFolder = '_blp_tmp';
  const outlinerPath = `${tmpFolder}/outliner-task-proto.md`;
  const targetPath = `${tmpFolder}/task-link-target.md`;

  const now = '2026-02-12T00:00:00';
  const content = [
    '---',
    'blp_outliner: true',
    '---',
    '',
    '- [ ] task one [[_blp_tmp/task-link-target|alias]]',
    `  [date:: ${now}] [updated:: ${now}] [blp_sys:: 1] [blp_ver:: 2] ^t1`,
    '- [x] task two',
    `  [date:: ${now}] [updated:: ${now}] [blp_sys:: 1] [blp_ver:: 2] ^t2`,
    '',
  ].join('\n');

  const waitFor = async (fn, { timeoutMs = 15000, stepMs = 50 } = {}) => {
    const t0 = Date.now();
    while (Date.now() - t0 < timeoutMs) {
      const v = fn();
      if (v) return v;
      await wait(stepMs);
    }
    return null;
  };

  // Ensure plugin is loaded.
  await app.plugins.disablePlugin(pluginId);
  await app.plugins.enablePlugin(pluginId);
  await wait(250);

  const plugin = app?.plugins?.plugins?.[pluginId];
  assert(plugin, `plugin not found: ${pluginId}`);

  const prevEnabledFiles = Array.isArray(plugin.settings?.fileOutlinerEnabledFiles)
    ? [...plugin.settings.fileOutlinerEnabledFiles]
    : [];
  const prevRouting = plugin.settings.fileOutlinerViewEnabled;
  const prevActivePath = app.workspace.getActiveFile?.()?.path ?? null;

  const upsert = async (path, body) => {
    let f = app.vault.getAbstractFileByPath(path);
    if (!f) f = await app.vault.create(path, body);
    else await app.vault.modify(f, body);
    return f;
  };

  const parseTaskPrefix = (text) => {
    const s = String(text ?? '');
    if (s.startsWith('[ ] ')) return { kind: 'task', checked: false, rest: s.slice(4) };
    if (s.startsWith('[x] ') || s.startsWith('[X] ')) return { kind: 'task', checked: true, rest: s.slice(4) };
    return { kind: 'plain', checked: false, rest: s };
  };

  const stripPrefixFromRenderedDom = (root) => {
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
    while (walker.nextNode()) {
      const node = walker.currentNode;
      const text = String(node?.textContent ?? '');
      if (text.startsWith('[ ] ')) {
        node.textContent = text.slice(4);
        return { ok: true, removed: '[ ] ' };
      }
      if (text.startsWith('[x] ') || text.startsWith('[X] ')) {
        node.textContent = text.slice(4);
        return { ok: true, removed: text.slice(0, 4) };
      }
    }
    return { ok: false, removed: null };
  };

  const injectCheckbox = ({ view, id }) => {
    const b = view.blockById?.get?.(id);
    assert(b, `missing block model for ${id}`);

    const info = parseTaskPrefix(b.text);
    assert(info.kind === 'task', `block ${id} is not a task`);

    const row = view.containerEl.querySelector(`.ls-block[data-blp-outliner-id="${id}"]`);
    assert(row, `missing row for ${id}`);

    const display = row.querySelector('.blp-file-outliner-display');
    assert(display, `missing display for ${id}`);

    // Avoid double-inject.
    if (display.querySelector('input.blp-task-proto')) return;

    // Strip the visible prefix from the rendered DOM.
    const stripped = stripPrefixFromRenderedDom(display);
    assert(stripped.ok, `failed to find prefix text node for ${id}`);

    const cb = document.createElement('input');
    cb.type = 'checkbox';
    cb.checked = info.checked;
    cb.className = 'blp-task-proto';
    cb.style.marginRight = '8px';

    cb.addEventListener('click', (evt) => {
      // We MUST NOT enter edit mode.
      evt.stopPropagation();
    });

    cb.addEventListener('change', async (evt) => {
      evt.stopPropagation();

      const block = view.blockById.get(id);
      const cur = parseTaskPrefix(block.text);
      if (cur.kind !== 'task') return;

      const firstLineEnd = block.text.indexOf('\n');
      const restLines = firstLineEnd >= 0 ? block.text.slice(firstLineEnd) : '';

      const nextPrefix = cb.checked ? '[x] ' : '[ ] ';
      const nextFirstLine = nextPrefix + cur.rest;
      block.text = nextFirstLine + restLines;

      try {
        view.dirtyBlockIds.add(id);
      } catch {
        // ignore
      }

      // Persist.
      if (typeof view.save === 'function') {
        await view.save();
      } else {
        view.requestSave?.();
      }

      // Re-render the block display and re-inject.
      try {
        view.renderBlockDisplay?.(id);
      } catch {
        // ignore
      }

      // Wait for async markdown render to settle, then re-inject UI.
      setTimeout(() => {
        try {
          injectCheckbox({ view, id });
        } catch {
          // ignore
        }
      }, 250);
    });

    // Place checkbox before the rendered content.
    display.prepend(cb);
  };

  try {
    try {
      if (!app.vault.getAbstractFileByPath(tmpFolder)) await app.vault.createFolder(tmpFolder);
    } catch {
      // ignore
    }

    await upsert(targetPath, '# target\n\nhello\n');
    const outlinerFile = await upsert(outlinerPath, content);

    plugin.settings.fileOutlinerEnabledFiles = Array.from(new Set([...prevEnabledFiles, outlinerPath]));
    plugin.settings.fileOutlinerViewEnabled = true;
    await plugin.saveSettings();

    const leaf = app.workspace.getLeaf(false);
    await leaf.openFile(outlinerFile, { active: true });
    await waitFor(() => (leaf.view?.getViewType?.() === 'blp-file-outliner-view' ? true : null));
    const view = leaf.view;
    assert(view?.getViewType?.() === 'blp-file-outliner-view', 'expected file outliner view');

    // Wait for displays.
    await waitFor(() => view.containerEl.querySelector('.ls-block[data-blp-outliner-id="t1"] .blp-file-outliner-display') ?? null);
    await wait(300);

    // Inject UI for both task blocks.
    injectCheckbox({ view, id: 't1' });
    injectCheckbox({ view, id: 't2' });

    // Validate prefix is not visible in display text.
    const txt1 = String(view.containerEl.querySelector('.ls-block[data-blp-outliner-id="t1"] .blp-file-outliner-display')?.textContent ?? '');
    assert(!txt1.includes('[ ]') && !txt1.includes('[x]') && !txt1.includes('[X]'), `t1 display still contains prefix: ${txt1}`);

    // Validate clicking checkbox does not enter edit mode.
    const cb1 = view.containerEl.querySelector('.ls-block[data-blp-outliner-id="t1"] input.blp-task-proto');
    assert(cb1, 'missing injected checkbox for t1');
    cb1.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true, button: 0 }));
    await wait(50);
    assert(!view.editingId, `unexpected edit mode after checkbox click: editingId=${String(view.editingId)}`);

    // Toggle task one -> checked.
    cb1.checked = true;
    cb1.dispatchEvent(new Event('change', { bubbles: true }));

    await wait(800);
    const raw = await app.vault.read(outlinerFile);
    assert(raw.includes('- [x] task one'), `expected file to contain '- [x] task one', got: ${raw}`);

    // Validate internal link navigation still works (ctrl+click opens a new leaf).
    const anchor = view.containerEl.querySelector('.ls-block[data-blp-outliner-id="t1"] a.internal-link');
    assert(anchor, 'missing internal link anchor after injection');
    const href = String(anchor.getAttribute('data-href') ?? anchor.getAttribute('href') ?? '');
    assert(href.includes('task-link-target'), `unexpected internal link href: ${href}`);

    const findLeafWithPath = (p) => {
      let found = null;
      try {
        app.workspace.iterateAllLeaves((leaf) => {
          if (found) return;
          const file = leaf?.view?.file;
          if (file?.path === p) found = leaf;
        });
      } catch {
        // ignore
      }
      return found;
    };

    anchor.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true, button: 0, ctrlKey: true }));
    await waitFor(() => (findLeafWithPath(targetPath) ? true : null));
    assert(findLeafWithPath(targetPath), 'expected ctrl+click to open target file in a new leaf');

    return { ok: true };
  } finally {
    try {
      plugin.settings.fileOutlinerEnabledFiles = prevEnabledFiles;
      plugin.settings.fileOutlinerViewEnabled = prevRouting;
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
      const f = app.vault.getAbstractFileByPath(outlinerPath);
      if (f) await app.vault.delete(f);
    } catch {
      // ignore
    }

    try {
      const f = app.vault.getAbstractFileByPath(targetPath);
      if (f) await app.vault.delete(f);
    } catch {
      // ignore
    }
  }
})();
