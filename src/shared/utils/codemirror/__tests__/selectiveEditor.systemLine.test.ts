import { history, redo, undo } from "@codemirror/commands";
import { EditorState } from "@codemirror/state";
import { EditorView } from "@codemirror/view";

import {
	contentRange,
	editableRange,
	editBlockExtensions,
	frontmatterFacet,
	selectiveLinesFacet,
} from "../selectiveEditor";

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

	test("keeps full-document ranges in sync when adding new lines", () => {
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

			view.dispatch({
				changes: { from: view.state.doc.length, insert: "new line\n" },
			});

			const text = view.dom.textContent ?? "";
			expect(text).toContain("child");
			expect(text).toContain("other");
			expect(text).toContain("new line");
			expect(text).not.toContain("blp_sys");
			expect(text).not.toContain("^child");
		} finally {
			view.destroy();
			parent.remove();
		}
	});

	test("restores inline-edit visible range after Enter undo and redo", () => {
		const parent = document.createElement("div");
		document.body.appendChild(parent);

		const leakedParagraph = "Paragraph block for regular embed ^para1";
		const doc = [
			"host lead",
			"intro one",
			"intro two",
			"",
			"- Alpha parent block ^alpha1",
			"  - Alpha child one",
			"  - Alpha child two",
			"  Alpha continuation",
			"",
			leakedParagraph,
			"",
		].join("\n");

		const view = new EditorView({
			parent,
			state: EditorState.create({
				doc,
				extensions: [history(), editBlockExtensions()],
			}),
		});

		try {
			const initialLineCount = view.state.doc.lines;

			view.dispatch({
				annotations: [contentRange.of([5, 9]), editableRange.of([5, 9])],
			});

			const insertAt = view.state.doc.line(7).to;
			view.dispatch({
				changes: { from: insertAt, insert: "\n  - inserted child" },
				userEvent: "input",
			});

			expect(view.state.doc.lines).toBe(initialLineCount + 1);
			expect(view.state.field(frontmatterFacet)).toEqual([5, 10]);
			expect(view.state.field(selectiveLinesFacet)).toEqual([5, 10]);
			expect(view.dom.textContent ?? "").toContain("inserted child");
			expect(view.dom.textContent ?? "").not.toContain(leakedParagraph);

			const didUndo = undo({
				state: view.state,
				dispatch: (tr) => view.dispatch(tr),
			});

			expect(didUndo).toBe(true);
			expect(view.state.doc.lines).toBe(initialLineCount);
			expect(view.state.field(frontmatterFacet)).toEqual([5, 9]);
			expect(view.state.field(selectiveLinesFacet)).toEqual([5, 9]);
			expect(view.dom.textContent ?? "").not.toContain("inserted child");
			expect(view.dom.textContent ?? "").not.toContain(leakedParagraph);

			const didRedo = redo({
				state: view.state,
				dispatch: (tr) => view.dispatch(tr),
			});

			expect(didRedo).toBe(true);
			expect(view.state.doc.lines).toBe(initialLineCount + 1);
			expect(view.state.field(frontmatterFacet)).toEqual([5, 10]);
			expect(view.state.field(selectiveLinesFacet)).toEqual([5, 10]);
			expect(view.dom.textContent ?? "").toContain("inserted child");
			expect(view.dom.textContent ?? "").not.toContain(leakedParagraph);
		} finally {
			view.destroy();
			parent.remove();
		}
	});
});
