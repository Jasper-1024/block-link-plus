import { EditorView } from "@codemirror/view";

// `@codemirror/basic-setup` can pull in a different CM6 dependency tree in Jest, causing
// "Unrecognized extension value" errors. We only care about our host wiring, so stub it here.
jest.mock("@codemirror/basic-setup", () => ({ basicSetup: [] }));

const { createOutlinerEditorState } = require("../editor-state") as typeof import("../editor-state");

describe("file-outliner-view/editor-state", () => {
	test("docChanged triggers host hooks", () => {
		const calls = { doc: 0, suggest: 0 };

		const state = createOutlinerEditorState(
			"hi",
			{ cursorStart: 0, cursorEnd: 0 },
			{
				isSyncSuppressed: () => false,
				isArrowNavDispatching: () => false,
				shouldPreserveArrowNavGoalOnce: () => false,
				onResetArrowNavGoalColumn: () => undefined,
				onPlainTextPasteShortcut: () => undefined,
				onDocChanged: () => {
					calls.doc += 1;
				},
				onMaybeTriggerSuggest: () => {
					calls.suggest += 1;
				},
				onPaste: () => false,
				onToggleTask: () => true,
				onToggleTaskMarker: () => true,
				onArrowNavigate: () => true,
				onUndo: () => true,
				onRedo: () => true,
				onEnter: () => true,
				onSoftEnter: () => true,
				onEscape: () => true,
				onTab: () => true,
				onBackspace: () => true,
				onDelete: () => true,
			}
		);

		const parent = document.createElement("div");
		const view = new EditorView({ state, parent });

		view.dispatch({ changes: { from: 0, to: 0, insert: "x" } });
		expect(calls.doc).toBe(1);
		expect(calls.suggest).toBe(1);

		view.destroy();
	});

	test("keydown Mod+Shift+V marks plain-text paste bypass", () => {
		const calls = { bypass: 0, reset: 0 };

		const state = createOutlinerEditorState(
			"x",
			{ cursorStart: 0, cursorEnd: 0 },
			{
				isSyncSuppressed: () => false,
				isArrowNavDispatching: () => false,
				shouldPreserveArrowNavGoalOnce: () => false,
				onResetArrowNavGoalColumn: () => {
					calls.reset += 1;
				},
				onPlainTextPasteShortcut: () => {
					calls.bypass += 1;
				},
				onDocChanged: () => undefined,
				onMaybeTriggerSuggest: () => undefined,
				onPaste: () => false,
				onToggleTask: () => true,
				onToggleTaskMarker: () => true,
				onArrowNavigate: () => true,
				onUndo: () => true,
				onRedo: () => true,
				onEnter: () => true,
				onSoftEnter: () => true,
				onEscape: () => true,
				onTab: () => true,
				onBackspace: () => true,
				onDelete: () => true,
			}
		);

		const parent = document.createElement("div");
		const view = new EditorView({ state, parent });

		view.contentDOM.dispatchEvent(
			new KeyboardEvent("keydown", { key: "v", ctrlKey: true, shiftKey: true, bubbles: true })
		);

		expect(calls.bypass).toBe(1);
		expect(calls.reset).toBe(1);

		view.destroy();
	});

	test("keydown Mod+Z routes to host onUndo", () => {
		const calls = { undo: 0 };

		const state = createOutlinerEditorState(
			"x",
			{ cursorStart: 0, cursorEnd: 0 },
			{
				isSyncSuppressed: () => false,
				isArrowNavDispatching: () => false,
				shouldPreserveArrowNavGoalOnce: () => false,
				onResetArrowNavGoalColumn: () => undefined,
				onPlainTextPasteShortcut: () => undefined,
				onDocChanged: () => undefined,
				onMaybeTriggerSuggest: () => undefined,
				onPaste: () => false,
				onToggleTask: () => true,
				onToggleTaskMarker: () => true,
				onArrowNavigate: () => true,
				onUndo: () => {
					calls.undo += 1;
					return true;
				},
				onRedo: () => true,
				onEnter: () => true,
				onSoftEnter: () => true,
				onEscape: () => true,
				onTab: () => true,
				onBackspace: () => true,
				onDelete: () => true,
			}
		);

		const parent = document.createElement("div");
		const view = new EditorView({ state, parent });

		view.contentDOM.dispatchEvent(new KeyboardEvent("keydown", { key: "z", ctrlKey: true, bubbles: true, cancelable: true }));
		expect(calls.undo).toBe(1);

		view.destroy();
	});

	test("keydown Mod+Y routes to host onRedo", () => {
		const calls = { redo: 0 };

		const state = createOutlinerEditorState(
			"x",
			{ cursorStart: 0, cursorEnd: 0 },
			{
				isSyncSuppressed: () => false,
				isArrowNavDispatching: () => false,
				shouldPreserveArrowNavGoalOnce: () => false,
				onResetArrowNavGoalColumn: () => undefined,
				onPlainTextPasteShortcut: () => undefined,
				onDocChanged: () => undefined,
				onMaybeTriggerSuggest: () => undefined,
				onPaste: () => false,
				onToggleTask: () => true,
				onToggleTaskMarker: () => true,
				onArrowNavigate: () => true,
				onUndo: () => true,
				onRedo: () => {
					calls.redo += 1;
					return true;
				},
				onEnter: () => true,
				onSoftEnter: () => true,
				onEscape: () => true,
				onTab: () => true,
				onBackspace: () => true,
				onDelete: () => true,
			}
		);

		const parent = document.createElement("div");
		const view = new EditorView({ state, parent });

		view.contentDOM.dispatchEvent(new KeyboardEvent("keydown", { key: "y", ctrlKey: true, bubbles: true, cancelable: true }));
		expect(calls.redo).toBe(1);

		view.destroy();
	});

	test("keydown Escape routes to host onEscape", () => {
		const calls = { escape: 0 };

		const state = createOutlinerEditorState(
			"x",
			{ cursorStart: 0, cursorEnd: 0 },
			{
				isSyncSuppressed: () => false,
				isArrowNavDispatching: () => false,
				shouldPreserveArrowNavGoalOnce: () => false,
				onResetArrowNavGoalColumn: () => undefined,
				onPlainTextPasteShortcut: () => undefined,
				onDocChanged: () => undefined,
				onMaybeTriggerSuggest: () => undefined,
				onPaste: () => false,
				onToggleTask: () => true,
				onToggleTaskMarker: () => true,
				onArrowNavigate: () => true,
				onUndo: () => true,
				onRedo: () => true,
				onEnter: () => true,
				onSoftEnter: () => true,
				onEscape: () => {
					calls.escape += 1;
					return true;
				},
				onTab: () => true,
				onBackspace: () => true,
				onDelete: () => true,
			}
		);

		const parent = document.createElement("div");
		const view = new EditorView({ state, parent });

		view.contentDOM.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true, cancelable: true }));
		expect(calls.escape).toBe(1);

		view.destroy();
	});
});
