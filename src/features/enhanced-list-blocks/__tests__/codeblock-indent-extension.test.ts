import { EditorSelection, EditorState } from "@codemirror/state";
import { EditorView } from "@codemirror/view";
import { App, editorInfoField, editorLivePreviewField } from "obsidian";
import { createEnhancedListActiveBlockHighlightExtension } from "../active-block-highlight-extension";
import { createEnhancedListCodeBlockIndentExtension } from "../codeblock-indent-extension";

function createView(docText: string) {
	const app = new App();
	const file = (app.vault as any)._addFile("test.md", docText);

	const plugin = {
		app,
		settings: {
			enhancedListEnabledFolders: [],
			enhancedListEnabledFiles: [file.path],
			enhancedListIndentCodeBlocks: true,
		},
	} as any;

	const parent = document.createElement("div");
	document.body.appendChild(parent);

	const indentExt = createEnhancedListCodeBlockIndentExtension(plugin);
	const activeExt = createEnhancedListActiveBlockHighlightExtension(plugin);
	const state = EditorState.create({
		doc: docText,
		extensions: [
			editorInfoField.init(() => ({ app, file, hoverPopover: null } as any)),
			editorLivePreviewField.init(() => true),
			indentExt,
			activeExt,
		],
	});

	const view = new EditorView({ state, parent });
	return { view, parent, plugin };
}

function parsePx(value: string | null | undefined): number | null {
	if (!value) return null;
	const n = parseFloat(value);
	return Number.isFinite(n) ? n : null;
}

describe("enhanced-list-blocks/codeblock-indent-extension", () => {
	test("aligns nested fenced code blocks to list indentation", () => {
		const doc = ["- parent", "  line2", "  ```bash", "  ls -alth", "  ```", "- sibling"].join("\n");
		const { view, parent } = createView(doc);

		try {
			// Simulate Obsidian's list indentation styling (not present in plain CM6 tests).
			// Apply it to a list continuation line (not the whole editor), since fenced code
			// block lines often don't get the same padding in Live Preview.
			const line2 = Array.from(view.dom.querySelectorAll(".cm-line")).find((el) =>
				(el as HTMLElement).textContent?.includes("line2"),
			) as HTMLElement | undefined;
			expect(line2).toBeDefined();
			(line2 as HTMLElement).style.paddingLeft = "40px";

			// Put cursor inside the code block so the active-block class is present too.
			view.dispatch({ selection: EditorSelection.cursor(view.state.doc.line(4).from + 4) });

			const codeLine = Array.from(view.dom.querySelectorAll(".cm-line")).find((el) =>
				(el as HTMLElement).textContent?.includes("ls -alth"),
			) as HTMLElement | undefined;
			expect(codeLine).toBeDefined();

			expect(codeLine?.classList.contains("blp-enhanced-list-codeblock-indented")).toBe(true);
			expect(codeLine?.classList.contains("blp-enhanced-list-active-block")).toBe(true);

			const actualIndentPx =
				parsePx((codeLine as any).style?.marginLeft) ??
				parsePx(getComputedStyle(codeLine as HTMLElement).marginLeft);
			expect(actualIndentPx).not.toBeNull();
			expect((actualIndentPx as number) >= 0).toBe(true);

			// Expect the code line's content start (margin-left + padding-left) to match
			// the list continuation line's padding-left (40px).
			const codePadPx = parsePx(getComputedStyle(codeLine as HTMLElement).paddingLeft) ?? 0;
			expect(Math.abs((actualIndentPx as number) + codePadPx - 40)).toBeLessThan(2);
		} finally {
			view.destroy();
			parent.remove();
		}
	});

	test("does not fall back to bullet-line padding when list indentation is missing", () => {
		const doc = ["- parent", "  line2", "  ```bash", "  ls -alth", "  ```", "- sibling"].join("\n");

		// Simulate a transient Live Preview state where only the bullet line has list padding,
		// while continuation lines haven't been styled yet. In that case, the extension should
		// NOT use the bullet line's padding for indented code blocks (it would jump left).
		const origGetComputedStyle = window.getComputedStyle.bind(window);
		const spy = jest.spyOn(window, "getComputedStyle").mockImplementation((elt: any, pseudoElt?: any) => {
			const cs: any = origGetComputedStyle(elt, pseudoElt);
			if (pseudoElt) return cs;

			try {
				if (elt?.classList?.contains?.("cm-line")) {
					const text = (elt as HTMLElement).textContent ?? "";
					const pad = text.includes("- parent") ? "1px" : "0px";
					return new Proxy(cs, {
						get(target, prop) {
							if (prop === "paddingLeft" || prop === "paddingInlineStart") return pad;
							if (prop === "paddingRight") return "0px";
							if (prop === "direction") return "ltr";

							const value = (target as any)[prop as any];
							return typeof value === "function" ? value.bind(target) : value;
						},
					});
				}
			} catch {
				// ignore
			}

			return cs;
		});

		const { view, parent } = createView(doc);
		try {
			// Put cursor inside the code block so the active-block class is present too.
			view.dispatch({ selection: EditorSelection.cursor(view.state.doc.line(4).from + 4) });

			const codeLine = Array.from(view.dom.querySelectorAll(".cm-line")).find((el) =>
				(el as HTMLElement).textContent?.includes("ls -alth"),
			) as HTMLElement | undefined;
			expect(codeLine).toBeDefined();
			expect(codeLine?.classList.contains("blp-enhanced-list-codeblock-indented")).toBe(true);

			const actualIndentPx =
				parsePx((codeLine as any).style?.marginLeft) ??
				parsePx(getComputedStyle(codeLine as HTMLElement).marginLeft);
			expect(actualIndentPx).not.toBeNull();

			// If we (incorrectly) used the bullet line's padding (1px), the code indent would
			// be near 0/1. Ensure we use a reasonable whitespace-based fallback instead.
			expect((actualIndentPx as number) > 5).toBe(true);
		} finally {
			view.destroy();
			parent.remove();
			spy.mockRestore();
		}
	});
});
