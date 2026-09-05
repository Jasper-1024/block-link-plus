import { DateTime } from "luxon";

import { normalizeOutlinerFile } from "../protocol";
import {
	extractZeroBasedLineFromEphemeralState,
	resolveOutlinerBlockIdForSourceLine,
} from "../source-line-navigation";

describe("file-outliner-view/source-line-navigation", () => {
	const now = DateTime.fromISO("2026-06-12T00:00:00");

	function normalize(input: string) {
		return normalizeOutlinerFile(input, {
			idPrefix: "t",
			idLength: 5,
			now,
			indentSize: 2,
		}).file;
	}

	test("maps a block body source line to the owning block id", () => {
		const file = normalize(
			[
				"- first",
				"  [date:: 2026-06-12T00:00:00] [updated:: 2026-06-12T00:00:00] [blp_sys:: 1] [blp_ver:: 2] ^first",
				"- TARGET_NEEDLE",
				"  [date:: 2026-06-12T00:00:00] [updated:: 2026-06-12T00:00:00] [blp_sys:: 1] [blp_ver:: 2] ^target",
				"",
			].join("\n")
		);

		expect(resolveOutlinerBlockIdForSourceLine(file, 2)).toBe("target");
	});

	test("maps a block system tail source line to the owning block id", () => {
		const file = normalize(
			[
				"- first",
				"  [date:: 2026-06-12T00:00:00] [updated:: 2026-06-12T00:00:00] [blp_sys:: 1] [blp_ver:: 2] ^first",
				"- second",
				"  [date:: 2026-06-12T00:00:00] [updated:: 2026-06-12T00:00:00] [blp_sys:: 1] [blp_ver:: 2] ^second",
				"",
			].join("\n")
		);

		expect(resolveOutlinerBlockIdForSourceLine(file, 3)).toBe("second");
	});

	test("accounts for frontmatter before body line mapping", () => {
		const file = normalize(
			[
				"---",
				"kind: outliner",
				"---",
				"- TARGET_NEEDLE",
				"  [date:: 2026-06-12T00:00:00] [updated:: 2026-06-12T00:00:00] [blp_sys:: 1] [blp_ver:: 2] ^target",
				"",
			].join("\n")
		);

		expect(resolveOutlinerBlockIdForSourceLine(file, 3)).toBe("target");
		expect(resolveOutlinerBlockIdForSourceLine(file, 1)).toBeNull();
	});

	test("maps continuation lines to the owning block id", () => {
		const file = normalize(
			[
				"- first line",
				"  continuation TARGET_NEEDLE",
				"  [date:: 2026-06-12T00:00:00] [updated:: 2026-06-12T00:00:00] [blp_sys:: 1] [blp_ver:: 2] ^target",
				"",
			].join("\n")
		);

		expect(resolveOutlinerBlockIdForSourceLine(file, 1)).toBe("target");
	});

	test("maps legacy tail-after-children child body lines to the child block", () => {
		const file = normalize(
			[
				"- parent",
				"  - child TARGET_NEEDLE",
				"    [date:: 2026-06-12T00:00:00] [updated:: 2026-06-12T00:00:00] [blp_sys:: 1] [blp_ver:: 2] ^child",
				"  [date:: 2026-06-12T00:00:00] [updated:: 2026-06-12T00:00:00] [blp_sys:: 1] [blp_ver:: 2] ^parent",
				"",
			].join("\n")
		);

		expect(resolveOutlinerBlockIdForSourceLine(file, 1)).toBe("child");
	});

	test("maps legacy tail-after-children parent tail lines to the parent block", () => {
		const file = normalize(
			[
				"- parent",
				"  - child",
				"    [date:: 2026-06-12T00:00:00] [updated:: 2026-06-12T00:00:00] [blp_sys:: 1] [blp_ver:: 2] ^child",
				"  [date:: 2026-06-12T00:00:00] [updated:: 2026-06-12T00:00:00] [blp_sys:: 1] [blp_ver:: 2] ^parent",
				"",
			].join("\n")
		);

		expect(resolveOutlinerBlockIdForSourceLine(file, 3)).toBe("parent");
	});

	test("extracts Obsidian zero-based line state without treating subpath specially", () => {
		expect(extractZeroBasedLineFromEphemeralState({ line: 12 })).toBe(12);
		expect(extractZeroBasedLineFromEphemeralState({ startLoc: { line: 7 } })).toBe(7);
		expect(extractZeroBasedLineFromEphemeralState({ line: 4, startLoc: { line: 7 } })).toBe(4);
		expect(extractZeroBasedLineFromEphemeralState({ line: "7" })).toBeNull();
		expect(extractZeroBasedLineFromEphemeralState(null)).toBeNull();
	});

	test("extracts the source line from an actual global-search match payload", () => {
		const content = "---\nblp_outliner: true\n---\n- first\n- TARGET";
		const start = content.indexOf("TARGET");
		expect(extractZeroBasedLineFromEphemeralState({ match: { content, matches: [[start, start + 6]] } })).toBe(4);
	});

	test("match offsets use UTF-16 positions and support CRLF and block continuation lines", () => {
		const content = "---\r\nblp_outliner: true\r\n---\r\n- 中文😀\r\n  continuation TARGET\r\n";
		const start = content.indexOf("TARGET");
		const line = extractZeroBasedLineFromEphemeralState({ match: { content, matches: [[start, start + 6]] } });
		expect(line).toBe(4);
		const file = normalize(content.replace(/\r\n/g, "\n"));
		expect(resolveOutlinerBlockIdForSourceLine(file, line!)).toBe(file.blocks[0].id);
	});

	test("explicit line retains priority and each clicked match resolves its own position", () => {
		const content = "first\nsecond\nthird";
		expect(extractZeroBasedLineFromEphemeralState({ match: { content, matches: [[6, 12]] } })).toBe(1);
		expect(extractZeroBasedLineFromEphemeralState({ match: { content, matches: [[13, 18]] } })).toBe(2);
		expect(extractZeroBasedLineFromEphemeralState({ line: 0, match: { content, matches: [[13, 18]] } })).toBe(0);
	});

	test("preserves startLoc priority and supports a match at the first character", () => {
		expect(extractZeroBasedLineFromEphemeralState({ startLoc: { line: 2 }, match: { content: "abc", matches: [[0, 1]] } })).toBe(2);
		expect(extractZeroBasedLineFromEphemeralState({ match: { content: "abc", matches: [[0, 1]] } })).toBe(0);
		expect(extractZeroBasedLineFromEphemeralState({ match: { content: "abc", matches: [[NaN, 1]] } })).toBeNull();
		expect(extractZeroBasedLineFromEphemeralState({ match: { content: "abc", matches: [[0]] } })).toBeNull();
	});

	test.each([
		null, {}, { content: 42, matches: [[0, 0]] }, { content: "abc", matches: [] },
		{ content: "abc", matches: [null] }, { content: "abc", matches: [[-1, 1]] },
		{ content: "abc", matches: [[1, 4]] }, { content: "abc", matches: [[2, 1]] },
		{ content: "abc", matches: [[0.5, 1]] }, { content: "abc", matches: [["0", 1]] },
	])("ignores invalid match payloads without jumping to an unrelated line: %j", match => {
		expect(extractZeroBasedLineFromEphemeralState({ match })).toBeNull();
	});
});
