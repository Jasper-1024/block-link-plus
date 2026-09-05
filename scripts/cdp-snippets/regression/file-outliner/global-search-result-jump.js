// Actual core Global Search result clicks, not synthetic line-based openFile state.
// Run with obsidian-cdp.js eval-file and an explicit isolated runtime port.
(async () => {
	const wait = ms => new Promise(resolve => setTimeout(resolve, ms));
	const assert = (condition, message) => { if (!condition) throw Error(message); };
	const waitFor = async fn => {
		const deadline = Date.now() + 6000;
		while (Date.now() < deadline) { if (fn()) return; await wait(50); }
		throw Error("Timed out waiting for search/view state");
	};
	const search = app.internalPlugins.plugins["global-search"]?.instance;
	assert(search, "Core Search must be enabled");
	const originalFile = app.workspace.getActiveFile();
	const originalSearchLeaves = new Set(app.workspace.getLeavesOfType("search"));
	const originalSearch = app.workspace.getLeavesOfType("search")[0]?.view.getState()?.query ?? "";
	const needle = `BLP_GLOBAL_JUMP_${Date.now()}`;
	const filePath = `${needle}.md`;
	const lines = ["---", "blp_outliner: true", "---"];
	for (let i = 0; i < 80; i++) {
		lines.push(`- ${i === 65 ? needle + " body" : "filler " + i}`);
		if (i === 35) lines.push(`  ${needle} continuation`);
		lines.push(`  [date:: 2026-09-05T00:00:00] [updated:: 2026-09-05T00:00:00] [blp_sys:: 1] [blp_ver:: 2] ^global${i}`);
	}
	let file;
	const clicks = [];
	try {
		file = await app.vault.create(filePath, lines.join("\n") + "\n");
		await waitFor(() => app.metadataCache.getFileCache(file)?.frontmatter?.blp_outliner === true);
		search.openGlobalSearch(needle);
		const matches = () => Array.from(document.querySelectorAll(".search-result-file-match")).filter(el => el.textContent.includes(needle));
		await waitFor(() => matches().length === 2);
		for (const [index, id] of [[1, "global65"], [0, "global35"], [1, "global65"]]) {
			// Existing target hints fade asynchronously. Clear only this fixture's
			// previous hints so each assertion measures the new click, not a stale one.
			const previousView = app.workspace.getLeavesOfType("blp-file-outliner-view").find(leaf => leaf.view.file?.path === filePath)?.view;
			previousView?.containerEl.querySelectorAll(".is-blp-outliner-target").forEach(el => el.classList.remove("is-blp-outliner-target"));
			// Matches are real core Search DOM nodes, so its production click handler
			// decides which ephemeral-state shape to send to the Outliner.
			matches()[index].click();
			const view = () => app.workspace.getLeavesOfType("blp-file-outliner-view").find(leaf => leaf.view.file?.path === filePath)?.view;
			const visible = () => {
				const v = view();
				const row = v?.containerEl.querySelector(`[data-blp-outliner-id="${id}"]`);
				if (!row) return false;
				const rect = row.getBoundingClientRect(), host = v.contentEl.getBoundingClientRect();
				return rect.top >= host.top && rect.bottom <= host.bottom;
			};
			await waitFor(visible);
			await waitFor(() => view()?.containerEl.querySelector(".is-blp-outliner-target")?.dataset.blpOutlinerId === id);
			assert(view().contentEl.scrollTop > 0, "Target remained below the first viewport");
			clicks.push({ id, visible: true, highlightedId: id, scrollTop: view().contentEl.scrollTop });
		}
		return { kind: "regression", scenario: "global-search-result-jump", status: "passed", evidence: { clicks }, cleanup: { status: "passed", warnings: [] } };
	} finally {
		search.openGlobalSearch(originalSearch);
		for (const leaf of app.workspace.getLeavesOfType("search")) if (!originalSearchLeaves.has(leaf)) leaf.detach();
		if (originalFile && app.vault.getAbstractFileByPath(originalFile.path)) await app.workspace.getLeaf(false).openFile(originalFile);
		for (const leaf of app.workspace.getLeavesOfType("blp-file-outliner-view")) if (leaf.view.file?.path === filePath) leaf.detach();
		if (file) await app.vault.delete(file);
	}
})()
