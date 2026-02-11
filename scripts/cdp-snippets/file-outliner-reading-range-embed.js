// CDP regression: outliner v2 block display MUST support reading-range embeds (`^id-id`).
//
// Run:
//   node scripts/obsidian-cdp.js eval-file "scripts/cdp-snippets/file-outliner-reading-range-embed.js"

(async () => {
	const wait = (ms) => new Promise((r) => setTimeout(r, ms));
	const assert = (cond, msg) => {
		if (!cond) throw new Error(msg);
	};

	const pluginId = "block-link-plus";
	const tmpFolder = "_blp_tmp";

	const srcPath = `${tmpFolder}/range-src.md`;
	const outlinerPath = `${tmpFolder}/outliner-reading-range.md`;

	const id = "rng1";
	const rangeId = `${id}-${id}`;
	const embedLinkPath = `${tmpFolder}/range-src`;
	const embedSrcAttr = `${embedLinkPath}#^${rangeId}`;
	const embedLink = `![[${embedSrcAttr}]]`;

	const srcContent = [`RANGE_START ^${id}`, "RANGE_MID", `RANGE_END ^${rangeId}`, ""].join("\n");

	const now = "2026-02-11T00:00:00";
	const outlinerContent = [
		"---",
		"blp_outliner: true",
		"---",
		"",
		`- host ${embedLink}`,
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
	const prevHideSys = plugin.settings.fileOutlinerHideSystemLine;
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
		await plugin.saveSettings();

		// Wait until metadata cache sees `blp_outliner: true`.
		await app.workspace.getLeaf(false).setViewState({
			type: "markdown",
			state: { file: outlinerPath, mode: "source" },
			active: true,
		});

		await waitFor(() => {
			const cache = app.metadataCache.getCache(outlinerPath);
			return cache?.frontmatter?.blp_outliner === true ? true : null;
		}, { timeoutMs: 4000, stepMs: 50 });

		// Ensure the outliner view is actually active.
		const leaf = await waitFor(() => {
			const l = app.workspace.activeLeaf;
			return l?.view?.getViewType?.() === "blp-file-outliner-view" ? l : null;
		});
		assert(leaf, "expected active leaf to be the outliner view");

		// Wait for the embed + the reading-range host.
		const embedEl = await waitFor(() => {
			const root = leaf.view.containerEl;
			const el = root.querySelector(`.internal-embed.markdown-embed[src="${embedSrcAttr}"]`);
			if (!el) return null;
			if (!el.classList.contains("is-loaded")) return null;
			if (!el.querySelector(".markdown-embed-content")) return null;
			if (!el.querySelector(".blp-reading-range-host")) return null;
			return el;
		}, { timeoutMs: 12000, stepMs: 50 });
		assert(embedEl, "missing reading-range embed host in outliner display");

		const text = (embedEl.innerText ?? "").replace(/\s+/g, " ").trim();
		assert(text.includes("RANGE_START"), `range embed missing start content: ${JSON.stringify(text.slice(0, 200))}`);
		assert(text.includes("RANGE_MID"), `range embed missing mid content: ${JSON.stringify(text.slice(0, 200))}`);

		return { ok: true };
	} finally {
		plugin.settings.fileOutlinerEnabledFiles = prevEnabledFiles;
		plugin.settings.fileOutlinerViewEnabled = prevRouting;
		plugin.settings.fileOutlinerHideSystemLine = prevHideSys;
		await plugin.saveSettings();

		if (prevActivePath) {
			const f = app.vault.getAbstractFileByPath(prevActivePath);
			if (f) await app.workspace.getLeaf(false).openFile(f);
		} else {
			// Ensure we close the outliner leaf so it doesn't keep temp files active.
			try {
				app.workspace.activeLeaf?.detach?.();
			} catch {
				// ignore
			}
		}
	}
})();

