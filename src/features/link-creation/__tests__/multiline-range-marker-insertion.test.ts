import { DEFAULT_SETTINGS } from "../../../types";
import { gen_insert_blocklink_multiline_block } from "../index";
import * as Utils from "../../../utils";

type TestEditorPos = { line: number; ch: number };

class TestEditor {
	private value: string;
	private selectionFrom: TestEditorPos;
	private selectionTo: TestEditorPos;

	constructor(value: string, from: TestEditorPos, to: TestEditorPos) {
		this.value = value;
		this.selectionFrom = from;
		this.selectionTo = to;
	}

	getValue(): string {
		return this.value;
	}

	setValue(value: string): void {
		this.value = value;
	}

	getLine(line: number): string {
		return this.value.split("\n")[line] ?? "";
	}

	getCursor(which: "from" | "to"): TestEditorPos {
		return which === "from" ? this.selectionFrom : this.selectionTo;
	}

	setSelection(from: TestEditorPos, to: TestEditorPos): void {
		this.selectionFrom = from;
		this.selectionTo = to;
	}

	replaceRange(replacement: string, from: TestEditorPos, to?: TestEditorPos): void {
		const rangeTo = to ?? from;
		const startOffset = this.posToOffset(from);
		const endOffset = this.posToOffset(rangeTo);
		this.value = this.value.slice(0, startOffset) + replacement + this.value.slice(endOffset);
	}

	private posToOffset(pos: TestEditorPos): number {
		const lines = this.value.split("\n");
		const safeLine = Math.min(Math.max(0, pos.line), Math.max(0, lines.length - 1));
		let offset = 0;
		for (let i = 0; i < safeLine; i++) {
			offset += (lines[i]?.length ?? 0) + 1;
		}
		const ch = Math.min(Math.max(0, pos.ch), (lines[safeLine]?.length ?? 0));
		return offset + ch;
	}
}

