/* Manual runtime regression. Uses the repository CDP client, never a default port.
 * node scripts/verify-outliner-markdown-input.cjs <port> <isolated-vault-name>
 */
const { execFileSync } = require("node:child_process");
const path = require("node:path");
const assert = require("node:assert/strict");

const [port, vault] = process.argv.slice(2);
if (!/^\d+$/.test(port || "") || !vault) throw Error("Pass an explicit port and isolated vault name");
const client = path.join(__dirname, "obsidian-cdp.js");
function cdp(...args) {
	const out = execFileSync(process.execPath, [client, "--port", port, "--title-contains", vault, ...args], {
		encoding: "utf8", timeout: 15000, stdio: ["ignore", "pipe", "pipe"],
	});
	return out.trim() === "ok" ? true : JSON.parse(out);
}
const evaluate = expression => cdp("eval", expression);
const key = combo => cdp("key", combo);
function type(text) {
	for (const ch of text) {
		cdp("call", "Input.dispatchKeyEvent", JSON.stringify({ type: "keyDown", key: ch, text: ch }));
		cdp("call", "Input.dispatchKeyEvent", JSON.stringify({ type: "keyUp", key: ch }));
	}
}
const prior = evaluate(`({vault:app.vault.getName(),file:app.workspace.getActiveFile()?.path,brackets:app.vault.getConfig('autoPairBrackets'),markdown:app.vault.getConfig('autoPairMarkdown')})`);
assert.equal(prior.vault, vault, "Wrong runtime");
const folder = `blp-input-probe-${Date.now()}`;
const results = [];
try {
	evaluate(`(async()=>{
		await app.vault.createFolder(${JSON.stringify(folder)});
		await app.vault.create(${JSON.stringify(folder + "/native.md")},'');
		await app.vault.create(${JSON.stringify(folder + "/outline.md")},'---\\nblp_outliner: true\\n---\\n- seed\\n'.replaceAll('\\\\n','\\n'));
		app.vault.setConfig('autoPairBrackets',true);app.vault.setConfig('autoPairMarkdown',true);
		return true;
	})()`);
	function prepare(mode, text = "", selected = false) {
		return evaluate(`(async()=>{
			const leaf=app.workspace.getLeaf(false);
			await leaf.openFile(app.vault.getAbstractFileByPath(${JSON.stringify(folder + "/")}+${JSON.stringify(mode)}+'.md'));
			await new Promise(r=>setTimeout(r,100));
			let cm;
			if(${JSON.stringify(mode)}==='native'){
				await leaf.view.setState({...leaf.view.getState(),mode:'source',source:false},{});cm=leaf.view.editor.cm;
			}else{
				if(leaf.view.getViewType()!=='blp-file-outliner-view')throw Error('Outliner routing is not enabled');
				leaf.view.enterEditMode(Array.from(leaf.view.blockById.keys())[0],{cursorStart:0,cursorEnd:0,scroll:false});
				cm=leaf.view.editorView;
			}
			const text=${JSON.stringify(text)};
			cm.dispatch({changes:{from:0,to:cm.state.doc.length,insert:text},selection:{anchor:${selected ? 0 : text.length},head:text.length}});cm.focus();return true;
		})()`);
	}
	const snapshot = () => evaluate(`(()=>{const v=app.workspace.activeLeaf.view;const cm=v.editorView||v.editor.cm;return {text:cm.state.doc.toString(),head:cm.state.selection.main.head,anchor:cm.state.selection.main.anchor,blocks:v.outlinerFile?.blocks?.length};})()`);
	for (const [name, chars, selected] of [
		["parentheses", "()"], ["inline-code", "`"], ["asterisk", "*"], ["underscore", "_"],
		["wrap-code", "`", true], ["wrap-emphasis", "*", true], ["wrap-strike", "~", true], ["wrap-highlight", "=", true],
		["fence", "```"],
	]) {
		const states = [];
		for (const mode of ["native", "outline"]) {
			prepare(mode, selected ? "word" : "", selected); type(chars);
			const { text, head, anchor } = snapshot(); states.push({ text, head, anchor });
		}
		assert.deepEqual(states[1], states[0], name); results.push(name);
	}
	prepare("outline", "");
	type("(");
	cdp("call", "Input.dispatchKeyEvent", JSON.stringify({ type: "keyDown", key: "Backspace", code: "Backspace", windowsVirtualKeyCode: 8 }));
	assert.equal(snapshot().text, ""); results.push("pair-deletion");
	for (const initial of ["```js\n```", "[ ] task\n```js\n```", "~~~\n~~~"]) {
		prepare("outline", initial);
		const before = snapshot();
		const cursor = initial.lastIndexOf("\n") + 1;
		evaluate(`(()=>{const cm=app.workspace.activeLeaf.view.editorView;cm.dispatch({selection:{anchor:${cursor}}});cm.focus();return true;})()`);
		key("Enter");
		assert.equal(snapshot().text, initial.slice(0, cursor) + "\n" + initial.slice(cursor));
		assert.equal(snapshot().blocks, before.blocks);
	}
	results.push("before-closer-enter-including-task");
	prepare("outline", ""); type("```js"); key("Enter"); type("code"); key("Enter");
	const code = snapshot(); key("Ctrl+z"); key("Ctrl+y"); assert.equal(snapshot().text, code.text);
	evaluate(`(async()=>{const v=app.workspace.activeLeaf.view;v.exitEditMode(v.editingId);await new Promise(r=>setTimeout(r,800));return true;})()`);
	evaluate(`(async()=>{await app.workspace.getLeaf(false).openFile(app.vault.getAbstractFileByPath(${JSON.stringify(folder + "/native.md")}));await app.workspace.getLeaf(false).openFile(app.vault.getAbstractFileByPath(${JSON.stringify(folder + "/outline.md")}));return true;})()`);
	assert.equal(evaluate("app.workspace.activeLeaf.view.outlinerFile.blocks[0].text"), code.text);
	results.push("history-and-save-reopen");
	prepare("outline", "plain"); const count = snapshot().blocks; key("Enter"); assert.equal(snapshot().blocks, count + 1);
	results.push("outside-fence-structural-enter");
	prepare("outline", "");
	evaluate("app.vault.setConfig('autoPairBrackets',false);app.vault.setConfig('autoPairMarkdown',false);true");
	type("(`"); assert.equal(snapshot().text, "(`");
	evaluate("app.vault.setConfig('autoPairBrackets',true);app.vault.setConfig('autoPairMarkdown',true);true");
	type(" ("); assert.equal(snapshot().text, "(` ()"); results.push("live-setting-toggle");
	prepare("outline", "");
	cdp("call", "Input.imeSetComposition", JSON.stringify({ text: "中文", selectionStart: 2, selectionEnd: 2 }));
	cdp("call", "Input.insertText", JSON.stringify({ text: "中文" }));
	assert.equal(snapshot().text, "中文"); results.push("cdp-composition-commit");
	prepare("outline", "");
	cdp("call", "Input.insertText", JSON.stringify({ text: "```\n中文\n```" }));
	assert.equal(snapshot().text, "```\n中文\n```"); results.push("bulk-input");
} finally {
	evaluate(`(async()=>{
		app.vault.setConfig('autoPairBrackets',${JSON.stringify(prior.brackets)});app.vault.setConfig('autoPairMarkdown',${JSON.stringify(prior.markdown)});
		const prior=app.vault.getAbstractFileByPath(${JSON.stringify(prior.file || "")});
		if(prior)await app.workspace.getLeaf(false).openFile(prior);
		for(const leaf of app.workspace.getLeavesOfType('blp-file-outliner-view'))if(leaf.view.file?.path.startsWith(${JSON.stringify(folder + "/")}))leaf.detach();
		const folder=app.vault.getAbstractFileByPath(${JSON.stringify(folder)});if(folder)await app.vault.delete(folder,true);
		return true;
	})()`);
}
console.log(JSON.stringify({ status: "passed", vault, port, results, cleanup: "passed" }, null, 2));
