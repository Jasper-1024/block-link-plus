// CDP regression: Obsidian search-result style line navigation MUST scroll
// File Outliner View to the matching block.
//
// Run:
//   $env:OB_CDP_PORT='19225'; $env:OB_CDP_TITLE_CONTAINS=' - blp - '; node scripts/obsidian-cdp.js eval-file "scripts/cdp-snippets/file-outliner-search-line-jump.js"

(async () => {
	const wait = (ms) => new Promise((r) => setTimeout(r, ms));
	const assert = (cond, msg) => {
		if (!cond) throw new Error(msg);
	};

	const waitFor = async (fn, { timeoutMs = 10000, stepMs = 50 } = {}) => {
		const t0 = Date.now();
		while (Date.now() - t0 < timeoutMs) {
			const v = fn();
			if (v) return v;
			await wait(stepMs);
		}
		return null;
	};

	const pluginId = "block-link-plus";
	const tmpFolder = "_blp_tmp";
	const outlinerPath = `${tmpFolder}/outliner-search-line-jump.md`;
	const targetIndex = 45;
	const targetId = "s045";
	const targetLine = 3 + targetIndex * 2;
	const legacyTargetId = "legacy-child";
	const legacyParentId = "legacy-parent";
	const legacyTargetLine = 3 + 70 * 2 + 1;
	const now = "2026-06-12T00:00:00";

	const blocks = [];
	for (let i = 0; i < 70; i++) {
		const id = `s${String(i).padStart(3, "0")}`;
		const label = i === targetIndex ? `TARGET_NEEDLE block ${i}` : `filler block ${i}`;
		blocks.push(`- ${label}`);
		blocks.push(`  [date:: ${now}] [updated:: ${now}] [blp_sys:: 1] [blp_ver:: 2] ^${id}`);
	}
	blocks.push("- legacy parent");
	blocks.push("  - LEGACY_TARGET_NEEDLE child");
	blocks.push(`    [date:: ${now}] [updated:: ${now}] [blp_sys:: 1] [blp_ver:: 2] ^${legacyTargetId}`);
	blocks.push(`  [date:: ${now}] [updated:: ${now}] [blp_sys:: 1] [blp_ver:: 2] ^${legacyParentId}`);

	const outlinerContent = ["---", "blp_outliner: true", "---", ...blocks, ""].join("\n");

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

		let file = app.vault.getAbstractFileByPath(outlinerPath);
		if (!file) file = await app.vault.create(outlinerPath, outlinerContent);
		else await app.vault.modify(file, outlinerContent);

		plugin.settings.fileOutlinerEnabledFiles = Array.from(new Set([...prevEnabledFiles, outlinerPath]));
		plugin.settings.fileOutlinerViewEnabled = true;
		await plugin.saveSettings();

		const isTargetVisible = (leaf) => {
			const root = leaf.view?.containerEl;
			const row = root?.querySelector?.(`[data-blp-outliner-id="${targetId}"]`);
			const host = leaf.view?.contentEl;
			if (!row || !host) return false;
			const rowRect = row.getBoundingClientRect();
			const hostRect = host.getBoundingClientRect();
			return rowRect.top >= hostRect.top && rowRect.bottom <= hostRect.bottom;
		};
		const highlightedId = (leaf) =>
			leaf.view?.containerEl?.querySelector?.(".is-blp-outliner-target")?.dataset?.blpOutlinerId ?? null;
		const clearHighlights = (leaf) => {
			leaf.view?.containerEl?.querySelectorAll?.(".is-blp-outliner-target")?.forEach((el) => {
				el.classList.remove("is-blp-outliner-target");
			});
		};
		const isBlockVisible = (leaf, id) => {
			const root = leaf.view?.containerEl;
			const row = root?.querySelector?.(`[data-blp-outliner-id="${id}"]`);
			const host = leaf.view?.contentEl;
			if (!row || !host) return false;
			const rowRect = row.getBoundingClientRect();
			const hostRect = host.getBoundingClientRect();
			return rowRect.top >= hostRect.top && rowRect.bottom <= hostRect.bottom;
		};

		const leaf = app.workspace.getLeaf(false);
		clearHighlights(leaf);
		await leaf.openFile(file, {
			active: true,
			eState: {
				line: targetLine,
				startLoc: { line: targetLine, ch: 2 },
				endLoc: { line: targetLine, ch: 15 },
			},
		});

		await waitFor(() => (leaf.view?.getViewType?.() === "blp-file-outliner-view" ? true : null));
		assert(leaf.view?.getViewType?.() === "blp-file-outliner-view", "expected active leaf to be File Outliner view");

		await waitFor(() => (isTargetVisible(leaf) ? true : null), { timeoutMs: 3000 });
		assert(isTargetVisible(leaf), "line-oriented open state did not scroll target block into view");
		await waitFor(() => (highlightedId(leaf) === targetId ? true : null), { timeoutMs: 1000 });
		assert(highlightedId(leaf) === targetId, `line-oriented open state highlighted ${highlightedId(leaf)} instead of ${targetId}`);

		clearHighlights(leaf);
		await leaf.openFile(file, {
			active: true,
			eState: {
				subpath: `#^${targetId}`,
				line: 3,
				startLoc: { line: 3, ch: 0 },
				endLoc: { line: 3, ch: 1 },
			},
		});

		await waitFor(() => (isTargetVisible(leaf) ? true : null), { timeoutMs: 3000 });
		assert(isTargetVisible(leaf), "subpath navigation regressed");
		await waitFor(() => (highlightedId(leaf) === targetId ? true : null), { timeoutMs: 1000 });
		assert(highlightedId(leaf) === targetId, `subpath navigation highlighted ${highlightedId(leaf)} instead of ${targetId}`);

		clearHighlights(leaf);
		await leaf.openFile(file, {
			active: true,
			eState: {
				line: legacyTargetLine,
				startLoc: { line: legacyTargetLine, ch: 4 },
				endLoc: { line: legacyTargetLine, ch: 25 },
			},
		});

		await waitFor(() => (isBlockVisible(leaf, legacyTargetId) ? true : null), { timeoutMs: 3000 });
		assert(isBlockVisible(leaf, legacyTargetId), "legacy line-oriented open state did not scroll child block into view");
		await waitFor(() => (highlightedId(leaf) === legacyTargetId ? true : null), { timeoutMs: 1000 });
		assert(
			highlightedId(leaf) === legacyTargetId,
			`legacy line-oriented open state highlighted ${highlightedId(leaf)} instead of ${legacyTargetId}`
		);

		return { ok: true, targetLine, targetId, legacyTargetLine, legacyTargetId };
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
	}
})();
