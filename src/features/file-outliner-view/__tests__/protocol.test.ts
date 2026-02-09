import { DateTime } from "luxon";

import {
	normalizeOutlinerFile,
	serializeOutlinerBlocksForClipboard,
	serializeOutlinerFile,
	type ParsedOutlinerFile,
} from "../protocol";

describe("file-outliner-view/protocol", () => {
	test("trims trailing whitespace after ^id (Obsidian indexing is strict)", () => {
		const now = DateTime.fromISO("2026-02-03T00:00:00");
		const input = [
			"- a",
			"  [date:: 2026-02-03T10:00:00] [updated:: 2026-02-03T10:00:00] [blp_sys:: 1] [blp_ver:: 2] ^aa  ",
			"",
		].join("\n");

		const out = normalizeOutlinerFile(input, { idPrefix: "t", idLength: 5, now });

		expect(out.content).toBe(
			[
				"- a",
				"  [date:: 2026-02-03T10:00:00] [updated:: 2026-02-03T10:00:00] [blp_sys:: 1] [blp_ver:: 2] ^aa",
				"",
			].join("\n")
		);
		expect(out.didChange).toBe(true);
	});

	test("inserts a blank continuation line before parent tail line when children exist", () => {
		const now = DateTime.fromISO("2026-02-03T00:00:00");
		const input = [
			"- parent",
			"  - child",
			"    [date:: 2026-02-03T10:00:00] [updated:: 2026-02-03T10:00:00] [blp_sys:: 1] [blp_ver:: 2] ^child",
			"  [date:: 2026-02-03T10:00:01] [updated:: 2026-02-03T10:00:01] [blp_sys:: 1] [blp_ver:: 2] ^parent",
			"",
		].join("\n");

		const out = normalizeOutlinerFile(input, { idPrefix: "t", idLength: 5, now });

		expect(out.content).toBe(
			[
				"- parent",
				"  - child",
				"    [date:: 2026-02-03T10:00:00] [updated:: 2026-02-03T10:00:00] [blp_sys:: 1] [blp_ver:: 2] ^child",
				"  ",
				"  [date:: 2026-02-03T10:00:01] [updated:: 2026-02-03T10:00:01] [blp_sys:: 1] [blp_ver:: 2] ^parent",
				"",
			].join("\n")
		);
	});

	test("preserves extra Dataview fields on the system tail line", () => {
		const now = DateTime.fromISO("2026-02-03T00:00:00");
		const input = [
			"- a",
			"  [date:: 2026-02-03T10:00:00] [updated:: 2026-02-03T10:00:00] [topic:: linux] [blp_sys:: 1] [blp_ver:: 2] ^aa",
			"",
		].join("\n");

		const out = normalizeOutlinerFile(input, { idPrefix: "t", idLength: 5, now });
		expect(out.content).toContain("[topic:: linux]");
	});

	test("fixes duplicate ids deterministically via generateId hook", () => {
		const now = DateTime.fromISO("2026-02-03T00:00:00");
		let n = 0;
		const input = [
			"- a",
			"  [date:: 2026-02-03T10:00:00] [updated:: 2026-02-03T10:00:00] [blp_sys:: 1] [blp_ver:: 2] ^dup",
			"- b",
			"  [date:: 2026-02-03T10:00:01] [updated:: 2026-02-03T10:00:01] [blp_sys:: 1] [blp_ver:: 2] ^dup",
			"",
		].join("\n");

		const out = normalizeOutlinerFile(input, {
			idPrefix: "t",
			idLength: 5,
			now,
			generateId: () => `gen${n++}`,
		});

		expect(out.content.match(/\^dup\b/g)?.length).toBe(1);
		expect(out.content).toContain("^gen0");
	});

	test("merges legacy split system lines ([date] then ^id) into a canonical tail line", () => {
		const now = DateTime.fromISO("2026-02-03T00:00:00");
		const input = ["- a", "  [date:: 2026-02-03T10:00:00]", "  ^aa", ""].join("\n");

		const out = normalizeOutlinerFile(input, { idPrefix: "t", idLength: 5, now });
		expect(out.content).toBe(
			[
				"- a",
				"  [date:: 2026-02-03T10:00:00] [updated:: 2026-02-03T00:00:00] [blp_sys:: 1] [blp_ver:: 2] ^aa",
				"",
			].join("\n")
		);
	});

	test("drops orphan system tail lines outside list context", () => {
		const now = DateTime.fromISO("2026-02-03T00:00:00");
		const input = [
			"[date:: 2026-02-03T10:00:00] [updated:: 2026-02-03T10:00:00] [blp_sys:: 1] [blp_ver:: 2] ^orphan",
			"- a",
			"  [date:: 2026-02-03T10:00:01] [updated:: 2026-02-03T10:00:01] [blp_sys:: 1] [blp_ver:: 2] ^aa",
			"",
		].join("\n");

		const out = normalizeOutlinerFile(input, { idPrefix: "t", idLength: 5, now });
		expect(out.content).not.toContain("^orphan");
		expect(out.content).toContain("^aa");
	});

	test("normalizes leading tab indentation to spaces", () => {
		const now = DateTime.fromISO("2026-02-03T00:00:00");
		const input = [
			"- parent",
			"\t- child",
			"\t\t[date:: 2026-02-03T10:00:00] [updated:: 2026-02-03T10:00:00] [blp_sys:: 1] [blp_ver:: 2] ^cc",
			"  [date:: 2026-02-03T10:00:01] [updated:: 2026-02-03T10:00:01] [blp_sys:: 1] [blp_ver:: 2] ^pp",
			"",
		].join("\n");

		const out = normalizeOutlinerFile(input, { idPrefix: "t", idLength: 5, now });
		expect(out.content).not.toContain("\t");
	});

	test("treats fenced code blocks as opaque when parsing structure", () => {
		const now = DateTime.fromISO("2026-02-03T00:00:00");
		const input = [
			"- a",
			"  ```js",
			"  - not a child",
			"  ```",
			"  [date:: 2026-02-03T10:00:00] [updated:: 2026-02-03T10:00:00] [blp_sys:: 1] [blp_ver:: 2] ^aa",
			"",
		].join("\n");

		const out = normalizeOutlinerFile(input, { idPrefix: "t", idLength: 5, now });

		expect(out.content).toBe(
			[
				"- a",
				"  ```js",
				"  - not a child",
				"  ```",
				"  [date:: 2026-02-03T10:00:00] [updated:: 2026-02-03T10:00:00] [blp_sys:: 1] [blp_ver:: 2] ^aa",
				"",
			].join("\n")
		);
	});

	test("treats fenced code blocks that start on the list-item line (`- ```lang`) as opaque when parsing structure", () => {
		const now = DateTime.fromISO("2026-02-03T00:00:00");
		const input = [
			"- ```bash",
			"  echo 1",
			"  ```",
			"  - child",
			"    [date:: 2026-02-06T00:00:01] [updated:: 2026-02-06T00:00:01] [blp_sys:: 1] [blp_ver:: 2] ^child",
			"  ",
			"  [date:: 2026-02-06T00:00:00] [updated:: 2026-02-06T00:00:00] [blp_sys:: 1] [blp_ver:: 2] ^root",
			"- sibling",
			"  [date:: 2026-02-06T00:00:02] [updated:: 2026-02-06T00:00:02] [blp_sys:: 1] [blp_ver:: 2] ^sib",
			"",
		].join("\n");

		const out = normalizeOutlinerFile(input, { idPrefix: "t", idLength: 5, now });
		expect(out.content).toBe(input);
		expect(out.didChange).toBe(false);
	});

	test("escapes list-looking body lines outside fences during serialization", () => {
		const file: ParsedOutlinerFile = {
			frontmatter: null,
			blocks: [
				{
					id: "aa",
					depth: 0,
					text: "a\n- not a child\n- [ ] not a child\n1. not a list",
					children: [],
					system: {
						date: "2026-02-03T10:00:00",
						updated: "2026-02-03T10:00:00",
						extra: {},
					},
				},
			],
		};

		const out = serializeOutlinerFile(file, { indentSize: 2 });
		expect(out).toContain("  \\- not a child");
		expect(out).toContain("  \\- [ ] not a child");
		expect(out).toContain("  1\\. not a list");
	});

	test("does not escape list-looking lines inside fences that start on the first line during serialization", () => {
		const file: ParsedOutlinerFile = {
			frontmatter: null,
			blocks: [
				{
					id: "aa",
					depth: 0,
					text: "```js\n- inside fence\n```",
					children: [],
					system: { date: "d", updated: "u", extra: {} },
				},
			],
		};

		const out = serializeOutlinerFile(file, { indentSize: 2 });
		expect(out).toContain("  - inside fence");
		expect(out).not.toContain("  \\\\- inside fence");
	});

	test("treats task checkbox markers as plain text (no structural task state)", () => {
		const now = DateTime.fromISO("2026-02-03T00:00:00");
		const input = [
			"- [ ] a",
			"  [date:: 2026-02-03T10:00:00] [updated:: 2026-02-03T10:00:00] [blp_sys:: 1] [blp_ver:: 2] ^aa",
			"",
		].join("\n");

		const out = normalizeOutlinerFile(input, { idPrefix: "t", idLength: 5, now });
		expect(out.content).toBe(input);
	});

	test("drops nested/misindented legacy system tail lines", () => {
		const now = DateTime.fromISO("2026-02-03T00:00:00");
		const input = [
			"- [[vpp-route-table]]",
			"  [date:: 2026-02-03T10:12:12] ^tc2t",
			"    [date:: 2026-02-03T10:12:03] ^ewwn",
			"",
		].join("\n");

		const out = normalizeOutlinerFile(input, { idPrefix: "t", idLength: 5, now });
		expect(out.content).toBe(
			[
				"- [[vpp-route-table]]",
				"  [date:: 2026-02-03T10:12:12] [updated:: 2026-02-03T00:00:00] [blp_sys:: 1] [blp_ver:: 2] ^tc2t",
				"",
			].join("\n")
		);
		expect(out.content).not.toContain("^ewwn");
	});

	test("serializeOutlinerBlocksForClipboard emits a markdown list without system tail lines", () => {
		const blocks: ParsedOutlinerFile["blocks"] = [
			{
				id: "aa",
				depth: 0,
				text: "parent\n\n- not a child\n```js\n- inside fence\n```\nend",
				children: [
					{
						id: "bb",
						depth: 1,
						text: "child",
						children: [],
						system: { date: "d", updated: "u", extra: {} },
					},
				],
				system: { date: "d", updated: "u", extra: {} },
			},
		];

		const out = serializeOutlinerBlocksForClipboard(blocks, { indentSize: 2 });
		expect(out).toBe(
			[
				"- parent",
				"  ",
				"  \\- not a child",
				"  ```js",
				"  - inside fence",
				"  ```",
				"  end",
				"  - child",
			].join("\n")
		);

		expect(out).not.toContain("[date::");
		expect(out).not.toContain("^aa");
		expect(out).not.toContain("^bb");
	});

	test("serializeOutlinerBlocksForClipboard does not escape list-looking lines inside fences that start on the first line", () => {
		const blocks: ParsedOutlinerFile["blocks"] = [
			{
				id: "aa",
				depth: 0,
				text: "```js\n- inside fence\n```",
				children: [],
				system: { date: "d", updated: "u", extra: {} },
			},
		];

		const out = serializeOutlinerBlocksForClipboard(blocks, { indentSize: 2 });
		expect(out).toBe(["- ```js", "  - inside fence", "  ```"].join("\n"));
	});
});
