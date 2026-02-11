import { EditorState } from "@codemirror/state";
import { EditorView } from "@codemirror/view";

import { contentRange, editableRange, editBlockExtensions } from "../selectiveEditor";

describe("selectiveEditor: hide outliner v2 system tail lines", () => {
	test("hides lines containing [blp_sys:: 1] inside visible range", () => {
		const parent = document.createElement("div");
		document.body.appendChild(parent);

		const doc = [
			"- child",
			"  [date:: 2026-02-06T00:00:00] [updated:: 2026-02-06T00:00:00] [blp_sys:: 1] [blp_ver:: 2] ^child",
			"- other",
			"",
		].join("\n");

		const view = new EditorView({
			parent,
			state: EditorState.create({
				doc,
				extensions: editBlockExtensions(),
			}),
		});

		try {
			view.dispatch({
				annotations: [contentRange.of([1, view.state.doc.lines]), editableRange.of([1, view.state.doc.lines])],
			});

			const text = view.dom.textContent ?? "";
			expect(text).toContain("child");
			expect(text).toContain("other");
			expect(text).not.toContain("blp_sys");
			expect(text).not.toContain("blp_ver");
			expect(text).not.toContain("date::");
			expect(text).not.toContain("^child");
		} finally {
			view.destroy();
			parent.remove();
		}
	});

	test("does not throw when visible range is a subset and includes a system tail line", () => {
		const parent = document.createElement("div");
		document.body.appendChild(parent);

		const doc = [
			"before",
			"- child",
			"  [date:: 2026-02-06T00:00:00] [updated:: 2026-02-06T00:00:00] [blp_sys:: 1] [blp_ver:: 2] ^child",
			"after",
			"tail",
			"",
		].join("\n");

		const view = new EditorView({
			parent,
			state: EditorState.create({
				doc,
				extensions: editBlockExtensions(),
			}),
		});

		try {
			// If the decoration builder adds ranges out-of-order, CM6 will throw.
			view.dispatch({
				annotations: [contentRange.of([2, 4]), editableRange.of([2, 4])],
			});

			const text = view.dom.textContent ?? "";
			expect(text).toContain("child");
			expect(text).toContain("after");
			expect(text).not.toContain("before");
			expect(text).not.toContain("tail");
			expect(text).not.toContain("blp_sys");
			expect(text).not.toContain("blp_ver");
			expect(text).not.toContain("date::");
			expect(text).not.toContain("^child");
		} finally {
			view.destroy();
			parent.remove();
		}
	});
});
