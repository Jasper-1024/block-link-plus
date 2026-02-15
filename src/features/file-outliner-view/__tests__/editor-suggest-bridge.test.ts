import { EditorState } from "@codemirror/state";
import { EditorView } from "@codemirror/view";

import { OutlinerSuggestEditor } from "../editor-suggest-bridge";

describe("editor-suggest-bridge", () => {
	it("does not throw when containerEl.win is a read-only getter", () => {
		const parent = document.createElement("div");
		document.body.appendChild(parent);

		const cm = new EditorView({
			state: EditorState.create({ doc: "hello" }),
			parent,
		});

		// Simulate Obsidian/CM6: `win` can be a getter without a setter.
		Object.defineProperty(cm.dom, "win", {
			get() {
				return window;
			},
			configurable: true,
		});

		expect(() => new OutlinerSuggestEditor(cm)).not.toThrow();
		cm.destroy();
	});

	it("can provide a logical hasFocus shim for EditorSuggest gating", () => {
		const parent = document.createElement("div");
		document.body.appendChild(parent);

		const cm = new EditorView({
			state: EditorState.create({ doc: "hello" }),
			parent,
		});

		new OutlinerSuggestEditor(cm, { logicalHasFocus: () => true });
		expect(cm.hasFocus).toBe(true);

		cm.destroy();
	});

	it("supports toggleMarkdownFormatting for common wrappers (bold)", () => {
		const parent = document.createElement("div");
		document.body.appendChild(parent);

		const cm = new EditorView({
			state: EditorState.create({ doc: "hello", selection: { anchor: 0, head: 5 } }),
			parent,
		});

		const editor = new OutlinerSuggestEditor(cm);
		editor.toggleMarkdownFormatting("bold");
		expect(cm.state.doc.toString()).toBe("**hello**");

		// Unwrap when selection is directly surrounded by tokens.
		cm.dispatch({ selection: { anchor: 2, head: 7 } });
		editor.toggleMarkdownFormatting("bold");
		expect(cm.state.doc.toString()).toBe("hello");

		cm.destroy();
	});
});
