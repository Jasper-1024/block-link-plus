(async () => {
	const wait = ms => new Promise(r => setTimeout(r, ms));
	const assert = (ok, message) => { if (!ok) throw Error(message); };
	const original = app.workspace.getActiveFile();
	const leaf = app.workspace.getLeaf(false);
	const path = `BLP_PAGE_SEARCH_${Date.now()}.md`;
	const tail = id => `  [date:: 2026-09-05T00:00:00] [updated:: 2026-09-05T00:00:00] [blp_sys:: 1] [blp_ver:: 2] ^${id}`;
	const lines = ['---', 'blp_outliner: true', '---'];
	for (let i = 0; i < 65; i++) {
		lines.push(`- ${i === 0 ? 'Alpha needle needle' : i === 50 ? '中文 NEEDLE' : 'Filler ' + i}`, tail('find' + i));
		if (i === 30) lines.push('  - Hidden needle', '  ' + tail('findchild'));
	}
	let file;
	let embeddedFile;
	const existingHighlights = new Set(CSS.highlights.keys());
	const currentRange = () => {
		const key = Array.from(CSS.highlights.keys()).find(key => !existingHighlights.has(key) && key.endsWith('-active'));
		return key ? Array.from(CSS.highlights.get(key))[0] : null;
	};
	const count = () => leaf.view.containerEl.querySelector('.blp-outliner-search-count')?.textContent;
	const input = () => leaf.view.containerEl.querySelector('.blp-outliner-page-search input');
	const active = () => leaf.view.containerEl.querySelector('.is-blp-search-active')?.dataset.blpOutlinerId;
	const update = async value => { input().value = value; input().dispatchEvent(new Event('input', { bubbles: true })); await wait(180); };
	const enter = async shiftKey => { input().dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', shiftKey, bubbles: true })); await wait(180); };
	try {
		file = await app.vault.create(path, lines.join('\n') + '\n'); await wait(400);
		await leaf.openFile(file); await wait(250);
		const source = await app.vault.read(file);
		leaf.view.containerEl.querySelector('[data-blp-outliner-id="find30"] .blp-outliner-fold-toggle').click();
		leaf.view.containerEl.querySelector('[data-blp-outliner-id="find0"] .bullet-container').click(); await wait(200);
		const historyLength = leaf.history.backHistory.length;
		app.commands.executeCommandById('editor:open-search');
		assert(input() === document.activeElement, 'Native find did not focus outline search');
		await update('needle');
		for (let i = 0; i < 40 && count() !== '1 / 4'; i++) await wait(100);
		assert(count() === '1 / 4' && active() === 'find0', 'Wrong initial results');
		const firstOffset = currentRange()?.startOffset;
		await enter(false); assert(count() === '2 / 4' && active() === 'find0', 'Repeated match in same block missing');
		assert(currentRange()?.toString().toLowerCase() === 'needle' && currentRange().startOffset !== firstOffset, 'Repeated match did not move actual highlight');
		await enter(false); assert(count() === '3 / 4' && active() === 'findchild', 'Hidden child not found');
		assert(leaf.view.containerEl.querySelector('[data-blp-outliner-id="findchild"]').getBoundingClientRect().height > 0, 'Hidden result stayed collapsed');
		await enter(false); assert(count() === '4 / 4' && active() === 'find50', 'Case-insensitive match missing');
		assert(input() === document.activeElement, 'Search navigation stole input focus');
		assert(!leaf.view.getEphemeralState().outlinerView.selection || !leaf.view.containerEl.querySelector('.blp-file-outliner-editor')?.offsetHeight, 'Search entered editor');
		await enter(false); assert(count() === '1 / 4', 'Next did not wrap');
		await enter(true); assert(count() === '4 / 4', 'Previous did not wrap');
		await update('not-present'); assert(count() === '0 / 0' && !active(), 'Zero results kept stale target');
		await update('blp_sys'); assert(count() === '0 / 0', 'Protocol metadata leaked into search');
		await update('中文'); assert(count() === '1 / 1' && active() === 'find50', 'Chinese search failed');
		await update(''); assert(count() === '0 / 0', 'Empty query failed');
		input().dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true })); await wait(150);
		assert(!input(), 'Escape did not close');
		assert(leaf.view.getState().outlinerZoom === 'find0', 'Escape did not restore zoom');
		assert(leaf.view.getEphemeralState().outlinerView.collapsed.includes('find30'), 'Escape lost fold state');
		assert(leaf.history.backHistory.length === historyLength, 'Find polluted navigation history');
		assert(await app.vault.read(file) === source, 'Find changed source');
		assert(!Array.from(CSS.highlights.keys()).some(key => !existingHighlights.has(key)), 'Highlight registry leaked');
		embeddedFile = await app.vault.create(path.replace('.md', '-embed.md'), 'Outside hiddenword\n\nEmbedded needle needle hardbreakleft  \nhardbreakright ^target\n');
		await app.vault.modify(file, ['---', 'blp_outliner: true', '---', '- Host needle', tail('mixhost'), '- ![[' + embeddedFile.basename + '#^target]]', tail('mixembed1'), '- [[needle|Label]] needle', tail('mixalias'), '- ![[' + embeddedFile.basename + '#^target]]', tail('mixembed2'), ''].join('\n'));
		await wait(600);
		leaf.view.showSearch();
		await update('needle');
		for (let i = 0; i < 50 && count() !== '1 / 6'; i++) await wait(100);
		assert(count() === '1 / 6', 'Embeds/alias produced wrong count: ' + count());
		const embedSource = await app.vault.read(embeddedFile);
		const hostSource = await app.vault.read(file);
		const anchors = [];
		for (let i = 0; i < 6; i++) {
			const range = currentRange();
			assert(range?.toString().toLowerCase() === 'needle' && range.getBoundingClientRect().height > 0, 'Missing visible exact range ' + i);
			anchors.push([range.startContainer, range.startOffset]);
			leaf.view.containerEl.querySelectorAll('.blp-outliner-page-search button')[1].click();
			await wait(150);
			assert(input() === document.activeElement, 'Button navigation stole focus');
		}
		assert(count() === '1 / 6', 'Mixed navigation did not wrap');
		assert(anchors.every((a, i) => anchors.slice(0, i).every(b => a[0] !== b[0] || a[1] !== b[1])), 'Repeated embeds reused same highlight');
		assert(anchors.every(a => a[0].isConnected), 'Navigation rebuilt embedded DOM');
		await update('hiddenword'); assert(count() === '0 / 0', 'Searched outside embedded block');
		await update('hardbreaklefthardbreakright'); assert(count() === '0 / 0', 'Hard line break was flattened');
		await update('hardbreakright'); assert(count() === '1 / 2', 'Text after hard break missing');
		assert(await app.vault.read(file) === hostSource && await app.vault.read(embeddedFile) === embedSource, 'Search changed source: ' + JSON.stringify({hostBefore: hostSource, hostAfter: await app.vault.read(file), embedBefore: embedSource, embedAfter: await app.vault.read(embeddedFile)}));
		input().dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
		return { kind: 'regression', scenario: 'outliner-page-search', status: 'passed', evidence: { ordinaryMatches: 4, mixedEmbedMatches: 6, exactRanges: true, repeatedEmbeds: true, navigationPreservesDOM: true, repeatedWithinBlock: true, hiddenAndZoom: true, wrap: true, chinese: true, focus: true, restore: true, sourceUnchanged: true }, cleanup: { status: 'passed', warnings: [] } };
	} catch (error) {
		return { kind: 'regression', scenario: 'outliner-page-search', status: 'failed', evidence: { error: String(error), count: count(), active: active(), focused: document.activeElement?.outerHTML }, cleanup: { status: 'passed', warnings: [] } };
	} finally {
		if (original && app.vault.getAbstractFileByPath(original.path)) await leaf.openFile(original);
		if (file) { for (const l of app.workspace.getLeavesOfType('blp-file-outliner-view')) if (l.view.file?.path === path) l.detach(); await app.vault.delete(file); }
		if (embeddedFile) await app.vault.delete(embeddedFile);
	}
})()
