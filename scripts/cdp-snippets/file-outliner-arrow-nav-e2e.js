// CDP regression: Outliner v2 ArrowUp/ArrowDown MUST move caret across visible blocks.
//
// Run:
//   node scripts/obsidian-cdp.js eval-file "scripts/cdp-snippets/file-outliner-arrow-nav-e2e.js"

(async () => {
	const wait = (ms) => new Promise((r) => setTimeout(r, ms));
	const waitFor = async (cond, { timeoutMs = 6000, intervalMs = 50 } = {}) => {
		const start = Date.now();
		while (Date.now() - start < timeoutMs) {
			try {
				const v = cond();
				if (v) return v;
			} catch {
				// ignore
			}
			await wait(intervalMs);
		}
		return null;
	};
	const assert = (cond, msg) => {
		if (!cond) throw new Error(msg);
	};

	const pluginId = "block-link-plus";
	const tmpFolder = "_blp_tmp";
	const tmpPath = `${tmpFolder}/file-outliner-arrow-nav-e2e.md`;

	const now = "2026-02-12T00:00:00";
	const longLine = `LONG ${"0123456789 ".repeat(120)}`;

	const content = [
		"---",
		"blp_outliner: true",
		"---",
		"",
		"- a",
		"  a mid",
		"  a last",
		`  [date:: ${now}] [updated:: ${now}] [blp_sys:: 1] [blp_ver:: 2] ^a`,
		"",
		"- b-1234567890",
		"  bbbbbbbbbb",
		`  [date:: ${now}] [updated:: ${now}] [blp_sys:: 1] [blp_ver:: 2] ^b`,
		"",
		"- s",
		`  [date:: ${now}] [updated:: ${now}] [blp_sys:: 1] [blp_ver:: 2] ^s`,
		"",
		`- t ${longLine}`,
		`  [date:: ${now}] [updated:: ${now}] [blp_sys:: 1] [blp_ver:: 2] ^t`,
		"",
	].join("\n");

	// Ensure Obsidian reloads the plugin after we rebuild `main.js`.
	await app.plugins.disablePlugin(pluginId);
	await app.plugins.enablePlugin(pluginId);
	await wait(250);

	const plugin = app?.plugins?.plugins?.[pluginId];
	assert(plugin, "plugin not found");

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

		let f = app.vault.getAbstractFileByPath(tmpPath);
		if (!f) f = await app.vault.create(tmpPath, content);
		else await app.vault.modify(f, content);

		plugin.settings.fileOutlinerEnabledFiles = Array.from(new Set([...prevEnabledFiles, tmpPath]));
		plugin.settings.fileOutlinerViewEnabled = true;
		await plugin.saveSettings();

		const leaf = app.workspace.getLeaf(false);
		await leaf.openFile(f, { active: true });
		await waitFor(() => (leaf.view?.getViewType?.() === "blp-file-outliner-view" ? true : null), {
			timeoutMs: 8000,
			intervalMs: 50,
		});
		assert(leaf.view?.getViewType?.() === "blp-file-outliner-view", "expected outliner view");
		const view = leaf.view;

		await waitFor(() => view.contentEl.querySelector('.ls-block[data-blp-outliner-id="b"]'), { timeoutMs: 8000 });

		const getPos = (cm) => {
			const head = cm.state.selection.main.head;
			const line = cm.state.doc.lineAt(head);
			return { head, line: line.number - 1, ch: head - line.from, lineText: line.text, lines: cm.state.doc.lines };
		};

		const setCursorLineCh = (cm, line0, ch) => {
			const ln = Math.max(0, Math.min(cm.state.doc.lines - 1, Math.floor(line0)));
			const line = cm.state.doc.line(ln + 1);
			const cc = Math.max(0, Math.min(line.length, Math.floor(ch)));
			cm.dispatch({ selection: { anchor: line.from + cc } });
		};

		const pressArrow = async (cm, key) => {
			const host = cm.contentDOM || cm.dom?.querySelector?.(".cm-content");
			assert(host, "missing cm contentDOM");
			host.dispatchEvent(new KeyboardEvent("keydown", { key, code: key, bubbles: true, cancelable: true }));
			await wait(0);
		};

		// --- 1) ArrowUp from b top => jump to a last line (goal column kept)
		view.enterEditMode("b", { cursorStart: 0, cursorEnd: 0, scroll: true });
		await wait(80);
		assert(view.editingId === "b", `expected editingId=b, got ${String(view.editingId)}`);
		const cm1 = view.editorView;
		setCursorLineCh(cm1, 0, 5); // goalCh=5
		await pressArrow(cm1, "ArrowUp");
		await wait(80);
		assert(view.editingId === "a", `expected ArrowUp jump to a, got ${String(view.editingId)}`);
		const posA = getPos(view.editorView);
		assert(posA.line === posA.lines - 1, `expected land on last line of a, got line=${posA.line} lines=${posA.lines}`);
		assert(posA.ch === 5, `expected goalCh=5 on a last line, got ch=${posA.ch}`);

		// --- 2) ArrowDown from a bottom => jump to b first line (same goal column)
		await pressArrow(view.editorView, "ArrowDown");
		await wait(80);
		assert(view.editingId === "b", `expected ArrowDown jump to b, got ${String(view.editingId)}`);
		const posB = getPos(view.editorView);
		assert(posB.line === 0, `expected land on first line of b, got line=${posB.line}`);
		assert(posB.ch === 5, `expected goalCh=5 on b first line, got ch=${posB.ch}`);

		// --- 3) Sticky goal column across clamp: b(last line ch=8)->s(clamp)->t(ch=8)
		setCursorLineCh(view.editorView, 1, 8);
		await pressArrow(view.editorView, "ArrowDown");
		await wait(80);
		assert(view.editingId === "s", `expected ArrowDown jump to s, got ${String(view.editingId)}`);
		const posS = getPos(view.editorView);
		assert(posS.ch === 1, `expected clamp to ch=1 on 's', got ch=${posS.ch}`);

		await pressArrow(view.editorView, "ArrowDown");
		await wait(80);
		assert(view.editingId === "t", `expected ArrowDown jump to t, got ${String(view.editingId)}`);
		const posT = getPos(view.editorView);
		assert(posT.line === 0, `expected land on first line of t, got line=${posT.line}`);
		assert(posT.ch === 8, `expected sticky goalCh=8 on t, got ch=${posT.ch}`);

		// --- 4) No prev/next => no movement (no horizontal drift)
		view.enterEditMode("a", { cursorStart: 1, cursorEnd: 1, scroll: true });
		await wait(80);
		const cmA2 = view.editorView;
		const beforeA2 = getPos(cmA2);
		await pressArrow(cmA2, "ArrowUp");
		await wait(30);
		assert(view.editingId === "a", `expected stay on a, got ${String(view.editingId)}`);
		const afterA2 = getPos(view.editorView);
		assert(afterA2.head === beforeA2.head, `expected no selection drift at top-of-first, head ${beforeA2.head} -> ${afterA2.head}`);

		view.enterEditMode("t", { cursorStart: 0, cursorEnd: 0, scroll: true });
		await wait(80);
		const cmT2 = view.editorView;
		setCursorLineCh(cmT2, 0, 99999); // end of line => visual bottom
		const beforeT2 = getPos(cmT2);
		await pressArrow(cmT2, "ArrowDown");
		await wait(30);
		assert(view.editingId === "t", `expected stay on t, got ${String(view.editingId)}`);
		const afterT2 = getPos(view.editorView);
		assert(afterT2.head === beforeT2.head, `expected no selection drift at bottom-of-last, head ${beforeT2.head} -> ${afterT2.head}`);

		return { ok: true };
	} finally {
		try {
			plugin.settings.fileOutlinerEnabledFiles = prevEnabledFiles;
			plugin.settings.fileOutlinerViewEnabled = prevRouting;
			await plugin.saveSettings();
		} catch {
			// ignore
		}

		if (prevActivePath) {
			try {
				const prev = app.vault.getAbstractFileByPath(prevActivePath);
				if (prev) await app.workspace.getLeaf(false).openFile(prev);
			} catch {
				// ignore
			}
		}
	}
})();
