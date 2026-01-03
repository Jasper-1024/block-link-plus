import { MockEditor } from "../../../test-utils/MockEditor";

jest.mock("../../../utils", () => {
	const actual = jest.requireActual("../../../utils");
	return {
		...actual,
		generateRandomId: jest.fn(),
	};
});

import { generateRandomId } from "../../../utils";
import {
	gen_insert_blocklink_multiline_block,
	gen_insert_blocklink_multline_block,
	gen_insert_blocklink_singleline,
} from "../index";

const mockGenerateRandomId = generateRandomId as unknown as jest.MockedFunction<
	typeof generateRandomId
>;

const baseSettings = {
	enable_prefix: false,
	id_prefix: "",
	id_length: 6,
	heading_id_newline: false,
} as any;

function section(type: string, startLine: number, endLine: number, endCol: number, id?: string) {
	return {
		type,
		id,
		position: {
			start: { line: startLine, col: 0, offset: 0 },
			end: { line: endLine, col: endCol, offset: 0 },
		},
	} as any;
}

function listItem(startLine: number, endLine: number, id?: string) {
	return {
		id,
		parent: -1,
		position: {
			start: { line: startLine, col: 0, offset: 0 },
			end: { line: endLine, col: 0, offset: 0 },
		},
	} as any;
}

