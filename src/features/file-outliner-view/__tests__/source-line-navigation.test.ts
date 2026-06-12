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
});
