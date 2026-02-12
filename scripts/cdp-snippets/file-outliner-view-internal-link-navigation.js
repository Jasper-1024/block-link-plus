// CDP regression: internal links rendered inside File Outliner View block display MUST be navigable.
//
// Run:
//   node scripts/obsidian-cdp.js eval-file "scripts/cdp-snippets/file-outliner-view-internal-link-navigation.js"
//
// Assertion:
// - Clicking `[[note#^id|alias]]` in outliner display opens the target file.

(async () => {
	const wait = (ms) => new Promise((r) => setTimeout(r, ms));
	const assert = (cond, msg) => {
		if (!cond) throw new Error(msg);
	};

	const pluginId = "block-link-plus";
	const tmpFolder = "_blp_tmp";

	const outlinerPath = `${tmpFolder}/outliner-link-nav.md`;
	const targetPath = `${tmpFolder}/link-target.md`;

	const blockId = "tgt1";
	const linkText = `${tmpFolder}/link-target#^${blockId}`;

	const targetContent = ["# target", "", `target line ^${blockId}`, ""].join("\n");

	const now = "2026-02-12T00:00:00";
	const outlinerContent = [
		"---",
		"blp_outliner: true",
		"---",
		"",
		`- go [[${linkText}|alias]]`,
		`  [date:: ${now}] [updated:: ${now}] [blp_sys:: 1] [blp_ver:: 2] ^host`,
		"",
	].join("\n");

	const waitFor = async (fn, { timeoutMs = 10000, stepMs = 50 } = {}) => {
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

		await upsert(targetPath, targetContent);
		const outlinerFile = await upsert(outlinerPath, outlinerContent);

		plugin.settings.fileOutlinerEnabledFiles = Array.from(new Set([...prevEnabledFiles, outlinerPath]));
		plugin.settings.fileOutlinerViewEnabled = true;
		await plugin.saveSettings();

		const leaf = app.workspace.getLeaf(false);
		await leaf.openFile(outlinerFile, { active: true });
		await waitFor(() => (leaf.view?.getViewType?.() === "blp-file-outliner-view" ? true : null));
		assert(leaf.view?.getViewType?.() === "blp-file-outliner-view", "expected active leaf to be the outliner view");

		const linkEl = await waitFor(() => {
			const root = leaf.view.containerEl;
			const el = root.querySelector(`a.internal-link[data-href="${linkText}"]`);
			return el ?? null;
		});
		assert(linkEl, "missing internal-link anchor in outliner display");

		linkEl.dispatchEvent(new MouseEvent("click", { bubbles: true, cancelable: true, button: 0 }));

		await waitFor(() => (app.workspace.getActiveFile?.()?.path === targetPath ? true : null));
		assert(app.workspace.getActiveFile?.()?.path === targetPath, "click did not navigate to target file");

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
			const f1 = app.vault.getAbstractFileByPath(outlinerPath);
			if (f1) await app.vault.delete(f1);
			const f2 = app.vault.getAbstractFileByPath(targetPath);
			if (f2) await app.vault.delete(f2);
		} catch {
			// ignore
		}
	}
})();

