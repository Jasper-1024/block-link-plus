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
				onEnter: () => true,
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
				onEnter: () => true,
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
});
