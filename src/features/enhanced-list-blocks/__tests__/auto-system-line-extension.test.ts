import { EditorSelection, EditorState } from "@codemirror/state";
import { EditorView } from "@codemirror/view";
import { App, editorInfoField, editorLivePreviewField } from "obsidian";
import { Settings } from "luxon";
import { createEnhancedListAutoSystemLineExtension } from "../auto-system-line-extension";

function createView(docText: string) {
	const app = new App();
	const file = (app.vault as any)._addFile("test.md", docText);

	const plugin = {
		app,
		settings: {
			enhancedListEnabledFolders: [],
			enhancedListEnabledFiles: [file.path],
			enable_prefix: false,
			id_prefix: "",
			id_length: 4,
		},
	} as any;

	const parent = document.createElement("div");
	document.body.appendChild(parent);

	const state = EditorState.create({
		doc: docText,
		selection: EditorSelection.cursor(docText.length),
		extensions: [
			editorInfoField.init(() => ({ app, file, hoverPopover: null } as any)),
			editorLivePreviewField.init(() => true),
			createEnhancedListAutoSystemLineExtension(plugin),
		],
	});

	const view = new EditorView({ state, parent });

	return { view, parent };
}

describe("enhanced-list-blocks/auto-system-line-extension", () => {
	const originalNow = Settings.now;
	const originalZone = Settings.defaultZone;

	afterEach(() => {
		Settings.now = originalNow;
		Settings.defaultZone = originalZone;
	});

	test("inserts system line when creating the next list item", () => {
		Settings.defaultZone = "utc";
		Settings.now = () => Date.parse("2026-01-10T00:00:00Z");

		const { view, parent } = createView("- a");
		try {
			const insertFrom = view.state.doc.length;
			const insertText = "\n- ";
			view.dispatch({
				changes: { from: insertFrom, to: insertFrom, insert: insertText },
				selection: EditorSelection.cursor(insertFrom + insertText.length),
			});

			expect(view.state.doc.toString()).toMatch(
				/^- a\n  \[date:: 2026-01-10T00:00:00\] \^[a-zA-Z0-9_-]+\n- $/
			);
		} finally {
			view.destroy();
			parent.remove();
		}
	});

	test("inserts system line before child lists", () => {
		Settings.defaultZone = "utc";
		Settings.now = () => Date.parse("2026-01-10T00:00:00Z");

		const { view, parent } = createView(["- parent", "  - child"].join("\n"));
		try {
			const insertFrom = view.state.doc.length;
			const insertText = "\n- ";
			view.dispatch({
				changes: { from: insertFrom, to: insertFrom, insert: insertText },
				selection: EditorSelection.cursor(insertFrom + insertText.length),
			});

			expect(view.state.doc.toString()).toMatch(
				/^- parent\n  \[date:: 2026-01-10T00:00:00\] \^[a-zA-Z0-9_-]+\n  - child\n- $/
			);
		} finally {
			view.destroy();
			parent.remove();
		}
	});

	test("relocates existing system line if placed after child lists", () => {
		Settings.defaultZone = "utc";
		Settings.now = () => Date.parse("2026-01-10T00:00:00Z");

		const { view, parent } = createView(
			[
				"- parent",
				"  - child",
				"  [date:: 2026-01-01T00:00:00] ^abc",
			].join("\n")
		);
		try {
			const insertFrom = view.state.doc.length;
			const insertText = "\n- ";
			view.dispatch({
				changes: { from: insertFrom, to: insertFrom, insert: insertText },
				selection: EditorSelection.cursor(insertFrom + insertText.length),
			});

			expect(view.state.doc.toString()).toBe(
				[
					"- parent",
					"  [date:: 2026-01-01T00:00:00] ^abc",
					"  - child",
					"- ",
				].join("\n")
			);
		} finally {
			view.destroy();
			parent.remove();
		}
	});
});
