// CDP regression: Live Preview inline-edit embeds MUST NOT add fixed bottom
// whitespace inside the embedded editor `.cm-content`.
//
// Run:
//   $env:OB_CDP_PORT='19225'; $env:OB_CDP_TITLE_CONTAINS=' - blp - '; node scripts/obsidian-cdp.js eval-file "scripts/cdp-snippets/inline-edit-embed-bottom-padding.js"

(async () => {
	const wait = (ms) => new Promise((r) => setTimeout(r, ms));
	const assert = (cond, msg) => {
		if (!cond) throw new Error(msg);
	};
	const withTimeout = (promise, label, timeoutMs = 10000) =>
		Promise.race([
			promise,
			new Promise((_, reject) => window.setTimeout(() => reject(new Error(`${label} timed out`)), timeoutMs)),
		]);
	const waitFor = async (fn, { timeoutMs = 10000, stepMs = 50 } = {}) => {
		const started = Date.now();
		while (Date.now() - started < timeoutMs) {
			const value = await fn();
			if (value) return value;
			await wait(stepMs);
		}
		return null;
	};

	const pluginId = "block-link-plus";
	const inlineEditSettingKeys = ["inlineEditEnabled", "inlineEditBlock", "inlineEditHeading"];
	const tmpFolder = "_blp_tmp";
	const sourcePath = `${tmpFolder}/issue33-padding-source.md`;
	const hostPath = `${tmpFolder}/issue33-padding-host.md`;
	const sourceContent = [
		"# Issue 33 padding source",
		"",
		"- Editable target block ^i33pad",
		"  - nested child remains visible",
		"  [date:: 2026-06-12T00:00:00] [updated:: 2026-06-12T00:00:00] [blp_sys:: 1] [blp_ver:: 2] ^i33tail",
		"",
	].join("\n");
	const hostContent = [`![[${sourcePath}#^i33pad]]`, ""].join("\n");

	const upsert = async (filePath, content) => {
		let file = app.vault.getAbstractFileByPath(filePath);
		if (!file) file = await withTimeout(app.vault.create(filePath, content), `create ${filePath}`);
		else await withTimeout(app.vault.modify(file, content), `modify ${filePath}`);
		return file;
	};
	const openHost = async () => {
		const leaf = app.workspace.getLeaf(false);
		await withTimeout(
			leaf.setViewState({ type: "markdown", state: { file: hostPath, mode: "source" }, active: true }),
			"open host markdown view"
		);
		await waitFor(() => leaf.view?.file?.path === hostPath && leaf.view?.containerEl?.querySelector(".markdown-source-view"));
		return leaf;
	};
	const getEmbed = (leaf) => leaf.view?.containerEl?.querySelector(".internal-embed.markdown-embed") ?? null;
	const snapshotInlineEditSettings = (plugin) => {
		const settings = plugin?.settings ?? {};
		return Object.fromEntries(inlineEditSettingKeys.map((key) => [key, settings[key]]));
	};
	const restoreInlineEditSettings = async (plugin, snapshot) => {
		if (!plugin || !snapshot) return;
		plugin.settings = plugin.settings ?? {};
		for (const key of inlineEditSettingKeys) {
			plugin.settings[key] = snapshot[key];
		}
		await plugin.saveSettings?.();
	};

	const wasPluginEnabled = Boolean(app.plugins.plugins[pluginId]);
	let originalInlineEditSettings = wasPluginEnabled
		? snapshotInlineEditSettings(app.plugins.plugins[pluginId])
		: null;

	try {
		try {
			if (!app.vault.getAbstractFileByPath(tmpFolder)) await app.vault.createFolder(tmpFolder);
		} catch {
			// ignore
		}
		await upsert(sourcePath, sourceContent);
		await upsert(hostPath, hostContent);

		if (app.plugins.plugins[pluginId]) {
			await withTimeout(app.plugins.disablePlugin(pluginId), "disable plugin for reload");
			await wait(300);
		}
		await withTimeout(app.plugins.enablePlugin(pluginId), "enable plugin");
		await wait(500);
		assert(app.plugins.plugins[pluginId], "plugin is not loaded");
		const loadedPlugin = app.plugins.plugins[pluginId];
		if (!originalInlineEditSettings) {
			originalInlineEditSettings = snapshotInlineEditSettings(loadedPlugin);
		}
		loadedPlugin.settings.inlineEditEnabled = true;
		loadedPlugin.settings.inlineEditBlock = true;
		loadedPlugin.settings.inlineEditHeading = true;
		await loadedPlugin.saveSettings?.();

		const leaf = await openHost();
		await waitFor(
			() => getEmbed(leaf)?.querySelector(".blp-inline-edit-root .cm-content, .blp-inline-edit-root.cm-content"),
			{ timeoutMs: 15000 }
		);
		await wait(300);

		const embed = getEmbed(leaf);
		const root = embed?.querySelector(".blp-inline-edit-root");
		const content = root?.querySelector(".cm-content");
		const link = embed?.querySelector(":scope > .markdown-embed-link");
		assert(embed?.classList.contains("blp-inline-edit-active"), "inline edit did not take over the embed");
		assert(root, "missing inline edit root");
		assert(content, "missing embedded editor .cm-content");
		assert(link, "missing native embed jump affordance");

		const contentStyle = getComputedStyle(content);
		const contentRect = content.getBoundingClientRect();
		const embedRect = embed.getBoundingClientRect();
		const visibleText = String(embed.innerText ?? embed.textContent ?? "");
		const paddingBottom = contentStyle.paddingBottom;

		assert(
			paddingBottom === "0px",
			`expected .cm-content padding-bottom 0px, got ${paddingBottom}; reload Obsidian if plugin CSS was rebuilt in this session`
		);
		assert(contentRect.height > 0, "embedded editor content has no visible height");
		assert(embedRect.height > 0, "inline edit embed has no visible height");
		assert(visibleText.includes("Editable target block"), "inline edit embed did not render target block text");
		assert(!visibleText.includes("blp_sys") && !visibleText.includes("blp_ver"), "system tail tokens leaked in inline edit embed");

		return {
			ok: true,
			pluginVersion: loadedPlugin.manifest?.version ?? app.plugins.manifests?.[pluginId]?.version ?? null,
			activeFile: app.workspace.getActiveFile?.()?.path ?? null,
			paddingBottom,
			contentHeight: contentRect.height,
			embedHeight: embedRect.height,
			hasJumpLink: Boolean(link),
			originalPluginEnabled: wasPluginEnabled,
			originalInlineEditSettings,
			visibleText,
		};
	} finally {
		try {
			let plugin = app.plugins.plugins[pluginId];
			if (!plugin && wasPluginEnabled) {
				await withTimeout(app.plugins.enablePlugin(pluginId), "restore originally enabled plugin");
				await wait(300);
				plugin = app.plugins.plugins[pluginId];
			}
			if (plugin) {
				await restoreInlineEditSettings(plugin, originalInlineEditSettings);
			}
			if (!wasPluginEnabled && app.plugins.plugins[pluginId]) {
				await withTimeout(app.plugins.disablePlugin(pluginId), "restore originally disabled plugin");
			}
		} catch {
			// ignore
		}
	}
})();
