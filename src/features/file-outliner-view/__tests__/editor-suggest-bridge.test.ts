import { EditorState } from "@codemirror/state";
import { EditorView } from "@codemirror/view";

import { OutlinerSuggestEditor, triggerEditorSuggest } from "../editor-suggest-bridge";

function createSuggestEditor(doc: string): {
	cm: EditorView;
	editor: OutlinerSuggestEditor;
	destroy: () => void;
} {
	const parent = document.createElement("div");
	document.body.appendChild(parent);

	const cm = new EditorView({
		state: EditorState.create({ doc }),
		parent,
	});

	return {
		cm,
		editor: new OutlinerSuggestEditor(cm),
		destroy: () => {
			cm.destroy();
			parent.remove();
		},
	};
}

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

	it("maps transaction selection against the completed wiki link document", () => {
		const { cm, editor, destroy } = createSuggestEditor("[[");

		editor.transaction({
			changes: [
				{
					from: { line: 0, ch: 0 },
					to: { line: 0, ch: 2 },
					text: "[[2026-6-27]]",
				},
			],
			selection: {
				from: { line: 0, ch: 13 },
				to: { line: 0, ch: 13 },
			},
		} as any);

		expect(cm.state.doc.toString()).toBe("[[2026-6-27]]");
		expect(cm.state.selection.main.anchor).toBe(13);
		expect(cm.state.selection.main.head).toBe(13);

		destroy();
	});

	it("maps transaction selection through multi-line multi-change transactions", () => {
		const { cm, editor, destroy } = createSuggestEditor("aa\n[[\nzz");

		editor.transaction({
			changes: [
				{
					from: { line: 0, ch: 0 },
					to: { line: 0, ch: 2 },
					text: "aaaa",
				},
				{
					from: { line: 1, ch: 0 },
					to: { line: 1, ch: 2 },
					text: "[[2026-6-27]]",
				},
			],
			selection: {
				from: { line: 1, ch: 13 },
				to: { line: 1, ch: 13 },
			},
		} as any);

		expect(cm.state.doc.toString()).toBe("aaaa\n[[2026-6-27]]\nzz");
		expect(cm.state.selection.main.anchor).toBe(18);
		expect(cm.state.selection.main.head).toBe(18);

		destroy();
	});

	it("closes a stale suggestion when core triggering fails and no fallback accepts it", () => {
		const fallback = { trigger: jest.fn(() => false) };
		const manager = {
			trigger: jest.fn(() => {
				throw new Error("stale suggestion context");
			}),
			suggests: [fallback],
			setCurrentSuggest: jest.fn(),
			close: jest.fn(),
		};

		const result = triggerEditorSuggest(manager, {} as OutlinerSuggestEditor, null);

		expect(result).toEqual({ triggered: false });
		expect(fallback.trigger).toHaveBeenCalledTimes(1);
		expect(manager.close).toHaveBeenCalledTimes(1);
	});
});
