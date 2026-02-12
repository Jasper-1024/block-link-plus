// CDP regression: ArrowUp/Down cross-block navigation MUST respect collapsed + zoom scope.
//
// Run:
//   node scripts/obsidian-cdp.js eval-file "scripts/cdp-snippets/file-outliner-arrow-nav-scope.js"

(async () => {
	const wait = (ms) => new Promise((r) => setTimeout(r, ms));
	const waitFor = async (cond, { timeoutMs = 6000, intervalMs = 50 } = {}) => {
		const start = Date.now();
		while (Date.now() - start < timeoutMs) {
			try {
				const v = cond();
				if (v) return v;
			} catch {
				// ignore
			}
			await wait(intervalMs);
		}
		return null;
	};
	const assert = (cond, msg) => {
		if (!cond) throw new Error(msg);
	};

	const pluginId = "block-link-plus";
	const tmpFolder = "_blp_tmp";
	const tmpPath = `${tmpFolder}/file-outliner-arrow-nav-scope.md`;

	const now = "2026-02-12T00:00:00";

	const content = [
		"---",
		"blp_outliner: true",
		"---",
		"",
		"- p",
		"  parent line two",
		`  [date:: ${now}] [updated:: ${now}] [blp_sys:: 1] [blp_ver:: 2] ^p`,
		"  - c1",
		"    c1 line two",
		`    [date:: ${now}] [updated:: ${now}] [blp_sys:: 1] [blp_ver:: 2] ^c1`,
		"    - d",
		`      [date:: ${now}] [updated:: ${now}] [blp_sys:: 1] [blp_ver:: 2] ^d`,
		"  - c2",
		`    [date:: ${now}] [updated:: ${now}] [blp_sys:: 1] [blp_ver:: 2] ^c2`,
		"",
		"- a",
		`  [date:: ${now}] [updated:: ${now}] [blp_sys:: 1] [blp_ver:: 2] ^a`,
		"",
	].join("\n");

	await app.plugins.disablePlugin(pluginId);
	await app.plugins.enablePlugin(pluginId);
	await wait(250);

	const plugin = app?.plugins?.plugins?.[pluginId];
	assert(plugin, "plugin not found");

	const prevEnabledFiles = Array.isArray(plugin.settings?.fileOutlinerEnabledFiles)
		? [...plugin.settings.fileOutlinerEnabledFiles]
		: [];
	const prevRouting = plugin.settings.fileOutlinerViewEnabled;
	const prevActivePath = app.workspace.getActiveFile?.()?.path ?? null;

	try {
		try {
			if (!app.vault.getAbstractFileByPath(tmpFolder)) await app.vault.createFolder(tmpFolder);
		} catch {
			// ignore
		}

		let f = app.vault.getAbstractFileByPath(tmpPath);
		if (!f) f = await app.vault.create(tmpPath, content);
		else await app.vault.modify(f, content);

		plugin.settings.fileOutlinerEnabledFiles = Array.from(new Set([...prevEnabledFiles, tmpPath]));
		plugin.settings.fileOutlinerViewEnabled = true;
		await plugin.saveSettings();

		const leaf = app.workspace.getLeaf(false);
		await leaf.openFile(f, { active: true });
		await waitFor(() => (leaf.view?.getViewType?.() === "blp-file-outliner-view" ? true : null), {
			timeoutMs: 8000,
			intervalMs: 50,
		});
		assert(leaf.view?.getViewType?.() === "blp-file-outliner-view", "expected outliner view");
		const view = leaf.view;

		await waitFor(() => view.contentEl.querySelector('.ls-block[data-blp-outliner-id="p"]'), { timeoutMs: 8000 });

		const setCursorLineCh = (cm, line0, ch) => {
			const ln = Math.max(0, Math.min(cm.state.doc.lines - 1, Math.floor(line0)));
			const line = cm.state.doc.line(ln + 1);
			const cc = Math.max(0, Math.min(line.length, Math.floor(ch)));
			cm.dispatch({ selection: { anchor: line.from + cc } });
		};

		const pressArrow = async (cm, key) => {
			const host = cm.contentDOM || cm.dom?.querySelector?.(".cm-content");
			assert(host, "missing cm contentDOM");
			host.dispatchEvent(new KeyboardEvent("keydown", { key, code: key, bubbles: true, cancelable: true }));
			await wait(0);
		};

		// Expanded: p -> c1
		view.enterEditMode("p", { cursorStart: 0, cursorEnd: 0, scroll: true });
		await wait(80);
		setCursorLineCh(view.editorView, 1, 3); // bottom of p text
		await pressArrow(view.editorView, "ArrowDown");
		await wait(80);
		assert(view.editingId === "c1", `expected expanded p->c1, got ${String(view.editingId)}`);

		// Collapse p and verify p -> a (skip hidden children)
		const fold = view.contentEl.querySelector('.ls-block[data-blp-outliner-id="p"] .blp-outliner-fold-toggle');
		assert(fold, "missing fold toggle for p");
		fold.dispatchEvent(new MouseEvent("click", { bubbles: true }));
		await wait(120);
		assert(view.collapsedIds?.has?.("p"), "expected p collapsed");

		view.enterEditMode("p", { cursorStart: 0, cursorEnd: 0, scroll: true });
		await wait(80);
		setCursorLineCh(view.editorView, 1, 2);
		await pressArrow(view.editorView, "ArrowDown");
		await wait(80);
		assert(view.editingId === "a", `expected collapsed p->a, got ${String(view.editingId)}`);

		// Zoom into c1 scope: c1 -> d (and d has no next in zoom scope).
		view.zoomInto("c1");
		await wait(200);
		assert(Array.isArray(view.zoomStack) && view.zoomStack.length >= 1, "expected zoomStack to be non-empty");

		view.enterEditMode("c1", { cursorStart: 0, cursorEnd: 0, scroll: true });
		await wait(80);
		setCursorLineCh(view.editorView, 1, 2); // bottom of c1 text
		await pressArrow(view.editorView, "ArrowDown");
		await wait(80);
		assert(view.editingId === "d", `expected zoom c1->d, got ${String(view.editingId)}`);

		// ArrowUp from d top -> c1 last line (within zoom scope)
		view.enterEditMode("d", { cursorStart: 0, cursorEnd: 0, scroll: true });
		await wait(80);
		setCursorLineCh(view.editorView, 0, 0);
		await pressArrow(view.editorView, "ArrowUp");
		await wait(80);
		assert(view.editingId === "c1", `expected zoom d->c1, got ${String(view.editingId)}`);

		return { ok: true };
	} finally {
		try {
			plugin.settings.fileOutlinerEnabledFiles = prevEnabledFiles;
			plugin.settings.fileOutlinerViewEnabled = prevRouting;
			await plugin.saveSettings();
		} catch {
			// ignore
		}

		if (prevActivePath) {
			try {
				const prev = app.vault.getAbstractFileByPath(prevActivePath);
				if (prev) await app.workspace.getLeaf(false).openFile(prev);
			} catch {
				// ignore
			}
		}
	}
})();

