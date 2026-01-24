import { EditorState } from "@codemirror/state";
import { Editor, MarkdownView, TFile } from "obsidian";
import { registerEnhancedListOpsCommands } from "../commands";
import { computeSwapWithSiblingRegion, indentSubtreeLines, outdentAndMoveSubtreeLines } from "../ops-core";
import { findSibling, inferListIndentUnit, resolveListSubtreeForLine } from "../list-subtree";
import { computeEnhancedListZoomRange } from "../zoom";

const listItem = (startLine: number, endLine: number, parent: number) => ({
	parent,
	position: {
		start: { line: startLine, col: 0, offset: 0 },
		end: { line: endLine, col: 0, offset: 0 },
	},
});

describe("enhanced-list-blocks/ops/list-subtree", () => {
	test("resolveListSubtreeForLine picks the smallest containing range", () => {
		const items = [listItem(1, 2, -1), listItem(2, 2, 1), listItem(3, 3, -1)] as any;

		expect(resolveListSubtreeForLine(items, 1)?.startLine).toBe(1);
		expect(resolveListSubtreeForLine(items, 2)?.startLine).toBe(2);
		expect(resolveListSubtreeForLine(items, 3)?.startLine).toBe(3);
	});

	test("findSibling returns siblings by parent", () => {
		const a = listItem(1, 2, -1) as any;
		const b = listItem(3, 3, -1) as any;
		const child = listItem(2, 2, 1) as any;
		const items = [a, child, b];

		expect(findSibling(items, a, "next")?.position.start.line).toBe(3);
		expect(findSibling(items, b, "prev")?.position.start.line).toBe(1);
	});

	test("inferListIndentUnit infers a common unit from parent/child indentation", () => {
		const items = [listItem(1, 2, -1), listItem(2, 2, 1)] as any;
		const lines = ["Intro", "- A", "  - B"];
		expect(inferListIndentUnit(lines, items)).toBe("  ");
	});
});

describe("enhanced-list-blocks/ops/ops-core", () => {
	test("computeEnhancedListZoomRange returns expected offsets for a line", () => {
		const state = EditorState.create({ doc: "a\nbb\nccc" });
		expect(computeEnhancedListZoomRange(state.doc, 1, 1)).toEqual({ from: 2, to: 4 });
	});

	test("computeSwapWithSiblingRegion swaps subtree with previous sibling", () => {
		const lines = ["x", "- A", "  - a1", "- B", "  - b1", "y"];

		const swap = computeSwapWithSiblingRegion(
			lines,
			{ startLine: 3, endLine: 4 },
			{ startLine: 1, endLine: 2 },
			"up"
		);

		expect(swap).not.toBeNull();
		expect(swap!.replaceFromLine).toBe(1);
		expect(swap!.replaceToLine).toBe(4);
		expect(swap!.newStartLine).toBe(1);
		expect(swap!.newRegion).toEqual(["- B", "  - b1", "- A", "  - a1"]);
	});

	test("computeSwapWithSiblingRegion swaps subtree with next sibling", () => {
		const lines = ["x", "- A", "  - a1", "- B", "  - b1", "y"];

		const swap = computeSwapWithSiblingRegion(
			lines,
			{ startLine: 1, endLine: 2 },
			{ startLine: 3, endLine: 4 },
			"down"
		);

		expect(swap).not.toBeNull();
		expect(swap!.replaceFromLine).toBe(1);
		expect(swap!.replaceToLine).toBe(4);
		expect(swap!.newStartLine).toBe(3);
		expect(swap!.newRegion).toEqual(["- B", "  - b1", "- A", "  - a1"]);
	});

	test("indentSubtreeLines prefixes unit without changing line count", () => {
		const lines = ["- A", "  - B", ""];
		const indented = indentSubtreeLines(lines, { startLine: 0, endLine: 2 }, "\t");
		expect(indented).toEqual(["\t- A", "\t  - B", ""]);
	});

	test("outdentAndMoveSubtreeLines outdents and moves subtree after parent subtree", () => {
		const lines = ["- A", "  - B", "  - C", "- D"];
		const moved = outdentAndMoveSubtreeLines(lines, { startLine: 1, endLine: 1 }, 3, "  ");
		expect(moved).not.toBeNull();
		expect(moved!.nextLines).toEqual(["- A", "  - C", "- B", "- D"]);
	});
});

describe("enhanced-list-blocks/ops/commands gating", () => {
	test("refuses enabling zoom command when conflict plugin is enabled", () => {
		const commands: any[] = [];
		const plugin: any = {
			settings: {
				enhancedListEnabledFolders: [],
				enhancedListEnabledFiles: [],
				enhancedListOpsZoom: true,
				enhancedListOpsMove: true,
				enhancedListOpsIndent: true,
			},
			app: {
				plugins: {
					enabledPlugins: new Set(["obsidian-zoom"]),
				},
				metadataCache: {
					getFileCache: () => ({ frontmatter: { blp_enhanced_list: true } }),
				},
			},
			addCommand: (c: any) => commands.push(c),
		};

		registerEnhancedListOpsCommands(plugin);

		const zoomIn = commands.find((c) => c.id === "enhanced-list-zoom-in");
		expect(zoomIn).toBeTruthy();

		const editor = new (Editor as any)();
		(editor as any).cm = { state: { field: () => true } };
		const file = new (TFile as any)("Test.md");
		const view = new (MarkdownView as any)(editor, file);

		expect(zoomIn.editorCheckCallback(true, editor, view)).toBe(false);
	});

	test("refuses enabling outliner commands when conflict plugin is enabled", () => {
		const commands: any[] = [];
		const plugin: any = {
			settings: {
				enhancedListEnabledFolders: [],
				enhancedListEnabledFiles: [],
				enhancedListOpsZoom: true,
				enhancedListOpsMove: true,
				enhancedListOpsIndent: true,
			},
			app: {
				plugins: {
					enabledPlugins: new Set(["obsidian-outliner"]),
				},
				metadataCache: {
					getFileCache: () => ({ frontmatter: { blp_enhanced_list: true } }),
				},
			},
			addCommand: (c: any) => commands.push(c),
		};

		registerEnhancedListOpsCommands(plugin);

		const moveUp = commands.find((c) => c.id === "enhanced-list-move-subtree-up");
		expect(moveUp).toBeTruthy();

		const editor = new (Editor as any)();
		(editor as any).cm = { state: { field: () => true } };
		const file = new (TFile as any)("Test.md");
		const view = new (MarkdownView as any)(editor, file);

		expect(moveUp.editorCheckCallback(true, editor, view)).toBe(false);
	});
});
