import { sanitizeOutlinerBlockMarkdownForDisplay } from "../block-markdown";

describe("file-outliner-view/block-markdown", () => {
	test("returns no issues for safe markdown", () => {
		const input = "hello **world**\n`code`";
		const out = sanitizeOutlinerBlockMarkdownForDisplay(input);
		expect(out.issues).toHaveLength(0);
		expect(out.sanitized).toBe(input);
	});

	test("escapes list markers (ul/ol) outside fences, including indented lines", () => {
		const input = ["a", "- item", "  - item2", "1. one", "  2. two", ""].join("\n");
		const out = sanitizeOutlinerBlockMarkdownForDisplay(input);

		expect(out.hasListIssue).toBe(true);
		expect(out.sanitized).toBe(["a", "\\- item", "  \\- item2", "1\\. one", "  2\\. two", ""].join("\n"));
	});

	test("escapes ATX headings outside fences (up to 3 leading spaces)", () => {
		const input = ["## h2", "  ### h3", "    #### not heading (indent 4)", ""].join("\n");
		const out = sanitizeOutlinerBlockMarkdownForDisplay(input);

		expect(out.hasHeadingIssue).toBe(true);
		expect(out.sanitized).toBe(["\\## h2", "  \\### h3", "    #### not heading (indent 4)", ""].join("\n"));
	});

	test("does not flag or sanitize list/heading lines inside fenced code blocks", () => {
		const input = ["```js", "- inside fence", "## inside fence", "```", "- outside fence", ""].join("\n");
		const out = sanitizeOutlinerBlockMarkdownForDisplay(input);

		expect(out.hasListIssue).toBe(true);
		expect(out.hasHeadingIssue).toBe(false);
		expect(out.sanitized).toBe(["```js", "- inside fence", "## inside fence", "```", "\\- outside fence", ""].join("\n"));
	});
});

