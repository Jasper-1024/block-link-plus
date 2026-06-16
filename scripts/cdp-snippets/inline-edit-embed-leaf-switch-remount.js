// CDP regression: Live Preview inline-edit embeds must remount when returning
// to a previously viewed host file without reopening that file.
//
// Run:
//   $env:OB_CDP_PORT='19225'; $env:OB_CDP_TITLE_CONTAINS=' - blp - '; node scripts/obsidian-cdp.js eval-file "scripts/cdp-snippets/inline-edit-embed-leaf-switch-remount.js"

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
	const inlineEditSettingKeys = ["inlineEditEnabled", "inlineEditBlock", "inlineEditHeading", "inlineEditFile"];
	const tmpFolder = "_blp_tmp";
	const sourceAPath = `${tmpFolder}/issue33a-remount-source-a.md`;
	const hostAPath = `${tmpFolder}/issue33a-remount-host-a.md`;
	const sourceBPath = `${tmpFolder}/issue33a-remount-source-b.md`;
	const hostBPath = `${tmpFolder}/issue33a-remount-host-b.md`;
	const sourceAContent = [
		"# Issue 33A remount source A",
		"",
		"- Alpha editable target ^i33aremounta",
		"  - Alpha child remains visible",
		"  [date:: 2026-06-12T00:00:00] [updated:: 2026-06-12T00:00:00] [blp_sys:: 1] [blp_ver:: 2] ^i33aremountatail",
		"",
	].join("\n");
	const sourceBContent = [
		"# Issue 33A remount source B",
		"",
		"- Beta editable target ^i33aremountb",
		"  - Beta child remains visible",
		"  [date:: 2026-06-12T00:00:00] [updated:: 2026-06-12T00:00:00] [blp_sys:: 1] [blp_ver:: 2] ^i33aremountbtail",
		"",
	].join("\n");
	const hostAContent = [`![[${sourceAPath}#^i33aremounta]]`, ""].join("\n");
	const hostBContent = [`![[${sourceBPath}#^i33aremountb]]`, ""].join("\n");

	const previousFile = app.workspace.getActiveFile?.() ?? null;
	let leafA = null;
	let leafB = null;

	const upsert = async (filePath, content) => {
		let file = app.vault.getAbstractFileByPath(filePath);
		if (!file) file = await withTimeout(app.vault.create(filePath, content), `create ${filePath}`);
		else await withTimeout(app.vault.modify(file, content), `modify ${filePath}`);
		return file;
	};
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
	const openMarkdown = async (leaf, filePath) => {
		await withTimeout(
			leaf.setViewState({ type: "markdown", state: { file: filePath, mode: "source" }, active: true }),
			`open ${filePath}`
		);
		await waitFor(
			() => leaf.view?.file?.path === filePath && leaf.view?.containerEl?.querySelector(".markdown-source-view"),
			{ timeoutMs: 10000 }
		);
		return leaf;
	};
	const activateLeaf = async (leaf, label) => {
		app.workspace.setActiveLeaf?.(leaf, { focus: true });
		await waitFor(
			() =>
				app.workspace.activeLeaf === leaf &&
				leaf.view?.containerEl?.isShown?.() !== false &&
				leaf.view?.containerEl?.querySelector(".markdown-source-view"),
			{ timeoutMs: 10000 }
		);
		await wait(100);
		assert(app.workspace.activeLeaf === leaf, `${label} did not become the active leaf`);
	};
	const getEmbed = (leaf) => leaf?.view?.containerEl?.querySelector(".internal-embed.markdown-embed") ?? null;
	const snapshot = (leaf) => {
		const embed = getEmbed(leaf);
		const rootCount = embed?.querySelectorAll(".blp-inline-edit-root").length ?? 0;
		const hostCount = embed?.querySelectorAll(".blp-inline-edit-host").length ?? 0;
		return {
			file: leaf?.view?.file?.path ?? null,
			containerShown: leaf?.view?.containerEl?.isShown?.() ?? null,
			embedConnected: Boolean(embed?.isConnected),
			embedLoaded: Boolean(embed?.classList.contains("is-loaded")),
			active: Boolean(embed?.classList.contains("blp-inline-edit-active")),
			rootCount,
			hostCount,
			text: String(embed?.innerText || embed?.textContent || ""),
		};
	};
	const waitForMounted = async (leaf, label, expectedText) => {
		const mounted = await waitFor(() => {
			const state = snapshot(leaf);
			const hasExpectedText = !expectedText || state.text.includes(expectedText);
			return state.active && state.rootCount === 1 && state.hostCount === 1 && hasExpectedText ? state : null;
		}, { timeoutMs: 15000 });
		assert(mounted, `${label} did not have exactly one remounted inline editor: ${JSON.stringify(snapshot(leaf))}`);
		return mounted;
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
		await upsert(sourceAPath, sourceAContent);
		await upsert(hostAPath, hostAContent);
		await upsert(sourceBPath, sourceBContent);
		await upsert(hostBPath, hostBContent);

		if (app.plugins.plugins[pluginId]) {
			await withTimeout(app.plugins.disablePlugin(pluginId), "disable plugin for reload");
			await wait(300);
		}
		await withTimeout(app.plugins.enablePlugin(pluginId), "enable plugin");
		await wait(500);

		const plugin = app.plugins.plugins[pluginId];
		assert(plugin, "plugin is not loaded");
		if (!originalInlineEditSettings) {
			originalInlineEditSettings = snapshotInlineEditSettings(plugin);
		}
		plugin.settings.inlineEditEnabled = true;
		plugin.settings.inlineEditBlock = true;
		plugin.settings.inlineEditHeading = true;
		plugin.settings.inlineEditFile = false;
		await plugin.saveSettings?.();

		leafA = app.workspace.getLeaf(false);
		await openMarkdown(leafA, hostAPath);
		const beforeSwitch = await waitForMounted(leafA, "host A before switch", "Alpha editable target");
		assert(beforeSwitch.text.includes("Alpha editable target"), `host A text mismatch before switch: ${beforeSwitch.text}`);

		leafB = app.workspace.getLeaf("tab");
		await openMarkdown(leafB, hostBPath);
		const bActive = await waitForMounted(leafB, "host B after switch", "Beta editable target");
		assert(bActive.text.includes("Beta editable target"), `host B text mismatch after switch: ${bActive.text}`);
		await wait(300);
		const aHidden = snapshot(leafA);

		await activateLeaf(leafA, "host A return");
		const afterReturn = await waitForMounted(leafA, "host A after return without reopen", "Alpha editable target");
		assert(afterReturn.text.includes("Alpha editable target"), `host A text mismatch after return: ${afterReturn.text}`);
		assert(!afterReturn.text.includes("blp_sys") && !afterReturn.text.includes("blp_ver"), "system tail tokens leaked after remount");
		assert(afterReturn.hostCount === 1, `expected one .blp-inline-edit-host after return, got ${afterReturn.hostCount}`);
		assert(afterReturn.rootCount === 1, `expected one .blp-inline-edit-root after return, got ${afterReturn.rootCount}`);

		return {
			ok: true,
			pluginVersion: plugin.manifest?.version ?? app.plugins.manifests?.[pluginId]?.version ?? null,
			previousFile: previousFile?.path ?? null,
			beforeSwitch,
			aHidden,
			bActive,
			afterReturn,
			originalPluginEnabled: wasPluginEnabled,
			originalInlineEditSettings,
		};
	} finally {
		try {
			if (leafB && leafB !== leafA) {
				leafB.detach?.();
			}
			if (previousFile) {
				await app.workspace.getLeaf(false).openFile(previousFile, { active: true });
			}
		} catch {
			// ignore
		}
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
