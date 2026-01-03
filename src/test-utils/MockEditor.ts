export type MockEditorPosition = { line: number; ch: number };

export class MockEditor {
	private content: string;
	private cursorFrom: MockEditorPosition;
	private cursorTo: MockEditorPosition;

	constructor(initialContent: string) {
		this.content = initialContent;
		this.cursorFrom = { line: 0, ch: 0 };
		this.cursorTo = { line: 0, ch: 0 };
	}

	public getValue(): string {
		return this.content;
	}

	public setValue(content: string): void {
		this.content = content;
	}

	public getLine(line: number): string {
		const lines = this.getLines();
		return lines[line] ?? "";
	}

	public lineCount(): number {
		return this.getLines().length;
	}

	public lastLine(): number {
		return Math.max(0, this.lineCount() - 1);
	}

	public getCursor(which: "from" | "to" = "from"): MockEditorPosition {
		return which === "to" ? { ...this.cursorTo } : { ...this.cursorFrom };
	}

	public setCursor(pos: MockEditorPosition | number, ch?: number): void {
		const next =
			typeof pos === "number"
				? { line: pos, ch: ch ?? 0 }
				: { line: pos.line, ch: pos.ch };
		this.cursorFrom = { ...next };
		this.cursorTo = { ...next };
	}

	public setSelection(anchor: MockEditorPosition, head?: MockEditorPosition): void {
		const start = anchor;
		const end = head ?? anchor;
		const fromFirst =
			start.line < end.line || (start.line === end.line && start.ch <= end.ch);
		this.cursorFrom = fromFirst ? { ...start } : { ...end };
		this.cursorTo = fromFirst ? { ...end } : { ...start };
	}

	public getSelection(): string {
		return this.getRange(this.cursorFrom, this.cursorTo);
	}

	public getRange(from: MockEditorPosition, to: MockEditorPosition): string {
		const startOffset = this.posToOffset(from);
		const endOffset = this.posToOffset(to);
		return this.content.slice(startOffset, endOffset);
	}

	public replaceRange(
		replacement: string,
		from: MockEditorPosition,
		to: MockEditorPosition = from
	): void {
		const startOffset = this.posToOffset(from);
		const endOffset = this.posToOffset(to);
		this.content =
			this.content.slice(0, startOffset) + replacement + this.content.slice(endOffset);
	}

	public getLines(): string[] {
		return this.content.split("\n");
	}

	private posToOffset(pos: MockEditorPosition): number {
		const lines = this.getLines();

		if (pos.line <= 0 && pos.ch <= 0) {
			return 0;
		}

		if (pos.line >= lines.length) {
			return this.content.length;
		}

		const line = Math.max(0, pos.line);
		const ch = Math.max(0, Math.min(pos.ch, (lines[line] ?? "").length));

		let offset = 0;
		for (let i = 0; i < line; i++) {
			offset += (lines[i] ?? "").length + 1;
		}

		return offset + ch;
	}
}

