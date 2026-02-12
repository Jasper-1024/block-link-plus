// CDP regression: clicking `![[note#^id-id]]` inside File Outliner View display MUST mount InlineEditEngine.
//
// Run:
//   node scripts/obsidian-cdp.js eval-file "scripts/cdp-snippets/file-outliner-view-embed-inline-edit.js"
//
// Assertion:
// - When inline edit is enabled, clicking a reading-range embed mounts a source editor in-place.

(async () => {
	const wait = (ms) => new Promise((r) => setTimeout(r, ms));
	const assert = (cond, msg) => {
		if (!cond) throw new Error(msg);
	};

	const pluginId = "block-link-plus";
	const tmpFolder = "_blp_tmp";

	const srcPath = `${tmpFolder}/range-src.md`;
	const outlinerPath = `${tmpFolder}/outliner-embed-inline-edit.md`;

	const id = "rng1";
	const rangeId = `${id}-${id}`;
	const embedLinkPath = `${tmpFolder}/range-src`;
	const embedSrcAttr = `${embedLinkPath}#^${rangeId}`;
	const embedLink = `![[${embedSrcAttr}]]`;

	const srcContent = [`RANGE_START ^${id}`, "RANGE_MID", `RANGE_END ^${rangeId}`, ""].join("\n");

	const now = "2026-02-12T00:00:00";
	const outlinerContent = [
		"---",
		"blp_outliner: true",
		"---",
		"",
		`- host ${embedLink}`,
		`  [date:: ${now}] [updated:: ${now}] [blp_sys:: 1] [blp_ver:: 2] ^host`,
		"",
	].join("\n");

	const waitFor = async (fn, { timeoutMs = 15000, stepMs = 50 } = {}) => {
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
	const prevHideSys = plugin.settings.fileOutlinerHideSystemLine;
	const prevInlineEditEnabled = plugin.settings.inlineEditEnabled;
	const prevInlineEditBlock = plugin.settings.inlineEditBlock;
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

		await upsert(srcPath, srcContent);
		const outlinerFile = await upsert(outlinerPath, outlinerContent);

		plugin.settings.fileOutlinerEnabledFiles = Array.from(new Set([...prevEnabledFiles, outlinerPath]));
		plugin.settings.fileOutlinerViewEnabled = true;
		plugin.settings.fileOutlinerHideSystemLine = true;
		plugin.settings.inlineEditEnabled = true;
		plugin.settings.inlineEditBlock = true;
		await plugin.saveSettings();

		// Ensure metadata cache has block/range refs so InlineEditEngine can compute line ranges.
		await app.workspace.getLeaf(false).setViewState({
			type: "markdown",
			state: { file: srcPath, mode: "source" },
			active: true,
		});
		await waitFor(() => {
			const cache = app.metadataCache.getCache(srcPath);
			return cache?.blocks?.[id] && cache?.blocks?.[rangeId] ? true : null;
		});

		const leaf = app.workspace.getLeaf(false);
		await leaf.openFile(outlinerFile, { active: true });
		await waitFor(() => (leaf.view?.getViewType?.() === "blp-file-outliner-view" ? true : null));
		assert(leaf.view?.getViewType?.() === "blp-file-outliner-view", "expected active leaf to be the outliner view");

		const embedEl = await waitFor(() => {
			const root = leaf.view.containerEl;
			const el = root.querySelector(`.internal-embed.markdown-embed[src="${embedSrcAttr}"]`);
			if (!el) return null;
			if (!el.classList.contains("is-loaded")) return null;
			return el;
		});
		assert(embedEl, "missing embed element in outliner display");

		embedEl.dispatchEvent(new MouseEvent("click", { bubbles: true, cancelable: true, button: 0 }));

		const sourceView = await waitFor(() => {
			if (!embedEl.classList.contains("blp-inline-edit-active")) return null;
			const sv = embedEl.querySelector(".markdown-source-view");
			return sv ?? null;
		});
		assert(sourceView, "expected inline edit to mount a markdown-source-view inside the embed");

		const text = (sourceView.innerText ?? "").replace(/\s+/g, " ").trim();
		assert(text.includes("RANGE_MID"), `inline embed editor missing expected content: ${JSON.stringify(text.slice(0, 200))}`);

		return { ok: true };
	} finally {
		try {
			plugin.settings.fileOutlinerEnabledFiles = prevEnabledFiles;
			plugin.settings.fileOutlinerViewEnabled = prevRouting;
			plugin.settings.fileOutlinerHideSystemLine = prevHideSys;
			plugin.settings.inlineEditEnabled = prevInlineEditEnabled;
			plugin.settings.inlineEditBlock = prevInlineEditBlock;
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
			const f2 = app.vault.getAbstractFileByPath(srcPath);
			if (f2) await app.vault.delete(f2);
		} catch {
			// ignore
		}
	}
})();

