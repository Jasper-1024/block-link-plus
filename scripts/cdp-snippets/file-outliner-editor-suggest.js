// CDP regression: outliner v2 CM6 editor MUST bridge Obsidian EditorSuggest (`[[` + `/`).
//
// Run:
//   node scripts/obsidian-cdp.js eval-file "scripts/cdp-snippets/file-outliner-editor-suggest.js"

(async () => {
	const wait = (ms) => new Promise((r) => setTimeout(r, ms));
	const assert = (cond, msg) => {
		if (!cond) throw new Error(msg);
	};

	const pluginId = "block-link-plus";
	const tmpFolder = "_blp_tmp";

	const outlinerPath = `${tmpFolder}/outliner-editor-suggest.md`;
	const targetPath = `${tmpFolder}/suggest-target.md`;

	const now = "2026-02-11T00:00:00";
	const outlinerContent = [
		"---",
		"blp_outliner: true",
		"---",
		"",
		"- host",
		`  [date:: ${now}] [updated:: ${now}] [blp_sys:: 1] [blp_ver:: 2] ^host`,
		"",
	].join("\n");

	const waitFor = async (fn, { timeoutMs = 8000, stepMs = 50 } = {}) => {
		const t0 = Date.now();
		while (Date.now() - t0 < timeoutMs) {
			const v = fn();
			if (v) return v;
			await wait(stepMs);
		}
		return null;
	};

	// Ensure Obsidian reloads the plugin after we rebuild `main.js`.
	await app.plugins.disablePlugin(pluginId);
	await app.plugins.enablePlugin(pluginId);
	await wait(250);

	const plugin = app?.plugins?.plugins?.[pluginId];
	assert(plugin, `plugin not found after reload: ${pluginId}`);

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

		const upsert = async (path, content) => {
			let f = app.vault.getAbstractFileByPath(path);
			if (!f) f = await app.vault.create(path, content);
			else await app.vault.modify(f, content);
			return f;
		};

		await upsert(targetPath, "target");
		await upsert(outlinerPath, outlinerContent);

		plugin.settings.fileOutlinerEnabledFiles = Array.from(new Set([...prevEnabledFiles, outlinerPath]));
		plugin.settings.fileOutlinerViewEnabled = true;
		await plugin.saveSettings();

		await app.workspace.getLeaf(false).setViewState({
			type: "markdown",
			state: { file: outlinerPath, mode: "source" },
			active: true,
		});

		const leaf = await waitFor(() => {
			const l = app.workspace.activeLeaf;
			return l?.view?.getViewType?.() === "blp-file-outliner-view" ? l : null;
		});
		assert(leaf, "expected active leaf to be the outliner view");

		const view = leaf.view;
		const id = await waitFor(() => {
			const keys = view.blockById ? Array.from(view.blockById.keys()) : [];
			return keys.length > 0 ? keys[0] : null;
		});
		assert(id, "missing outliner block id");

		// Enter edit mode (private method; TS-private but runtime-accessible).
		view.enterEditMode(id, { cursorStart: 0, cursorEnd: 0, scroll: false });
		await wait(50);

		const cm = view.editorView;
		assert(cm && cm.state && cm.dispatch, "missing CM6 editorView");

		const mgr = app.workspace.editorSuggest;
		assert(mgr && Array.isArray(mgr.suggests), "missing workspace.editorSuggest");

		const closeAll = () => {
			for (const s of mgr.suggests) {
				try {
					if (s?.isOpen) s.close?.();
				} catch {
					// ignore
				}
			}
		};

		// --- 1) Link suggest on `[[`
		closeAll();
		cm.dispatch({ changes: { from: 0, to: cm.state.doc.length, insert: "[[" }, selection: { anchor: 2 } });

		const linkSuggest = await waitFor(() => (mgr.currentSuggest?.isOpen ? mgr.currentSuggest : null), {
			timeoutMs: 6000,
			stepMs: 50,
		});
		assert(linkSuggest, "expected link suggest to open on `[[`");
		assert(Array.isArray(linkSuggest.suggestions), "suggestions not available");

		const beforeLen = cm.state.doc.length;
		try {
			const item = linkSuggest.suggestions?.[0];
			linkSuggest.selectSuggestion?.(item, new MouseEvent("click"));
		} catch {
			// ignore (some suggest impls may not expose this)
		}
		await wait(50);
		assert(cm.state.doc.length >= beforeLen, "link suggest selection should not shrink doc");

		// --- 2) Slash suggest on `/`
		closeAll();
		cm.dispatch({ changes: { from: 0, to: cm.state.doc.length, insert: "/" }, selection: { anchor: 1 } });

		const slashSuggest = await waitFor(() => (mgr.currentSuggest?.isOpen ? mgr.currentSuggest : null), {
			timeoutMs: 6000,
			stepMs: 50,
		});
		assert(slashSuggest, "expected slash suggest to open on `/`");

		return { ok: true };
	} finally {
		plugin.settings.fileOutlinerEnabledFiles = prevEnabledFiles;
		plugin.settings.fileOutlinerViewEnabled = prevRouting;
		await plugin.saveSettings();

		if (prevActivePath) {
			const f = app.vault.getAbstractFileByPath(prevActivePath);
			if (f) await app.workspace.getLeaf(false).openFile(f);
		}

		// Best-effort cleanup.
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

