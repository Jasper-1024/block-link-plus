// CDP regression: Live Preview inline-edit embeds MUST preserve Obsidian's
// native `.markdown-embed-link` jump affordance.
//
// Run:
//   $env:OB_CDP_PORT='19225'; $env:OB_CDP_TITLE_CONTAINS=' - blp - '; node scripts/obsidian-cdp.js eval-file "scripts/cdp-snippets/inline-edit-embed-jump-affordance.js"

(async () => {
	const wait = (ms) => new Promise((r) => setTimeout(r, ms));
	const assert = (cond, msg) => {
		if (!cond) throw new Error(msg);
	};
	const progress = [];
	window.__blpIssue35Progress = progress;
	const step = (name) => {
		progress.push({ name, at: Date.now() });
		window.__blpIssue35Progress = progress;
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
	const tmpFolder = "_blp_tmp";
	const sourcePath = `${tmpFolder}/issue35-arrow-source.md`;
	const hostPath = `${tmpFolder}/issue35-arrow-host.md`;
	const sourceContent = [
		"# Issue 35 arrow source",
		"",
		"- Issue 35 target block ^i35target",
		"  - nested child for inline edit",
		"  [date:: 2026-06-12T00:00:00] [updated:: 2026-06-12T00:00:00] [blp_sys:: 1] [blp_ver:: 2] ^i35tail",
		"",
	].join("\n");
	const hostContent = [`![[${sourcePath}#^i35target]]`, ""].join("\n");

	const upsert = async (path, content) => {
		let file = app.vault.getAbstractFileByPath(path);
		if (!file) file = await withTimeout(app.vault.create(path, content), `create ${path}`);
		else await withTimeout(app.vault.modify(file, content), `modify ${path}`);
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
	const isVisible = (el) => {
		if (!el) return false;
		const style = getComputedStyle(el);
		const rect = el.getBoundingClientRect();
		return style.display !== "none" && style.visibility !== "hidden" && rect.width >= 0 && rect.height >= 0;
	};
	const snapshot = (leaf) => {
		const root = leaf.view?.containerEl ?? document;
		const embed = getEmbed(leaf);
		const link = embed?.querySelector(":scope > .markdown-embed-link") ?? null;
		return {
			activeFile: app.workspace.getActiveFile?.()?.path ?? null,
			activeInlineCount: root.querySelectorAll(".internal-embed.markdown-embed.blp-inline-edit-active").length,
			pageLinkCount: root.querySelectorAll(".markdown-embed-link").length,
			directLinkCount: embed?.querySelectorAll(":scope > .markdown-embed-link").length ?? 0,
			hostCount: embed?.querySelectorAll(".blp-inline-edit-host").length ?? 0,
			rootCount: embed?.querySelectorAll(".blp-inline-edit-root").length ?? 0,
			linkVisible: isVisible(link),
			text: String(embed?.textContent ?? ""),
		};
	};

	try {
		try {
			if (!app.vault.getAbstractFileByPath(tmpFolder)) await app.vault.createFolder(tmpFolder);
		} catch {
			// ignore
		}
		await upsert(sourcePath, sourceContent);
		await upsert(hostPath, hostContent);

		step("disable plugin");
		await withTimeout(app.plugins.disablePlugin(pluginId), "disable plugin");
		await wait(300);

		step("open host with plugin disabled");
		const disabledLeaf = await openHost();
		const nativeLink = await waitFor(() => getEmbed(disabledLeaf)?.querySelector(":scope > .markdown-embed-link"));
		assert(nativeLink, "native markdown-embed-link missing with plugin disabled");
		step("click native disabled link");
		nativeLink.dispatchEvent(new MouseEvent("click", { bubbles: true, cancelable: true, button: 0 }));
		await waitFor(() => app.workspace.getActiveFile?.()?.path === sourcePath, { timeoutMs: 8000 });
		assert(app.workspace.getActiveFile?.()?.path === sourcePath, "native markdown-embed-link did not navigate to source");

		step("enable plugin");
		await withTimeout(app.plugins.enablePlugin(pluginId), "enable plugin");
		await wait(500);

		const plugin = app.plugins.plugins[pluginId];
		assert(plugin, "plugin did not load after enable");
		plugin.settings.inlineEditEnabled = true;
		plugin.settings.inlineEditBlock = true;
		plugin.settings.inlineEditHeading = true;
		await plugin.saveSettings?.();

		step("open host with plugin enabled");
		const activeLeaf = await openHost();
		await waitFor(
			() => getEmbed(activeLeaf)?.querySelector(".blp-inline-edit-host.blp-inline-edit-root, .blp-inline-edit-host .blp-inline-edit-root"),
			{ timeoutMs: 15000 }
		);
		await wait(300);

		const active = snapshot(activeLeaf);
		assert(active.activeInlineCount === 1, `expected one active inline-edit embed, got ${active.activeInlineCount}`);
		assert(active.pageLinkCount === 1, `expected one page markdown-embed-link, got ${active.pageLinkCount}`);
		assert(active.directLinkCount === 1, `expected one direct native markdown-embed-link, got ${active.directLinkCount}`);
		assert(active.hostCount === 1, `expected one blp-inline-edit-host, got ${active.hostCount}`);
		assert(active.rootCount === 1, `expected one blp-inline-edit-root, got ${active.rootCount}`);
		assert(active.linkVisible, "native markdown-embed-link is not visible while inline edit is active");
		assert(!active.text.includes("blp_sys") && !active.text.includes("blp_ver"), "system tail tokens leaked in inline edit embed");

		const activeLink = getEmbed(activeLeaf)?.querySelector(":scope > .markdown-embed-link");
		assert(activeLink, "active inline-edit native link missing before click");
		step("click active inline link");
		activeLink.dispatchEvent(new MouseEvent("click", { bubbles: true, cancelable: true, button: 0 }));
		await waitFor(() => app.workspace.getActiveFile?.()?.path === sourcePath, { timeoutMs: 8000 });
		assert(app.workspace.getActiveFile?.()?.path === sourcePath, "active inline-edit native link did not navigate to source");

		step("remount host");
		const remountLeaf = await openHost();
		await waitFor(
			() => getEmbed(remountLeaf)?.querySelector(".blp-inline-edit-host.blp-inline-edit-root, .blp-inline-edit-host .blp-inline-edit-root"),
			{ timeoutMs: 15000 }
		);
		const remount = snapshot(remountLeaf);
		assert(remount.pageLinkCount === 1, `remount duplicated or removed link, got ${remount.pageLinkCount}`);
		assert(remount.hostCount === 1, `remount duplicated or removed host, got ${remount.hostCount}`);

		return {
			ok: true,
			pluginVersion: plugin.manifest?.version ?? app.plugins.manifests?.[pluginId]?.version ?? null,
			baselineClickedSource: sourcePath,
			progress,
			active,
			remount,
		};
	} finally {
		try {
			const plugin = app.plugins.plugins[pluginId];
			if (!plugin) await withTimeout(app.plugins.enablePlugin(pluginId), "finally enable plugin");
		} catch {
			// ignore
		}
	}
})();
