import { Parser } from "../../services/Parser";
import { VerticalLinesPluginValue } from "../VerticalLines";

function createReader(lines: string[]) {
	return {
		getCursor: () => ({ line: 0, ch: 0 }),
		getLine: (n: number) => lines[n] ?? "",
		lastLine: () => Math.max(0, lines.length - 1),
		listSelections: () => [{ anchor: { line: 0, ch: 0 }, head: { line: 0, ch: 0 } }],
		getAllFoldedLines: () => [],
	};
}

function createParser() {
	// Parser only needs `settings.keepCursorWithinContent` and a logger with `bind()`.
	return new Parser({ bind: () => () => {} } as any, { keepCursorWithinContent: "bullet-and-checkbox" } as any);
}

function posToOffsetFactory(lines: string[]) {
	const lineStarts: number[] = [];
	let off = 0;
	for (const line of lines) {
		lineStarts.push(off);
		off += line.length + 1; // + '\n'
	}
	return (pos: { line: number; ch: number }) => (lineStarts[pos.line] ?? 0) + pos.ch;
}

describe("vendored obsidian-outliner VerticalLines: coordsAtPos null safety", () => {
	test("does not throw when coordsAtPos returns null during recursive calculation", () => {
		jest.useFakeTimers();

		const lines = ["- a", "  - b", "    - c"];
		const parser = createParser();
		const roots = parser.parseRange(createReader(lines) as any);
		expect(roots).toHaveLength(1);

		const root = roots[0].getRootList();
		const top = root.getChildren()[0];

		// Minimal CM view stub: just enough for recursive() to run.
		const view: any = {
			dom: document.createElement("div"),
			visibleRanges: [{ from: 0, to: lines.join("\n").length }],
			coordsAtPos: () => null,
			lineBlockAt: () => ({ top: 0, bottom: 100 }),
		};

		const pluginValue = new VerticalLinesPluginValue({} as any, {} as any, parser as any, view as any);
		(pluginValue as any).editor = {
			posToOffset: posToOffsetFactory(lines),
			getZoomRange: () => null,
		};
		(pluginValue as any).lines = [];
		(pluginValue as any).lastLine = lines.length - 1;

		try {
			expect(() => (pluginValue as any).recursive(top)).not.toThrow();
		} finally {
			pluginValue.destroy();
			jest.runOnlyPendingTimers();
			jest.useRealTimers();
		}
	});
});

