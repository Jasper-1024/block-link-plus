import { EditorState } from "@codemirror/state";
import { EditorView } from "@codemirror/view";
import { markdownInputExtensions, insertMarkdownNewline } from "../markdown-input";

function createEditor(text: string, cursor = text.length) {
	return new EditorView({
		state: EditorState.create({ doc: text, selection: { anchor: cursor }, extensions: markdownInputExtensions(() => ({ brackets: true, markdown: true })) }),
		parent: document.createElement("div"),
	});
}

function type(view: EditorView, text: string) {
	const { from, to } = view.state.selection.main;
	const insert = () => view.state.update({ changes: { from, to, insert: text }, selection: { anchor: from + text.length }, userEvent: "input.type" });
	if (!view.state.facet(EditorView.inputHandler).some(handler => handler(view, from, to, text, insert))) view.dispatch(insert());
}

test("third backtick completes a fence inside the current document", () => {
	const view = createEditor("``");
	try {
		type(view, "`");
		expect(view.state.doc.toString()).toBe("```\n```");
		expect(view.state.selection.main.head).toBe(3);
	} finally { view.destroy(); }
});

test("pairing configuration reads current settings without recreating editor state", () => {
	const settings = { brackets: true, markdown: true };
	const state = EditorState.create({ extensions: markdownInputExtensions(() => settings) });
	expect(state.languageDataAt<{ brackets: string[] }>("closeBrackets", 0)[0].brackets).toEqual(expect.arrayContaining(["(", "`", "*", "_"]));
	settings.brackets = settings.markdown = false;
	expect(state.languageDataAt<{ brackets: string[] }>("closeBrackets", 0)[0].brackets).toEqual([]);
});

test("disabled Markdown pairing does not complete a fence", () => {
	const view = new EditorView({ state: EditorState.create({ doc: "``", selection: { anchor: 2 }, extensions: markdownInputExtensions(() => ({ brackets: true, markdown: false })) }) });
	try { type(view, "`"); expect(view.state.doc.toString()).toBe("```"); } finally { view.destroy(); }
});

test("bulk text is not treated as individually typed fence delimiters", () => {
	const view = createEditor("");
	try { type(view, "```\ncode\n```"); expect(view.state.doc.toString()).toBe("```\ncode\n```"); } finally { view.destroy(); }
});

test("Markdown punctuation is not paired in inline code or after escapes", () => {
	for (const text of ["`code", "\\"]) {
		const view = createEditor(text);
		try { expect(view.state.languageDataAt<{ brackets: string[] }>("closeBrackets", text.length)[0].brackets).not.toContain("*"); } finally { view.destroy(); }
	}
});

test.each([
	["```js\n```", 5, "```js\n\n```", 6],
	["```\nbody\n```", 8, "```\nbody\n\n```", 9],
	["  ```js\n  ```", 7, "  ```js\n  \n  ```", 10],
	["~~~~\ncode\n~~~~", 9, "~~~~\ncode\n\n~~~~", 10],
	["```\ncode\n```", 9, "```\ncode\n\n```", 10],
	["[ ] task\n```js\ncode\n```", 19, "[ ] task\n```js\ncode\n\n```", 20],
])("Enter within a code fence keeps the newline in the block: %s", (text, cursor, expected, head) => {
	const view = createEditor(text, cursor);
	try {
		expect(insertMarkdownNewline(view)).toBe(true);
		expect(view.state.doc.toString()).toBe(expected);
		expect(view.state.selection.main.head).toBe(head);
	} finally { view.destroy(); }
});

test.each(["plain text", "```\ncode\n```", "prefix ```", "[ ] task"])("Enter outside fenced code falls through to Outliner: %s", text => {
	const view = createEditor(text);
	try { expect(insertMarkdownNewline(view)).toBe(false); } finally { view.destroy(); }
});

test("Enter before the opening fence remains a structural operation", () => {
	const view = createEditor("```\ncode\n```", 0);
	try { expect(insertMarkdownNewline(view)).toBe(false); } finally { view.destroy(); }
});

test.each([
	["``\n```", 2, "```\n```"],
	["```\n``\n```", 6, "```\n```\n```"],
	["text ``", 7, "text ```"],
	["\\``", 3, "\\```"],
])("fence completion avoids duplicate closers and non-opening fences: %s", (text, cursor, expected) => {
	const view = createEditor(text, cursor);
	try { type(view, "`"); expect(view.state.doc.toString()).toBe(expected); } finally { view.destroy(); }
});