describe("link-creation/gen_insert_blocklink_multiline_block", () => {
	test("inserts inline ^id-id by default when safe", () => {
		jest.spyOn(Utils, "generateRandomId").mockReturnValue("abc123");

		const editor = new TestEditor(
			["aaaa", "bbbb", "cccc"].join("\n"),
			{ line: 0, ch: 0 },
			{ line: 2, ch: 0 }
		);

		const fileCache: any = {
			sections: [
				{
					type: "paragraph",
					position: { start: { line: 0, col: 0 }, end: { line: 2, col: 4 } },
				},
			],
		};

		const result = gen_insert_blocklink_multiline_block(fileCache, editor as any, DEFAULT_SETTINGS);

		expect(result).toEqual({ ok: true, link: "^abc123-abc123" });
		expect(editor.getValue()).toBe(["aaaa ^abc123", "bbbb", "cccc ^abc123-abc123"].join("\n"));
	});

	test("falls back to standalone marker after blockquote boundary and adds a blank line only when needed", () => {
		jest.spyOn(Utils, "generateRandomId").mockReturnValue("abc123");

		const editor = new TestEditor(
			["start", "> quote1", "> quote2", "> quote3", "next paragraph", "more"].join("\n"),
			{ line: 0, ch: 0 },
			{ line: 2, ch: 0 } // selection ends inside the blockquote
		);

		const fileCache: any = {
			sections: [
				{
					type: "paragraph",
					position: { start: { line: 0, col: 0 }, end: { line: 0, col: 5 } },
				},
				{
					type: "blockquote",
					position: { start: { line: 1, col: 0 }, end: { line: 3, col: 8 } },
				},
			],
		};

		const result = gen_insert_blocklink_multiline_block(fileCache, editor as any, DEFAULT_SETTINGS);

		expect(result).toEqual({ ok: true, link: "^abc123-abc123" });
		expect(editor.getValue()).toBe(
			[
				"start ^abc123",
				"> quote1",
				"> quote2",
				"> quote3",
				"^abc123-abc123",
				"",
				"next paragraph",
				"more",
			].join("\n")
		);
	});

	test("auto-expands standalone insertion to the end of a list block when the selection ends on a blank line inside the list", () => {
		jest.spyOn(Utils, "generateRandomId").mockReturnValue("abc123");

		const editor = new TestEditor(
			["- item1", "", "- item2", "after"].join("\n"),
			{ line: 0, ch: 0 },
			{ line: 1, ch: 0 } // selection ends on the blank line inside the list block
		);

		const fileCache: any = {
			sections: [
				{
					type: "list",
					position: { start: { line: 0, col: 0 }, end: { line: 2, col: 7 } },
				},
			],
		};

		const result = gen_insert_blocklink_multiline_block(fileCache, editor as any, DEFAULT_SETTINGS);

		expect(result).toEqual({ ok: true, link: "^abc123-abc123" });
		expect(editor.getValue()).toBe(
			["- item1 ^abc123", "", "- item2", "^abc123-abc123", "", "after"].join("\n")
		);
	});

	test("inserts the start marker at the end of a wrapped list item so Obsidian can index it", () => {
		jest.spyOn(Utils, "generateRandomId").mockReturnValue("abc123");

		const editor = new TestEditor(
			["- item1", "  cont", "- item2", "after"].join("\n"),
			{ line: 0, ch: 0 },
			{ line: 2, ch: 0 } // selection spans two list items; first item has continuation lines
		);

		const fileCache: any = {
			sections: [
				{
					type: "list",
					position: { start: { line: 0, col: 0 }, end: { line: 2, col: 7 } },
				},
			],
			listItems: [
				{ position: { start: { line: 0, col: 0 }, end: { line: 1, col: 6 } } },
				{ position: { start: { line: 2, col: 0 }, end: { line: 2, col: 7 } } },
			],
		};

		const result = gen_insert_blocklink_multiline_block(fileCache, editor as any, DEFAULT_SETTINGS);

		expect(result).toEqual({ ok: true, link: "^abc123-abc123" });
		expect(editor.getValue()).toBe(["- item1", "  cont ^abc123", "- item2 ^abc123-abc123", "after"].join("\n"));
	});

	test("does not expand a range within a wrapped list item to the whole list block", () => {
		jest.spyOn(Utils, "generateRandomId").mockReturnValue("abc123");

		const editor = new TestEditor(
			["- item1", "  cont", "- item2", "after"].join("\n"),
			{ line: 0, ch: 0 },
			{ line: 1, ch: 0 } // selection stays inside the first list item
		);

		const fileCache: any = {
			sections: [
				{
					type: "list",
					position: { start: { line: 0, col: 0 }, end: { line: 2, col: 7 } },
				},
			],
			listItems: [
				{ position: { start: { line: 0, col: 0 }, end: { line: 1, col: 6 } } },
				{ position: { start: { line: 2, col: 0 }, end: { line: 2, col: 7 } } },
			],
		};

		const result = gen_insert_blocklink_multiline_block(fileCache, editor as any, DEFAULT_SETTINGS);

		expect(result).toEqual({ ok: true, link: "^abc123-abc123" });
		expect(editor.getValue()).toBe(
			["- item1", "  cont ^abc123", "  ^abc123-abc123", "- item2", "after"].join("\n")
		);
	});

	test("reuses an existing inline range marker without modifying the document", () => {
		const spy = jest.spyOn(Utils, "generateRandomId");
		spy.mockClear();

		const original = ["aaaa ^abc123", "bbbb", "cccc ^abc123-abc123"].join("\n");
		const editor = new TestEditor(original, { line: 0, ch: 0 }, { line: 2, ch: 0 });

		const fileCache: any = { sections: [] };
		const result = gen_insert_blocklink_multiline_block(fileCache, editor as any, DEFAULT_SETTINGS);

		expect(result).toEqual({ ok: true, link: "^abc123-abc123" });
		expect(editor.getValue()).toBe(original);
		expect(spy).not.toHaveBeenCalled();
	});

	test("reuses an existing standalone range marker without modifying the document", () => {
		const spy = jest.spyOn(Utils, "generateRandomId");
		spy.mockClear();

		const original = [
			"start ^abc123",
			"> quote1",
			"> quote2",
			"> quote3",
			"^abc123-abc123",
			"",
			"next paragraph",
		].join("\n");
		const editor = new TestEditor(original, { line: 0, ch: 0 }, { line: 2, ch: 0 });

		const fileCache: any = {
			sections: [
				{
					type: "paragraph",
					position: { start: { line: 0, col: 0 }, end: { line: 0, col: 5 } },
				},
				{
					type: "blockquote",
					position: { start: { line: 1, col: 0 }, end: { line: 3, col: 8 } },
				},
			],
		};

		const result = gen_insert_blocklink_multiline_block(fileCache, editor as any, DEFAULT_SETTINGS);

		expect(result).toEqual({ ok: true, link: "^abc123-abc123" });
		expect(editor.getValue()).toBe(original);
		expect(spy).not.toHaveBeenCalled();
	});

	test("fails without modifying the document when the start line already has a block ID", () => {
		jest.spyOn(Utils, "generateRandomId").mockReturnValue("abc123");

		const original = ["aaaa ^old", "bbbb", "cccc"].join("\n");
		const editor = new TestEditor(original, { line: 0, ch: 0 }, { line: 2, ch: 0 });

		const fileCache: any = { sections: [] };
		const result = gen_insert_blocklink_multiline_block(fileCache, editor as any, DEFAULT_SETTINGS);

		expect(result.ok).toBe(false);
		expect(editor.getValue()).toBe(original);
	});

	test("rolls back atomically when end marker insertion fails", () => {
		jest.spyOn(Utils, "generateRandomId").mockReturnValue("abc123");

		class ThrowingEndMarkerEditor extends TestEditor {
			replaceRange(replacement: string, from: TestEditorPos, to?: TestEditorPos): void {
				if (replacement.includes("^abc123-abc123")) {
					throw new Error("insertion failed");
				}
				super.replaceRange(replacement, from, to);
			}
		}

		const original = ["aaaa", "bbbb", "cccc"].join("\n");
		const editor = new ThrowingEndMarkerEditor(
			original,
			{ line: 0, ch: 0 },
			{ line: 2, ch: 0 }
		);

		const fileCache: any = {
			sections: [
				{
					type: "paragraph",
					position: { start: { line: 0, col: 0 }, end: { line: 2, col: 4 } },
				},
			],
		};

		const result = gen_insert_blocklink_multiline_block(fileCache, editor as any, DEFAULT_SETTINGS);

		expect(result.ok).toBe(false);
		expect(editor.getValue()).toBe(original);
		expect(editor.getCursor("from")).toEqual({ line: 0, ch: 0 });
		expect(editor.getCursor("to")).toEqual({ line: 2, ch: 0 });
	});
});
