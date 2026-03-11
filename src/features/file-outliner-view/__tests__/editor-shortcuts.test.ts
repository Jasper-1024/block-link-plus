import { isPlainTextPasteShortcut, isRedoShortcut, isUndoShortcut } from "../editor-shortcuts";

describe("file-outliner-view/editor-shortcuts", () => {
	test("detects Mod+Shift+V as plain text paste shortcut", () => {
		const evt = new KeyboardEvent("keydown", { key: "v", ctrlKey: true, shiftKey: true });
		expect(isPlainTextPasteShortcut(evt)).toBe(true);
	});

	test("does not treat Mod+V as plain text paste shortcut", () => {
		const evt = new KeyboardEvent("keydown", { key: "v", ctrlKey: true });
		expect(isPlainTextPasteShortcut(evt)).toBe(false);
	});

	test("ignores Alt-modified variants", () => {
		const evt = new KeyboardEvent("keydown", { key: "v", ctrlKey: true, shiftKey: true, altKey: true });
		expect(isPlainTextPasteShortcut(evt)).toBe(false);
	});

	test("detects Command+Shift+V (mac) as plain text paste shortcut", () => {
		const evt = new KeyboardEvent("keydown", { key: "V", metaKey: true, shiftKey: true });
		expect(isPlainTextPasteShortcut(evt)).toBe(true);
	});

	test("detects Mod+Z as undo shortcut", () => {
		const evt = new KeyboardEvent("keydown", { key: "z", ctrlKey: true });
		expect(isUndoShortcut(evt)).toBe(true);
		expect(isRedoShortcut(evt)).toBe(false);
	});

	test("detects Mod+Y as redo shortcut", () => {
		const evt = new KeyboardEvent("keydown", { key: "y", ctrlKey: true });
		expect(isRedoShortcut(evt)).toBe(true);
	});

	test("detects Mod+Shift+Z as redo shortcut", () => {
		const evt = new KeyboardEvent("keydown", { key: "z", ctrlKey: true, shiftKey: true });
		expect(isRedoShortcut(evt)).toBe(true);
		expect(isUndoShortcut(evt)).toBe(false);
	});
});
