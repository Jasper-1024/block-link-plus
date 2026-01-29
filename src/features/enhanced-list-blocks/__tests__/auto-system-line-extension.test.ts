import { EditorSelection, EditorState, Transaction } from "@codemirror/state";
import { EditorView } from "@codemirror/view";
import { App, editorInfoField, editorLivePreviewField } from "obsidian";
import { Settings } from "luxon";
import { createEnhancedListAutoSystemLineExtension } from "../auto-system-line-extension";

function createView(docText: string, opts?: { tabSize?: number }) {
	const app = new App();
	const file = (app.vault as any)._addFile("test.md", docText);

	const plugin = {
		app,
		settings: {
			enhancedListEnabledFolders: [],
			enhancedListEnabledFiles: [file.path],
			enhancedListHideSystemLine: true,
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
			...(opts?.tabSize ? [(EditorState as any).tabSize.of(opts.tabSize)] : []),
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

	test("treats a tab and 4 spaces as the same indentation level", () => {
		Settings.defaultZone = "utc";
		Settings.now = () => Date.parse("2026-01-10T00:00:00Z");

		const { view, parent } = createView(["- parent", "\t- a"].join("\n"));
		try {
			const insertFrom = view.state.doc.length;
			const insertText = "\n    - ";
			view.dispatch({
				changes: { from: insertFrom, to: insertFrom, insert: insertText },
				selection: EditorSelection.cursor(insertFrom + insertText.length),
			});

			expect(view.state.doc.toString()).toMatch(
				/^- parent\n\t- a\n\t  \[date:: 2026-01-10T00:00:00\] \^[a-zA-Z0-9_-]+\n {4}- $/
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

	test("keeps cursor after `- ` when selection jumps into hidden system line", () => {
		Settings.defaultZone = "utc";
		Settings.now = () => Date.parse("2026-01-10T00:00:00Z");

		const { view, parent } = createView(["---", "blp_enhanced_list: true", "---", "", "- parent", "  - child"].join("\n"));
		try {
			const originalDoc = view.state.doc;
			const childLineNumber =
				originalDoc.lines >= 1
					? (() => {
							for (let n = 1; n <= originalDoc.lines; n++) {
								if (originalDoc.line(n).text === "  - child") return n;
							}
							return null;
						})()
					: null;

			expect(childLineNumber).not.toBeNull();

			const childLine = originalDoc.line(childLineNumber!);
			const insertFrom = childLine.to;
			const insertText = "\n  - ";

			view.dispatch({
				changes: { from: insertFrom, to: insertFrom, insert: insertText },
				selection: EditorSelection.cursor(insertFrom + insertText.length),
			});

			const afterInsertDoc = view.state.doc;
			let systemLineNumber: number | null = null;
			for (let n = 1; n <= afterInsertDoc.lines; n++) {
				if (afterInsertDoc.line(n).text.includes("[date:: ")) {
					systemLineNumber = n;
					break;
				}
			}

			expect(systemLineNumber).not.toBeNull();

			const systemLine = afterInsertDoc.line(systemLineNumber!);

			// Simulate Obsidian restoring selection to the pre-insert position (lands in system line).
			view.dispatch({
				selection: EditorSelection.cursor(systemLine.from + 4),
			});

			const head = view.state.selection.main.head;
			const line = view.state.doc.lineAt(head);

			expect(line.text).toBe("  - ");
			expect(head - line.from).toBe(4);
		} finally {
			view.destroy();
			parent.remove();
		}
	});

	test("prevents cursor from entering hidden system line when backspacing blank line", () => {
		const { view, parent } = createView(
			["- hi", "  [date:: 2026-01-12T23:14:50] ^zqio", ""].join("\n")
		);
		try {
			view.dispatch({
				selection: EditorSelection.cursor(view.state.doc.length),
			});

			view.dispatch({
				changes: { from: view.state.doc.length - 1, to: view.state.doc.length, insert: "" },
				annotations: Transaction.userEvent.of("delete.backward"),
			});

			const head = view.state.selection.main.head;
			const line = view.state.doc.lineAt(head);

			expect(line.text).toBe("- hi");
			expect(head).toBe(line.to);
		} finally {
			view.destroy();
			parent.remove();
		}
	});

	test("does not insert system line across a paragraph break (new list elsewhere)", () => {
		Settings.defaultZone = "utc";
		Settings.now = () => Date.parse("2026-01-10T00:00:00Z");

		const { view, parent } = createView(["- a", "para"].join("\n"));
		try {
			const insertFrom = view.state.doc.length;
			const insertText = "\n- ";
			view.dispatch({
				changes: { from: insertFrom, to: insertFrom, insert: insertText },
				selection: EditorSelection.cursor(insertFrom + insertText.length),
			});

			expect(view.state.doc.toString()).toBe(["- a", "para", "- "].join("\n"));
		} finally {
			view.destroy();
			parent.remove();
		}
	});
});
