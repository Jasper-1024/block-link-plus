import { EditorState } from "@codemirror/state";
import { EditorView } from "@codemirror/view";
import { App, editorInfoField, editorLivePreviewField } from "obsidian";
import { createEnhancedListBlockSelectionExtension } from "../block-selection-extension";
import { createEnhancedListHandleActionsExtension } from "../handle-actions-extension";

function createView(docText: string) {
	const app = new App();
	const file = (app.vault as any)._addFile("test.md", docText);

	const plugin = {
		app,
		settings: {
			enhancedListEnabledFolders: [],
			enhancedListEnabledFiles: [file.path],
			enhancedListHandleActions: true,
			enhancedListHandleClickAction: "select-block",
		},
	} as any;

	const parent = document.createElement("div");
	document.body.appendChild(parent);

	const selectionExt = createEnhancedListBlockSelectionExtension(plugin);
	const handleExt = createEnhancedListHandleActionsExtension(plugin, {
		infoField: editorInfoField,
		livePreviewField: editorLivePreviewField,
		resolveHandleLine: (_view, event) => {
			const target = event.target as HTMLElement | null;
			const handle = target?.closest?.(".cm-formatting-list-ul") as HTMLElement | null;
			if (!handle) return null;
			const raw = handle.dataset.line ?? "";
			const n = Number.parseInt(raw, 10);
			return Number.isFinite(n) ? n : null;
		},
	});

	const state = EditorState.create({
		doc: docText,
		extensions: [
			editorInfoField.init(() => ({ app, file, editor: { setCursor: jest.fn() } } as any)),
			editorLivePreviewField.init(() => true),
			selectionExt,
			handleExt,
		],
	});

	const view = new EditorView({ state, parent });

	return { view, parent };
}

function findLineEl(view: EditorView, contains: string): HTMLElement | null {
	return (
		Array.from(view.dom.querySelectorAll(".cm-line")).find((el) =>
			(el as HTMLElement).textContent?.includes(contains),
		) as HTMLElement | undefined
	) ?? null;
}

describe("enhanced-list-blocks/block-selection-extension", () => {
	test("clicking a handle selects a block and shift-click selects a contiguous range", () => {
		const doc = ["- a", "- b", "- c"].join("\n");
		const { view, parent } = createView(doc);

		try {
			const h0 = document.createElement("span");
			h0.className = "cm-formatting-list-ul";
			h0.dataset.line = "0";
			view.contentDOM.appendChild(h0);

			const h2 = document.createElement("span");
			h2.className = "cm-formatting-list-ul";
			h2.dataset.line = "2";
			view.contentDOM.appendChild(h2);

			h0.dispatchEvent(new MouseEvent("click", { bubbles: true, cancelable: true }));
			expect(findLineEl(view, "- a")?.classList.contains("blp-enhanced-list-block-selected")).toBe(true);
			expect(findLineEl(view, "- b")?.classList.contains("blp-enhanced-list-block-selected")).toBe(false);
			expect(findLineEl(view, "- c")?.classList.contains("blp-enhanced-list-block-selected")).toBe(false);

			h2.dispatchEvent(new MouseEvent("click", { bubbles: true, cancelable: true, shiftKey: true }));
			expect(findLineEl(view, "- a")?.classList.contains("blp-enhanced-list-block-selected")).toBe(true);
			expect(findLineEl(view, "- b")?.classList.contains("blp-enhanced-list-block-selected")).toBe(true);
			expect(findLineEl(view, "- c")?.classList.contains("blp-enhanced-list-block-selected")).toBe(true);
		} finally {
			view.destroy();
			parent.remove();
		}
	});

	test("maps selected blocks across doc changes", () => {
		const doc = ["- a", "- b", "- c"].join("\n");
		const { view, parent } = createView(doc);

		try {
			const h1 = document.createElement("span");
			h1.className = "cm-formatting-list-ul";
			h1.dataset.line = "1";
			view.contentDOM.appendChild(h1);

			h1.dispatchEvent(new MouseEvent("click", { bubbles: true, cancelable: true }));
			expect(findLineEl(view, "- b")?.classList.contains("blp-enhanced-list-block-selected")).toBe(true);

			// Insert a new list item at the start of the document.
			view.dispatch({ changes: { from: 0, to: 0, insert: "- x\n" } });
			expect(findLineEl(view, "- b")?.classList.contains("blp-enhanced-list-block-selected")).toBe(true);
		} finally {
			view.destroy();
			parent.remove();
		}
	});

	test("Escape clears block selection", () => {
		const doc = ["- a", "- b"].join("\n");
		const { view, parent } = createView(doc);

		try {
			const h0 = document.createElement("span");
			h0.className = "cm-formatting-list-ul";
			h0.dataset.line = "0";
			view.contentDOM.appendChild(h0);

			h0.dispatchEvent(new MouseEvent("click", { bubbles: true, cancelable: true }));
			expect(findLineEl(view, "- a")?.classList.contains("blp-enhanced-list-block-selected")).toBe(true);

			view.contentDOM.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true }));
			expect(findLineEl(view, "- a")?.classList.contains("blp-enhanced-list-block-selected")).toBe(false);
		} finally {
			view.destroy();
			parent.remove();
		}
	});
});

