import { EditorSelection, EditorState } from "@codemirror/state";
import { EditorView } from "@codemirror/view";
import { App, editorInfoField, editorLivePreviewField } from "obsidian";
import { createEnhancedListDeleteSubtreeExtension } from "../delete-subtree-extension";

function createView(docText: string, options?: { deleteSubtree?: boolean }) {
	const app = new App();
	const file = (app.vault as any)._addFile("test.md", docText);

	const plugin = {
		app,
		settings: {
			enhancedListEnabledFolders: [],
			enhancedListEnabledFiles: [file.path],
			enhancedListDeleteSubtreeOnListItemDelete: options?.deleteSubtree === true,
		},
	} as any;

	const parent = document.createElement("div");
	document.body.appendChild(parent);

	const state = EditorState.create({
		doc: docText,
		selection: EditorSelection.cursor(0),
		extensions: [
			editorInfoField.init(() => ({ app, file, hoverPopover: null } as any)),
			editorLivePreviewField.init(() => true),
			createEnhancedListDeleteSubtreeExtension(plugin),
		],
	});

	const view = new EditorView({ state, parent });

	return { view, parent };
}

describe("enhanced-list-blocks/delete-subtree-extension", () => {
	test("removes system line (keeps children) when list marker is removed (default)", () => {
		const { view, parent } = createView(
			[
				"- parent",
				"  [date:: 2026-01-10T00:00:00] ^abc",
				"  - child",
				"- next",
			].join("\n")
		);
		try {
			view.dispatch({
				changes: { from: 0, to: 1, insert: "" },
				selection: EditorSelection.cursor(0),
			});

			expect(view.state.doc.toString()).toBe([" parent", "  - child", "- next"].join("\n"));
		} finally {
			view.destroy();
			parent.remove();
		}
	});

	test("skips subtree deletion while outliner is applying structural edits", () => {
		const initial = [
			"- parent",
			"  [date:: 2026-01-10T00:00:00] ^abc",
			"  - child",
			"- next",
		].join("\n");

		const { view, parent } = createView(initial, { deleteSubtree: true });
		try {
			(window as any).__blpOutlinerApplying = 1;
			view.dispatch({
				changes: { from: 0, to: 1, insert: "" },
				selection: EditorSelection.cursor(0),
			});

			expect(view.state.doc.toString()).toBe(
				[
					" parent",
					"  [date:: 2026-01-10T00:00:00] ^abc",
					"  - child",
					"- next",
				].join("\n")
			);
		} finally {
			delete (window as any).__blpOutlinerApplying;
			view.destroy();
			parent.remove();
		}
	});

	test("removes system line (keeps children) when parent line is removed (cut line, default)", () => {
		const initial = [
			"- parent",
			"  [date:: 2026-01-10T00:00:00] ^abc",
			"  - child",
			"- next",
		].join("\n");

		const { view, parent } = createView(initial);
		try {
			const firstNewline = initial.indexOf("\n");
			view.dispatch({
				changes: { from: 0, to: firstNewline + 1, insert: "" },
				selection: EditorSelection.cursor(0),
			});

			expect(view.state.doc.toString()).toBe(["  - child", "- next"].join("\n"));
		} finally {
			view.destroy();
			parent.remove();
		}
	});

	test("deletes subtree when enabled and list marker is removed", () => {
		const { view, parent } = createView(
			[
				"- parent",
				"  [date:: 2026-01-10T00:00:00] ^abc",
				"  - child",
				"- next",
			].join("\n"),
			{ deleteSubtree: true }
		);
		try {
			view.dispatch({
				changes: { from: 0, to: 1, insert: "" },
				selection: EditorSelection.cursor(0),
			});

			expect(view.state.doc.toString()).toBe("- next");
		} finally {
			view.destroy();
			parent.remove();
		}
	});

	test("deletes subtree when enabled and parent line is removed (cut line)", () => {
		const initial = [
			"- parent",
			"  [date:: 2026-01-10T00:00:00] ^abc",
			"  - child",
			"- next",
		].join("\n");

		const { view, parent } = createView(initial, { deleteSubtree: true });
		try {
			const firstNewline = initial.indexOf("\n");
			view.dispatch({
				changes: { from: 0, to: firstNewline + 1, insert: "" },
				selection: EditorSelection.cursor(0),
			});

			expect(view.state.doc.toString()).toBe("- next");
		} finally {
			view.destroy();
			parent.remove();
		}
	});

	test("does not delete subtree when list marker is replaced by another marker", () => {
		const initial = [
			"- parent",
			"  [date:: 2026-01-10T00:00:00] ^abc",
			"  - child",
			"- next",
		].join("\n");

		const { view, parent } = createView(initial);
		try {
			view.dispatch({
				changes: { from: 0, to: 1, insert: "*" },
				selection: EditorSelection.cursor(1),
			});

			expect(view.state.doc.toString()).toBe(
				[
					"* parent",
					"  [date:: 2026-01-10T00:00:00] ^abc",
					"  - child",
					"- next",
				].join("\n")
			);
		} finally {
			view.destroy();
			parent.remove();
		}
	});

	test("does not delete subtree when only indentation is removed", () => {
		const initial = [
			"  - child",
			"  [date:: 2026-01-10T00:00:00] ^abc",
			"- next",
		].join("\n");

		const { view, parent } = createView(initial);
		try {
			view.dispatch({
				changes: { from: 0, to: 2, insert: "" },
				selection: EditorSelection.cursor(0),
			});

			expect(view.state.doc.toString()).toBe(
				[
					"- child",
					"  [date:: 2026-01-10T00:00:00] ^abc",
					"- next",
				].join("\n")
			);
		} finally {
			view.destroy();
			parent.remove();
		}
	});

	test("does not remove system-line-like text inside fenced code blocks", () => {
		const { view, parent } = createView(
			[
				"- parent",
				"  [date:: 2026-01-10T00:00:00] ^abc",
				"  ```txt",
				"  [date:: 2026-01-10T00:00:00] ^nope",
				"  ```",
				"  - child",
				"- next",
			].join("\n")
		);
		try {
			view.dispatch({
				changes: { from: 0, to: 1, insert: "" },
				selection: EditorSelection.cursor(0),
			});

			expect(view.state.doc.toString()).toBe(
				[
					" parent",
					"  ```txt",
					"  [date:: 2026-01-10T00:00:00] ^nope",
					"  ```",
					"  - child",
					"- next",
				].join("\n")
			);
		} finally {
			view.destroy();
			parent.remove();
		}
	});

	test("deletes subtree containing fenced code blocks even if fence content is not indented", () => {
		const initial = [
			"- parent",
			"  [date:: 2026-01-10T00:00:00] ^abc",
			"  ```txt",
			"console.log('hi')",
			"  ```",
			"- next",
		].join("\n");

		const { view, parent } = createView(initial, { deleteSubtree: true });
		try {
			view.dispatch({
				changes: { from: 0, to: 1, insert: "" },
				selection: EditorSelection.cursor(0),
			});

			expect(view.state.doc.toString()).toBe("- next");
		} finally {
			view.destroy();
			parent.remove();
		}
	});
});
