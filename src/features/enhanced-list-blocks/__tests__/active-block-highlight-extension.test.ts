import { EditorSelection, EditorState } from "@codemirror/state";
import { EditorView } from "@codemirror/view";
import { App, editorInfoField, editorLivePreviewField } from "obsidian";
import { createEnhancedListActiveBlockHighlightExtension } from "../active-block-highlight-extension";

function createView(docText: string) {
	const app = new App();
	const file = (app.vault as any)._addFile("test.md", docText);

	const plugin = {
		app,
		settings: {
			enhancedListEnabledFolders: [],
			enhancedListEnabledFiles: [file.path],
		},
	} as any;

	const parent = document.createElement("div");
	document.body.appendChild(parent);

	const ext = createEnhancedListActiveBlockHighlightExtension(plugin);
	const state = EditorState.create({
		doc: docText,
		extensions: [
			editorInfoField.init(() => ({ app, file, hoverPopover: null } as any)),
			editorLivePreviewField.init(() => true),
			ext,
		],
	});

	const view = new EditorView({ state, parent });
	return { view, parent };
}

describe("enhanced-list-blocks/active-block-highlight-extension", () => {
	test("marks bullet + full block when cursor is inside a fenced code block", () => {
		const doc = [
			"- parent",
			"  line2",
			"  ```bash",
			"  - not a list",
			"  ls -alth",
			"  ```",
			"- sibling",
		].join("\n");

		const { view, parent } = createView(doc);
		try {
			const pos = view.state.doc.line(5).from + 4;
			view.dispatch({ selection: EditorSelection.cursor(pos) });

			const bullet = view.dom.querySelector(
				".cm-line.blp-enhanced-list-active-bullet",
			) as HTMLElement | null;
			expect(bullet).not.toBeNull();
			expect(bullet?.textContent ?? "").toContain("- parent");

			const codeLine = Array.from(view.dom.querySelectorAll(".cm-line")).find((el) =>
				(el as HTMLElement).textContent?.includes("ls -alth"),
			) as HTMLElement | undefined;
			expect(codeLine).toBeDefined();
			expect(codeLine?.classList.contains("blp-enhanced-list-active-block")).toBe(true);

			const dashInCodeLine = Array.from(view.dom.querySelectorAll(".cm-line")).find((el) =>
				(el as HTMLElement).textContent?.includes("- not a list"),
			) as HTMLElement | undefined;
			expect(dashInCodeLine).toBeDefined();
			expect(dashInCodeLine?.classList.contains("blp-enhanced-list-active-block")).toBe(true);

			const sibling = Array.from(view.dom.querySelectorAll(".cm-line")).find((el) =>
				(el as HTMLElement).textContent?.includes("- sibling"),
			) as HTMLElement | undefined;
			expect(sibling).toBeDefined();
			expect(sibling?.classList.contains("blp-enhanced-list-active-block")).toBe(false);
			expect(sibling?.classList.contains("blp-enhanced-list-active-bullet")).toBe(false);
		} finally {
			view.destroy();
			parent.remove();
		}
	});

	test("moves marker when cursor moves to another list item", () => {
		const doc = ["- a", "  ```", "  b", "  ```", "- c"].join("\n");
		const { view, parent } = createView(doc);

		try {
			view.dispatch({ selection: EditorSelection.cursor(view.state.doc.line(3).from + 3) });
			expect(
				(view.dom.querySelector(".cm-line.blp-enhanced-list-active-bullet") as HTMLElement | null)
					?.textContent ?? "",
			).toContain("- a");

			view.dispatch({ selection: EditorSelection.cursor(view.state.doc.line(5).from + 3) });
			expect(
				(view.dom.querySelector(".cm-line.blp-enhanced-list-active-bullet") as HTMLElement | null)
					?.textContent ?? "",
			).toContain("- c");
		} finally {
			view.destroy();
			parent.remove();
		}
	});

	test("sets active-block left offset to the list content column", () => {
		const doc = ["- a", "  continuation", "- b"].join("\n");
		const { view, parent } = createView(doc);

		try {
			// Put the caret on the continuation line so we highlight the whole multi-line block.
			const pos = view.state.doc.line(2).from + 4;
			view.dispatch({ selection: EditorSelection.cursor(pos) });

			const raw = view.dom.style.getPropertyValue("--blp-enhanced-list-active-block-left");
			expect(raw).not.toBe("");
			expect(Number.parseFloat(raw)).toBeGreaterThan(0);
		} finally {
			view.destroy();
			parent.remove();
		}
	});
});
