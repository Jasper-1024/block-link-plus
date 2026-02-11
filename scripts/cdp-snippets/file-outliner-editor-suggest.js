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
		const outlinerFile = await upsert(outlinerPath, outlinerContent);

		plugin.settings.fileOutlinerEnabledFiles = Array.from(new Set([...prevEnabledFiles, outlinerPath]));
		plugin.settings.fileOutlinerViewEnabled = true;
		await plugin.saveSettings();

		const leaf = app.workspace.getLeaf(false);
		await leaf.openFile(outlinerFile, { active: true });
		await waitFor(() => (leaf.view?.getViewType?.() === "blp-file-outliner-view" ? true : null), {
			timeoutMs: 8000,
			stepMs: 50,
		});
		assert(leaf.view?.getViewType?.() === "blp-file-outliner-view", "expected active leaf to be the outliner view");
		try {
			app.workspace.setActiveLeaf(leaf, { focus: true });
		} catch {
			// ignore
		}
		await wait(50);

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
		cm.focus();
		const focused = await waitFor(() => (cm.hasFocus ? true : null), { timeoutMs: 1000, stepMs: 50 });
		assert(focused, "expected outliner CM6 editor to have focus");

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
		const linkItems = await waitFor(() => {
			const el = document.querySelector(".suggestion-container");
			const items = el?.querySelectorAll?.(".suggestion-item") ?? [];
			return items.length > 0 ? true : null;
		}, { timeoutMs: 6000, stepMs: 50 });
		assert(linkItems, "expected link suggestion items to render");

		// --- 2) Slash suggest on `/`
		closeAll();
		cm.dispatch({ changes: { from: 0, to: cm.state.doc.length, insert: "/" }, selection: { anchor: 1 } });

		const slashSuggest = await waitFor(() => (mgr.currentSuggest?.isOpen ? mgr.currentSuggest : null), {
			timeoutMs: 6000,
			stepMs: 50,
		});
		assert(slashSuggest, "expected slash suggest to open on `/`");
		const slashItems = await waitFor(() => {
			const el = document.querySelector(".suggestion-container");
			const items = el?.querySelectorAll?.(".suggestion-item") ?? [];
			return items.length > 0 ? true : null;
		}, { timeoutMs: 6000, stepMs: 50 });
		assert(slashItems, "expected slash suggestion items to render");

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
