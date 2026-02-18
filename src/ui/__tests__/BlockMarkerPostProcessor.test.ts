import { blockMarkerMarkdownPostProcessor } from "../BlockMarkerPostProcessor";
import { BLP_BLOCK_MARKER } from "shared/block-marker";

describe("ui/BlockMarkerPostProcessor", () => {
	test("strips marker-only headings in reading mode", () => {
		const root = document.createElement("div");
		root.innerHTML = [
			`<h2>${BLP_BLOCK_MARKER}pre-abc123</h2>`,
			`<p>keep ${BLP_BLOCK_MARKER}pre-abc123</p>`,
			`<h2>Title ${BLP_BLOCK_MARKER}pre-abc123</h2>`,
		].join("\n");

		blockMarkerMarkdownPostProcessor(root);

		const headings = Array.from(root.querySelectorAll("h2"));
		expect(headings).toHaveLength(2);
		expect(headings[0]?.textContent ?? null).toBe("");
		expect(headings[1]?.textContent ?? null).toBe(`Title ${BLP_BLOCK_MARKER}pre-abc123`);

		expect(root.querySelector("p")?.textContent).toBe(`keep ${BLP_BLOCK_MARKER}pre-abc123`);
	});

	test("skips outliner view internal renders", () => {
		const root = document.createElement("div");
		root.className = "blp-file-outliner-view";
		root.innerHTML = `<h2>${BLP_BLOCK_MARKER}abc123</h2>`;

		blockMarkerMarkdownPostProcessor(root);
		expect(root.querySelector("h2")?.textContent).toBe(`${BLP_BLOCK_MARKER}abc123`);
	});
});
