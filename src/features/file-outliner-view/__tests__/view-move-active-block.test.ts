import { FileOutlinerView } from "../view";

function block(id: string, depth: number, text: string, children: any[] = []) {
	return { id, depth, text, children, system: { date: "d", updated: "u", extra: {} } };
}

describe("file-outliner-view active block movement", () => {
	test("reads the live selection/mode and applies one structural result", () => {
		const selection = { id: "b", start: 2, end: 2 };
		const fake = {
			outlinerFile: {
				frontmatter: null,
				blocks: [block("a", 0, "a"), block("b", 0, "b"), block("c", 0, "c")],
			},
			plugin: { settings: { fileOutlinerMoveMode: "cross-level-align" } },
			isActiveBlockEditorFocused: jest.fn(() => true),
			getActiveSelection: jest.fn(() => selection),
			getZoomRootId: jest.fn(() => null),
			collapsedIds: new Set(["collapsed"]),
			applyStructuralEngineResult: jest.fn((result: any, before: any, opts: any) => {
				expect(result.didChange).toBe(true);
				expect(result.selection).toEqual(selection);
				expect(before).toEqual(selection);
				expect(opts).toEqual({ preserveViewport: true });
				return true;
			}),
		} as any;

		const handled = (FileOutlinerView.prototype as any).moveActiveBlock.call(fake, "up");

		expect(handled).toBe(true);
		expect(fake.getActiveSelection).toHaveBeenCalledTimes(1);
		expect(fake.applyStructuralEngineResult).toHaveBeenCalledTimes(1);
	});

	test("does not apply history for a handled boundary no-op", () => {
		const fake = {
			outlinerFile: { frontmatter: null, blocks: [block("a", 0, "a"), block("b", 0, "b")] },
			plugin: { settings: { fileOutlinerMoveMode: "same-level" } },
			isActiveBlockEditorFocused: jest.fn(() => true),
			getActiveSelection: jest.fn(() => ({ id: "a", start: 0, end: 0 })),
			getZoomRootId: jest.fn(() => null),
			collapsedIds: new Set(),
			applyStructuralEngineResult: jest.fn(() => false),
		} as any;

		const handled = (FileOutlinerView.prototype as any).moveActiveBlock.call(fake, "up");

		expect(handled).toBe(false);
		expect(fake.applyStructuralEngineResult).not.toHaveBeenCalled();
	});
});
