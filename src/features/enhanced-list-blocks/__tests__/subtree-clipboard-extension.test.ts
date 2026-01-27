import { EditorState } from "@codemirror/state";
import { EditorView } from "@codemirror/view";
import { Settings } from "luxon";
import { App, editorInfoField, editorLivePreviewField } from "obsidian";
import { createEnhancedListBlockSelectionExtension, dispatchEnhancedListBlockSelectionClick } from "../block-selection-extension";
import { createEnhancedListSubtreeClipboardExtension } from "../subtree-clipboard-extension";

class FakeClipboardData {
	private data = new Map<string, string>();
	setData(type: string, value: string) {
		this.data.set(type, value);
	}
	getData(type: string) {
		return this.data.get(type) ?? "";
	}
}

function dispatchClipboardEvent(view: EditorView, type: "copy" | "cut" | "paste", clipboardData: FakeClipboardData) {
	const e = new Event(type, { bubbles: true, cancelable: true }) as any;
	Object.defineProperty(e, "clipboardData", { value: clipboardData });
	view.contentDOM.dispatchEvent(e);
	return e as Event;
}

function createView(docText: string) {
	const app = new App();
	const file = (app.vault as any)._addFile("test.md", docText);

	const plugin = {
		app,
		settings: {
			enable_prefix: false,
			id_prefix: "",
			id_length: 4,
			enhancedListEnabledFolders: [],
			enhancedListEnabledFiles: [file.path],
			enhancedListHandleActions: true,
			enhancedListHandleClickAction: "select-block",
		},
	} as any;

	const parent = document.createElement("div");
	document.body.appendChild(parent);

	const selectionExt = createEnhancedListBlockSelectionExtension(plugin);
	const clipboardExt = createEnhancedListSubtreeClipboardExtension(plugin, {
		infoField: editorInfoField,
		livePreviewField: editorLivePreviewField,
	});

	const state = EditorState.create({
		doc: docText,
		extensions: [
			editorInfoField.init(() => ({ app, file } as any)),
			editorLivePreviewField.init(() => true),
			selectionExt,
			clipboardExt,
		],
	});

	const view = new EditorView({ state, parent });
	return { view, parent };
}

describe("enhanced-list-blocks/subtree-clipboard-extension", () => {
	const originalNow = Settings.now;
	const originalZone = Settings.defaultZone;
	const originalRandom = Math.random;

	afterEach(() => {
		Settings.now = originalNow;
		Settings.defaultZone = originalZone;
		Math.random = originalRandom;
	});

	test("copy serializes selected subtree and strips system lines from text/plain", () => {
		const doc = [
			"- a",
			"  [date:: 2026-01-01T00:00:00] ^aaaa",
			"  - child",
			"    [date:: 2026-01-01T00:00:00] ^bbbb",
			"- b",
			"  [date:: 2026-01-01T00:00:00] ^cccc",
		].join("\n");
		const { view, parent } = createView(doc);

		try {
			dispatchEnhancedListBlockSelectionClick(view, { line: 0, shiftKey: false });

			const clipboard = new FakeClipboardData();
			const e = dispatchClipboardEvent(view, "copy", clipboard);

			expect(e.defaultPrevented).toBe(true);
			expect(clipboard.getData("text/plain")).toBe(["- a", "  - child", ""].join("\n"));

			const internal = clipboard.getData("application/x-blp-enhanced-list-subtree-v1");
			expect(internal).toContain("[date:: 2026-01-01T00:00:00] ^aaaa");
			expect(internal).toContain("[date:: 2026-01-01T00:00:00] ^bbbb");
		} finally {
			view.destroy();
			parent.remove();
		}
	});

	test("cut removes selected subtree from the document", () => {
		const doc = [
			"- a",
			"  [date:: 2026-01-01T00:00:00] ^aaaa",
			"  - child",
			"    [date:: 2026-01-01T00:00:00] ^bbbb",
			"- b",
			"  [date:: 2026-01-01T00:00:00] ^cccc",
		].join("\n");
		const { view, parent } = createView(doc);

		try {
			dispatchEnhancedListBlockSelectionClick(view, { line: 0, shiftKey: false });

			const clipboard = new FakeClipboardData();
			const e = dispatchClipboardEvent(view, "cut", clipboard);

			expect(e.defaultPrevented).toBe(true);
			expect(view.state.doc.toString()).toBe(["- b", "  [date:: 2026-01-01T00:00:00] ^cccc"].join("\n"));
		} finally {
			view.destroy();
			parent.remove();
		}
	});

	test("paste replaces selected subtree and reindents + remaps ids when internal kind is copy", () => {
		Settings.defaultZone = "utc";
		Settings.now = () => Date.parse("2026-01-09T10:20:30Z");
		let calls = 0;
		Math.random = () => {
			calls += 1;
			return calls === 1 ? 0.111111 : 0.222222;
		};

		const source = [
			"- a",
			"  [date:: 2026-01-01T00:00:00] ^src1",
			"  - child",
			"    [date:: 2026-01-01T00:00:00] ^src2",
		].join("\n");
		const { view: srcView, parent: srcParent } = createView(source);

		let internal = "";
		try {
			dispatchEnhancedListBlockSelectionClick(srcView, { line: 0, shiftKey: false });
			const clipboard = new FakeClipboardData();
			dispatchClipboardEvent(srcView, "copy", clipboard);
			internal = clipboard.getData("application/x-blp-enhanced-list-subtree-v1");
			expect(internal).toContain("\"kind\":\"copy\"");
		} finally {
			srcView.destroy();
			srcParent.remove();
		}

		const dest = [
			"- top",
			"  [date:: 2026-01-01T00:00:00] ^top1",
			"  - dest",
			"    [date:: 2026-01-01T00:00:00] ^dest1",
			"  - after",
			"    [date:: 2026-01-01T00:00:00] ^after1",
		].join("\n");
		const { view, parent } = createView(dest);

		try {
			// Select the nested `- dest` block (0-based line index 2).
			dispatchEnhancedListBlockSelectionClick(view, { line: 2, shiftKey: false });

			const clipboard = new FakeClipboardData();
			clipboard.setData("application/x-blp-enhanced-list-subtree-v1", internal);
			clipboard.setData("text/plain", "- a\n  - child\n");

			const e = dispatchClipboardEvent(view, "paste", clipboard);
			expect(e.defaultPrevented).toBe(true);

			const out = view.state.doc.toString();
			expect(out).toContain("  - a");
			expect(out).toContain("    - child");

			// System lines exist but source ids are remapped.
			expect(out).toContain("[date:: 2026-01-09T10:20:30]");
			expect(out).not.toContain("^src1");
			expect(out).not.toContain("^src2");
		} finally {
			view.destroy();
			parent.remove();
		}
	});
});

