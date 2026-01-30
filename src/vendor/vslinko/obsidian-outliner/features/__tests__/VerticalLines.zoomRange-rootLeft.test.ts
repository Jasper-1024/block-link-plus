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

describe("vendored obsidian-outliner VerticalLines: zoom range rootLeft safety", () => {
	test("does not anchor rootLeft on list items outside zoom range", () => {
		jest.useFakeTimers();

		const lines = ["- src", "  - dest", "    - child"];
		const parser = createParser();
		const roots = parser.parseRange(createReader(lines) as any);
		expect(roots).toHaveLength(1);

		const root = roots[0].getRootList();
		const top = root.getChildren()[0]; // `- src`

		const posToOffset = posToOffsetFactory(lines);
		const offSrc = posToOffset({ line: 0, ch: 0 });
		const offDest = posToOffset({ line: 1, ch: 2 });
		const offChild = posToOffset({ line: 2, ch: 4 });

		const calls: number[] = [];

		// Minimal CM view stub: just enough for recursive() to run.
		const view: any = {
			dom: document.createElement("div"),
			visibleRanges: [{ from: 0, to: lines.join("\n").length }],
			coordsAtPos: (pos: number) => {
				calls.push(pos);
				// Simulate zoom hiding: coordsAtPos for the out-of-zoom ancestor is far away.
				if (pos === offSrc) return { left: 1200, right: 1200, top: 0, bottom: 10 };
				if (pos === offDest) return { left: 540, right: 540, top: 0, bottom: 10 };
				if (pos === offChild) return { left: 549, right: 549, top: 0, bottom: 10 };
				return { left: 540, right: 540, top: 0, bottom: 10 };
			},
			lineBlockAt: () => ({ top: 0, bottom: 100 }),
		};

		const pluginValue = new VerticalLinesPluginValue({} as any, {} as any, parser as any, view as any);
		(pluginValue as any).editor = {
			posToOffset,
			getZoomRange: () => ({
				from: { line: 1, ch: 0 },
				to: { line: 2, ch: (lines[2] ?? "").length },
			}),
		};
		(pluginValue as any).lines = [];
		(pluginValue as any).lastLine = lines.length - 1;

		try {
			expect(() => (pluginValue as any).recursive(top)).not.toThrow();

			// The out-of-zoom ancestor should never be used as an anchor.
			expect(calls).not.toContain(offSrc);

			const lefts = ((pluginValue as any).lines ?? []).map((l: any) => l.left);
			expect(lefts.length).toBeGreaterThan(0);
			expect(Math.min(...lefts)).toBeGreaterThan(-100);
		} finally {
			pluginValue.destroy();
			jest.runOnlyPendingTimers();
			jest.useRealTimers();
		}
	});
});

