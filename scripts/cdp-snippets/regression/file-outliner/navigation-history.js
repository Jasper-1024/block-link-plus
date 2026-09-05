(async () => {
	const wait = ms => new Promise(r => setTimeout(r, ms));
	const assert = (ok, message) => { if (!ok) throw Error(message); };
	const original = app.workspace.getActiveFile();
	const path = `BLP_HISTORY_${Date.now()}.md`;
	const lines = ['---', 'blp_outliner: true', '---'];
	for (let i = 0; i < 60; i++) lines.push(`- Item ${i}\n  [date:: 2026-09-05T00:00:00] [updated:: 2026-09-05T00:00:00] [blp_sys:: 1] [blp_ver:: 2] ^history${i}\n  - Child ${i}\n    [date:: 2026-09-05T00:00:00] [updated:: 2026-09-05T00:00:00] [blp_sys:: 1] [blp_ver:: 2] ^historychild${i}`);
	let file, dest;
	const leaf = app.workspace.getLeaf(false);
	const command = async id => { app.commands.executeCommandById(id); await wait(250); };
	try {
		file = await app.vault.create(path, lines.join('\n') + '\n');
		dest = await app.vault.create(path + '-destination.md', '# Destination\n');
		await wait(400); await leaf.openFile(file); await wait(250);
		const beforeText = await app.vault.read(file);
		leaf.view.containerEl.querySelector('[data-blp-outliner-id="history0"] .blp-outliner-fold-toggle').click();
		leaf.view.contentEl.scrollTop = 900;
		await leaf.openFile(dest); await wait(150);
		await command('app:go-back');
		assert(leaf.view.file?.path === path, 'Back did not return to the outline');
		assert(Math.abs(leaf.view.contentEl.scrollTop - 900) < 2, 'Back lost scroll');
		assert(leaf.view.getEphemeralState().outlinerView.collapsed.includes('history0'), 'Back lost collapsed state');
		await command('app:go-forward');
		assert(leaf.view.file?.path === dest.path, 'Forward did not reopen destination');
		await command('app:go-back');
		leaf.view.containerEl.querySelector('[data-blp-outliner-id="history30"] .bullet-container').click();
		await wait(200);
		assert(leaf.view.getState().outlinerZoom === 'history30', 'Bullet did not zoom');
		await command('app:go-back');
		assert(leaf.view.file?.path === path && leaf.view.getState().outlinerZoom === null, 'Zoom back left file');
		assert(Math.abs(leaf.view.contentEl.scrollTop - 900) < 2, 'Zoom back lost scroll');
		await command('app:go-forward');
		assert(leaf.view.getState().outlinerZoom === 'history30', 'Forward lost zoom');
		await leaf.openFile(file, { eState: { subpath: '#^history55' } }); await wait(200);
		assert(leaf.view.getState().outlinerZoom === null, 'Deep link did not leave incompatible zoom');
		assert(leaf.view.containerEl.querySelector('[data-blp-outliner-id="history55"].is-blp-outliner-target'), 'Deep link target missing');
		await command('app:go-back');
		assert(leaf.view.getState().outlinerZoom === 'history30', 'Same-file link lost previous zoom');
		await command('app:go-forward');
		assert(leaf.view.getState().outlinerTarget === '#^history55', 'Same-file forward lost target');
		assert(await app.vault.read(file) === beforeText, 'Navigation changed source text');
		return { kind: 'regression', scenario: 'outliner-navigation-history', status: 'passed', evidence: { crossFile: true, scroll: 900, collapsed: true, zoom: true, sameFileLink: true, sourceUnchanged: true }, cleanup: { status: 'passed', warnings: [] } };
	} finally {
		if (original && app.vault.getAbstractFileByPath(original.path)) await leaf.openFile(original);
		for (const f of [file, dest]) if (f) { for (const l of app.workspace.getLeavesOfType('blp-file-outliner-view')) if (l.view.file?.path === f.path) l.detach(); await app.vault.delete(f); }
	}
})()
