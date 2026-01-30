import { ChangesApplicator } from "../ChangesApplicator";

type Pos = { line: number; ch: number };

function posToOffset(text: string, pos: Pos): number {
	const lines = text.split("\n");
	const line = Math.max(0, Math.min(pos.line, Math.max(0, lines.length - 1)));
	const ch = Math.max(0, Math.min(pos.ch, (lines[line] ?? "").length));

	let off = 0;
	for (let i = 0; i < line; i++) {
		off += (lines[i] ?? "").length + 1; // + '\n'
	}
	return off + ch;
}

class BaseTestEditor {
	protected text: string;

	constructor(text: string) {
		this.text = text;
	}

	getValue() {
		return this.text;
	}

	getLine(n: number) {
		return this.text.split("\n")[n] ?? "";
	}

	lastLine() {
		return Math.max(0, this.text.split("\n").length - 1);
	}

	posToOffset(pos: Pos) {
		return posToOffset(this.text, pos);
	}

	getRange(from: Pos, to: Pos) {
		const start = this.posToOffset(from);
		const end = this.posToOffset(to);
		return this.text.slice(start, end);
	}

	// no-op folding/selection hooks for ChangesApplicator.apply
	fold(_n: number) {}
	unfold(_n: number) {}
	setSelections(_sels: any) {}
}

class NormalReplaceRangeEditor extends BaseTestEditor {
	replaceRange(replacement: string, from: Pos, to: Pos) {
		const start = this.posToOffset(from);
		const end = this.posToOffset(to);
		this.text = this.text.slice(0, start) + replacement + this.text.slice(end);
	}
}

class BuggyReplaceRangeEditor extends BaseTestEditor {
	// Simulate the observed Obsidian CM6 edge case where replacing up to EOL may also consume the
	// following '\n' (joining the next line to the previous one).
	replaceRange(replacement: string, from: Pos, to: Pos) {
		const start = this.posToOffset(from);
		let end = this.posToOffset(to);

		const toLine = this.getLine(to.line);
		if (to.ch === toLine.length && this.text[end] === "\n") {
			end += 1;
		}

		this.text = this.text.slice(0, start) + replacement + this.text.slice(end);
	}
}

function makeRoot(
	content: string,
	start: Pos,
	end: Pos,
	selections: Array<{ anchor: Pos; head: Pos }> = [{ anchor: { line: 0, ch: 0 }, head: { line: 0, ch: 0 } }]
) {
	return {
		getContentRange: () => [start, end] as [Pos, Pos],
		print: () => content,
		getSelections: () => selections,
		getChildren: () => [],
	};
}

describe("ChangesApplicator newline preservation", () => {
	const oldText = [
		"L0",
		"L1",
		"\t- g 23232ds ds ds  ",
		"\t- e  ",
		"\t  [date:: 2026-01-24T11:25:16] ^8d4p",
		"\t- f  ",
		"\t  child",
	].join("\n");

	const newText = [
		"L0",
		"L1",
		"\t- e  ",
		"\t  [date:: 2026-01-24T11:25:16] ^8d4p",
		"\t- g 23232ds ds ds  ",
		"\t- f  ",
		"\t  child",
	].join("\n");

	const start: Pos = { line: 0, ch: 0 };
	const end: Pos = { line: oldText.split("\n").length - 1, ch: "\t  child".length };

	it("keeps the newline before the next unchanged line even when replaceRange consumes it", () => {
		const editor = new BuggyReplaceRangeEditor(oldText);
		const prevRoot = makeRoot(oldText, start, end);
		const nextRoot = makeRoot(newText, start, end);

		new ChangesApplicator().apply(editor as any, prevRoot as any, nextRoot as any);

		expect(editor.getValue()).toBe(newText);
		expect(editor.getValue()).not.toMatch(/\t- g[^\n]*\t- f/);
	});

	it("does not introduce extra blank lines with a normal replaceRange implementation", () => {
		const editor = new NormalReplaceRangeEditor(oldText);
		const prevRoot = makeRoot(oldText, start, end);
		const nextRoot = makeRoot(newText, start, end);

		new ChangesApplicator().apply(editor as any, prevRoot as any, nextRoot as any);

		expect(editor.getValue()).toBe(newText);
		expect(editor.getValue()).not.toMatch(/\n\n/);
	});

	it("clamps invalid selections to document bounds (no RangeError)", () => {
		const text = ["- a", "  - b", "- c"].join("\n");
		const start: Pos = { line: 0, ch: 0 };
		const end: Pos = { line: 2, ch: "- c".length };

		let received: any = null;
		class ThrowingSelectionEditor extends NormalReplaceRangeEditor {
			setSelections(sels: any) {
				received = sels;
				const lastLine = this.lastLine();
				for (const s of sels ?? []) {
					for (const p of [s?.anchor, s?.head]) {
						if (p.line < 0 || p.line > lastLine) throw new Error("bad line");
						const lineLen = this.getLine(p.line).length;
						if (p.ch < 0 || p.ch > lineLen) throw new Error("bad ch");
					}
				}
			}
		}

		const editor = new ThrowingSelectionEditor(text);
		const prevRoot = makeRoot(text, start, end, [{ anchor: { line: 99, ch: 99 }, head: { line: -1, ch: -5 } }]);
		const nextRoot = makeRoot(text, start, end, [{ anchor: { line: 99, ch: 99 }, head: { line: -1, ch: -5 } }]);

		expect(() => new ChangesApplicator().apply(editor as any, prevRoot as any, nextRoot as any)).not.toThrow();
		expect(received).toEqual([{ anchor: { line: 2, ch: 3 }, head: { line: 0, ch: 0 } }]);
	});
});