describe("link-creation", () => {
	beforeEach(() => {
		mockGenerateRandomId.mockReset();
	});

	describe("#27 list item targeting", () => {
		test("does not reuse the first list item's id when cursor is on a later item", () => {
			const editor = new MockEditor(["- first ^aaa111", "- second"].join("\n"));
			editor.setCursor({ line: 1, ch: 0 });

			const listSection = section("list", 0, 1, editor.getLine(1).length);
			mockGenerateRandomId.mockReturnValueOnce("bbb222");

			const id = gen_insert_blocklink_singleline(listSection, editor as any, baseSettings);

			expect(id).toBe("^bbb222");
			expect(editor.getLine(0)).toBe("- first ^aaa111");
			expect(editor.getLine(1)).toBe("- second ^bbb222");
		});

		test("reuses the active list item's id when it already exists", () => {
			const editor = new MockEditor(["- first ^aaa111", "- second ^ccc333"].join("\n"));
			editor.setCursor({ line: 1, ch: 0 });

			const listSection = section("list", 0, 1, editor.getLine(1).length);
			const id = gen_insert_blocklink_singleline(listSection, editor as any, baseSettings);

			expect(id).toBe("^ccc333");
			expect(editor.getLine(1)).toBe("- second ^ccc333");
		});
	});

	describe("#22 multi-block mode (per-block, partial overlap)", () => {
		test("reuses an existing paragraph block id without inserting a new one", () => {
			const editor = new MockEditor(["p1", "p2", "p3 ^old123"].join("\n"));
			editor.setSelection({ line: 1, ch: 0 }, { line: 2, ch: 2 });

			const fileCache = {
				sections: [section("paragraph", 0, 2, editor.getLine(2).length, "old123")],
				listItems: [],
			} as any;

			const links = gen_insert_blocklink_multline_block(fileCache, editor as any, baseSettings);

			expect(links).toEqual(["^old123"]);
			expect(mockGenerateRandomId).not.toHaveBeenCalled();
			expect(editor.getLines()).toEqual(["p1", "p2", "p3 ^old123"]);
		});

		test("includes a partially selected paragraph block and inserts a single id at the block end", () => {
			const editor = new MockEditor(["p1", "p2", "p3"].join("\n"));
			editor.setSelection({ line: 1, ch: 0 }, { line: 2, ch: 2 });

			const fileCache = {
				sections: [section("paragraph", 0, 2, editor.getLine(2).length)],
				listItems: [],
			} as any;

			mockGenerateRandomId.mockReturnValueOnce("paraaa");
			const links = gen_insert_blocklink_multline_block(fileCache, editor as any, baseSettings);

			expect(links).toEqual(["^paraaa"]);
			expect(editor.getLine(0)).toBe("p1");
			expect(editor.getLine(1)).toBe("p2");
			expect(editor.getLine(2)).toBe("p3 ^paraaa");
		});

		test("selection spanning multiple paragraphs inserts one id per paragraph block", () => {
			const editor = new MockEditor(["p1a", "p1b", "", "p2a", "p2b"].join("\n"));
			editor.setSelection({ line: 1, ch: 0 }, { line: 3, ch: 2 });

			const fileCache = {
				sections: [
					section("paragraph", 0, 1, editor.getLine(1).length),
					section("paragraph", 3, 4, editor.getLine(4).length),
				],
				listItems: [],
			} as any;

			mockGenerateRandomId.mockReturnValueOnce("a11111").mockReturnValueOnce("b22222");
			const links = gen_insert_blocklink_multline_block(fileCache, editor as any, baseSettings);

			expect(links).toEqual(["^a11111", "^b22222"]);
			expect(editor.getLine(1)).toBe("p1b ^a11111");
			expect(editor.getLine(4)).toBe("p2b ^b22222");
		});

		test("selection spanning a wrapped list item and another item inserts one id per list item", () => {
			const editor = new MockEditor(["- item1", "  cont", "- item2"].join("\n"));
			editor.setSelection({ line: 1, ch: 0 }, { line: 2, ch: 2 });

			const fileCache = {
				sections: [section("list", 0, 2, editor.getLine(2).length)],
				listItems: [listItem(0, 1), listItem(2, 2)],
			} as any;

			mockGenerateRandomId.mockReturnValueOnce("l11111").mockReturnValueOnce("l22222");
			const links = gen_insert_blocklink_multline_block(fileCache, editor as any, baseSettings);

			expect(links).toEqual(["^l11111", "^l22222"]);
			expect(editor.getLine(0)).toBe("- item1 ^l11111");
			expect(editor.getLine(1)).toBe("  cont");
			expect(editor.getLine(2)).toBe("- item2 ^l22222");
		});
	});

	describe("#28 multiline range end marker placement", () => {
		test("inserts end marker as a standalone line before existing next-line content", () => {
			const editor = new MockEditor(["line 1", "line 2", "next"].join("\n"));
			editor.setSelection({ line: 0, ch: 0 }, { line: 1, ch: 6 });

			mockGenerateRandomId.mockReturnValueOnce("abc123");
			const link = gen_insert_blocklink_multiline_block(editor as any, baseSettings);

			expect(link).toBe("^abc123-abc123");
			expect(editor.getLines()).toEqual([
				"line 1 ^abc123",
				"line 2",
				"^abc123-abc123",
				"",
				"next",
			]);
		});

		test("does not insert an extra blank line when the next line is already blank", () => {
			const editor = new MockEditor(["line 1", "line 2", "", "next"].join("\n"));
			editor.setSelection({ line: 0, ch: 0 }, { line: 1, ch: 6 });

			mockGenerateRandomId.mockReturnValueOnce("abc123");
			gen_insert_blocklink_multiline_block(editor as any, baseSettings);

			expect(editor.getLines()).toEqual([
				"line 1 ^abc123",
				"line 2",
				"^abc123-abc123",
				"",
				"next",
			]);
		});

		test("inserts end marker as a standalone line at end-of-file", () => {
			const editor = new MockEditor(["line 1", "line 2"].join("\n"));
			editor.setSelection({ line: 0, ch: 0 }, { line: 1, ch: 6 });

			mockGenerateRandomId.mockReturnValueOnce("abc123");
			gen_insert_blocklink_multiline_block(editor as any, baseSettings);

			expect(editor.getLines()).toEqual(["line 1 ^abc123", "line 2", "^abc123-abc123"]);
		});
	});
});
