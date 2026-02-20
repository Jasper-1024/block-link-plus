import { EditorState } from "@codemirror/state";
import { EditorView } from "@codemirror/view";

import { createViewPlugin } from "../ViewPlugin";
import { BLP_BLOCK_MARKER, BLP_BLOCK_MARKER_CLASS } from "shared/block-marker";

describe("ui/ViewPlugin: block marker styling", () => {
	test("decorates marker ids (including '-') with the BLP class", () => {
		const parent = document.createElement("div");
		document.body.appendChild(parent);

		const doc = [`## ${BLP_BLOCK_MARKER}pre-abc123`, "next"].join("\n");

		const view = new EditorView({
			parent,
			state: EditorState.create({
				doc,
				extensions: [createViewPlugin()],
			}),
		});

		try {
			const markerEl = view.dom.querySelector(`.${BLP_BLOCK_MARKER_CLASS}`);
			expect(markerEl).toBeTruthy();
			expect(markerEl?.textContent).toContain(`${BLP_BLOCK_MARKER}pre-abc123`);
			expect(markerEl?.classList.contains("cm-blockid")).toBe(true);
		} finally {
			view.destroy();
			parent.remove();
		}
	});
});
