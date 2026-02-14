import type {
	EditorCommandName,
	EditorPosition,
	EditorRange,
	EditorSelection,
	EditorSelectionOrCaret,
	EditorTransaction,
	TFile,
} from "obsidian";
import { Editor } from "obsidian";

import { EditorSelection as CmSelection, type EditorState as CmState } from "@codemirror/state";
import { EditorView } from "@codemirror/view";

type CmCoords = { x: number; y: number };

function clamp(n: number, min: number, max: number): number {
	return Math.max(min, Math.min(max, n));
}

function posToOffset(doc: CmState["doc"], pos: EditorPosition): number {
	const lineNo = clamp(Math.floor(pos.line ?? 0), 0, Math.max(0, doc.lines - 1));
	const ch = Math.max(0, Math.floor(pos.ch ?? 0));
	const line = doc.line(lineNo + 1);
	return line.from + Math.min(ch, line.length);
}

function offsetToPos(doc: CmState["doc"], offset: number): EditorPosition {
	const off = clamp(Math.floor(offset ?? 0), 0, doc.length);
	const line = doc.lineAt(off);
	return { line: line.number - 1, ch: off - line.from };
}

function normalizeCoords(input: any): CmCoords | null {
	if (!input) return null;
	if (Number.isFinite(input.x) && Number.isFinite(input.y)) return { x: input.x, y: input.y };
	if (Number.isFinite(input.left) && Number.isFinite(input.top)) return { x: input.left, y: input.top };
	return null;
}

/**
 * Minimal Obsidian Editor adapter for driving core EditorSuggest UIs (link suggest, slash commands)
 * from a standalone CM6 EditorView.
 *
 * Keep this narrowly scoped: we only implement methods that core suggests rely on.
 */
export class OutlinerSuggestEditor extends Editor {
	readonly cm: EditorView;
	readonly containerEl: HTMLElement;

	constructor(cm: EditorView, opts?: { logicalHasFocus?: () => boolean }) {
		super();
		this.cm = cm;
		this.containerEl = cm.dom as HTMLElement;

		// Workspace editorSuggest uses `editor.cm.hasFocus` as a hard gate. In CDP-driven tests (and
		// occasionally in custom view flows), `document.hasFocus()` can be false even when the outliner
		// editor is the active target. Provide a narrow "logical focus" shim when requested.
		//
		// Keep this limited in scope: we only patch *this* CM6 instance, and we only OR in the override
		// when the original CM6 `hasFocus` getter reports false.
		try {
			const logicalHasFocus = opts?.logicalHasFocus;
			if (logicalHasFocus && !Object.prototype.hasOwnProperty.call(cm as any, "hasFocus")) {
				const proto = Object.getPrototypeOf(cm);
				const desc = Object.getOwnPropertyDescriptor(proto, "hasFocus");
				const baseGet = desc?.get;
				if (typeof baseGet === "function") {
					Object.defineProperty(cm as any, "hasFocus", {
						get() {
							try {
								if (baseGet.call(this)) return true;
							} catch {
								// ignore
							}
							try {
								return !!logicalHasFocus();
							} catch {
								return false;
							}
						},
						configurable: true,
					});
				}
			}
		} catch {
			// ignore
		}

		// Some core suggests read `editor.containerEl.win` to resolve coordinates.
		// In Obsidian's CM6 environment `win` may exist as a read-only getter, so avoid assignment.
		try {
			const elAny = this.containerEl as any;
			if (elAny && !("win" in elAny)) {
				Object.defineProperty(elAny, "win", { value: window, configurable: true });
			}
		} catch {
			// ignore
		}
	}

	refresh(): void {
		try {
			this.cm.requestMeasure();
		} catch {
			// ignore
		}
	}

	getValue(): string {
		return this.cm.state.doc.toString();
	}

	setValue(content: string): void {
		const next = String(content ?? "");
		this.cm.dispatch({
			changes: { from: 0, to: this.cm.state.doc.length, insert: next },
			selection: { anchor: next.length },
		});
	}

	getLine(line: number): string {
		const doc = this.cm.state.doc;
		const lineNo = clamp(Math.floor(line ?? 0), 0, Math.max(0, doc.lines - 1));
		return doc.line(lineNo + 1).text;
	}

	lineCount(): number {
		return this.cm.state.doc.lines;
	}

	lastLine(): number {
		return Math.max(0, this.cm.state.doc.lines - 1);
	}

	getSelection(): string {
		const r = this.cm.state.selection.main;
		return this.cm.state.sliceDoc(Math.min(r.from, r.to), Math.max(r.from, r.to));
	}

	getRange(from: EditorPosition, to: EditorPosition): string {
		const doc = this.cm.state.doc;
		const a = posToOffset(doc, from);
		const b = posToOffset(doc, to);
		return this.cm.state.sliceDoc(Math.min(a, b), Math.max(a, b));
	}

	replaceSelection(replacement: string, _origin?: string): void {
		const r = this.cm.state.selection.main;
		const from = Math.min(r.from, r.to);
		const to = Math.max(r.from, r.to);
		const insert = String(replacement ?? "");
		this.cm.dispatch({
			changes: { from, to, insert },
			selection: { anchor: from + insert.length },
		});
	}

	replaceRange(replacement: string, from: EditorPosition, to?: EditorPosition, _origin?: string): void {
		const doc = this.cm.state.doc;
		const a = posToOffset(doc, from);
		const b = to ? posToOffset(doc, to) : a;
		const insert = String(replacement ?? "");
		this.cm.dispatch({
			changes: { from: Math.min(a, b), to: Math.max(a, b), insert },
			selection: { anchor: Math.min(a, b) + insert.length },
		});
	}

	getCursor(string?: "from" | "to" | "head" | "anchor"): EditorPosition {
		const r = this.cm.state.selection.main;
		const doc = this.cm.state.doc;

		if (string === "anchor") return offsetToPos(doc, r.anchor);
		if (string === "head") return offsetToPos(doc, r.head);

		const from = Math.min(r.from, r.to);
		const to = Math.max(r.from, r.to);
		return offsetToPos(doc, string === "to" ? to : from);
	}

	listSelections(): EditorSelection[] {
		const doc = this.cm.state.doc;
		return this.cm.state.selection.ranges.map((r) => ({
			anchor: offsetToPos(doc, r.anchor),
			head: offsetToPos(doc, r.head),
		}));
	}

	setSelection(anchor: EditorPosition, head?: EditorPosition): void {
		const doc = this.cm.state.doc;
		const a = posToOffset(doc, anchor);
		const h = head ? posToOffset(doc, head) : a;
		this.cm.dispatch({ selection: { anchor: a, head: h } });
	}

	setSelections(ranges: EditorSelectionOrCaret[], main?: number): void {
		const doc = this.cm.state.doc;
		const next = ranges.map((r) => {
			const a = posToOffset(doc, r.anchor);
			const h = r.head ? posToOffset(doc, r.head) : a;
			return CmSelection.range(a, h);
		});

		this.cm.dispatch({
			selection: CmSelection.create(next, clamp(typeof main === "number" ? main : 0, 0, Math.max(0, next.length - 1))),
		});
	}

	focus(): void {
		this.cm.focus();
	}

	blur(): void {
		try {
			(this.cm.contentDOM as any)?.blur?.();
		} catch {
			// ignore
		}
	}

	hasFocus(): boolean {
		try {
			return this.cm.hasFocus;
		} catch {
			return false;
		}
	}

	getScrollInfo(): { top: number; left: number } {
		const el = this.cm.scrollDOM;
		return { top: el.scrollTop, left: el.scrollLeft };
	}

	scrollTo(x?: number | null, y?: number | null): void {
		const el = this.cm.scrollDOM;
		if (typeof x === "number") el.scrollLeft = x;
		if (typeof y === "number") el.scrollTop = y;
	}

	scrollIntoView(range: EditorRange, _center?: boolean): void {
		const doc = this.cm.state.doc;
		const a = posToOffset(doc, range.from);
		const b = posToOffset(doc, range.to);
		const pos = Math.min(a, b);
		try {
			this.cm.dispatch({ selection: { anchor: pos }, scrollIntoView: true });
		} catch {
			// ignore
		}
	}

	undo(): void {
		// Best-effort: core suggests should not require this; basicSetup already provides history keymaps.
	}

	redo(): void {
		// Best-effort: core suggests should not require this; basicSetup already provides history keymaps.
	}

	exec(_command: EditorCommandName): void {
		// Best-effort: core suggests should not require this; real Markdown editors implement it.
	}

	transaction(tx: EditorTransaction, _origin?: string): void {
		const doc = this.cm.state.doc;
		const changes: Array<{ from: number; to: number; insert: string }> = [];

		if (typeof tx.replaceSelection === "string") {
			const r = this.cm.state.selection.main;
			const from = Math.min(r.from, r.to);
			const to = Math.max(r.from, r.to);
			changes.push({ from, to, insert: tx.replaceSelection });
		}

		for (const c of tx.changes ?? []) {
			const a = posToOffset(doc, c.from);
			const b = c.to ? posToOffset(doc, c.to) : a;
			changes.push({ from: Math.min(a, b), to: Math.max(a, b), insert: String(c.text ?? "") });
		}

		let selection: { anchor: number; head?: number } | undefined;
		if (tx.selection) {
			const a = posToOffset(doc, tx.selection.from);
			const h = tx.selection.to ? posToOffset(doc, tx.selection.to) : a;
			selection = { anchor: a, head: h };
		}

		try {
			this.cm.dispatch({ changes, selection });
		} catch {
			// ignore
		}
	}

	wordAt(pos: EditorPosition): EditorRange | null {
		const doc = this.cm.state.doc;
		const off = posToOffset(doc, pos);

		// Prefer CM6's built-in wordAt if available.
		const anyState = this.cm.state as any;
		try {
			const w = typeof anyState.wordAt === "function" ? anyState.wordAt(off) : null;
			if (w && typeof w.from === "number" && typeof w.to === "number") {
				return { from: offsetToPos(doc, w.from), to: offsetToPos(doc, w.to) };
			}
		} catch {
			// ignore
		}

		const text = doc.toString();
		const isWord = (ch: string) => /[0-9A-Za-z_\-]/.test(ch);
		let start = off;
		let end = off;
		while (start > 0 && isWord(text[start - 1] ?? "")) start--;
		while (end < text.length && isWord(text[end] ?? "")) end++;
		if (start === end) return null;
		return { from: offsetToPos(doc, start), to: offsetToPos(doc, end) };
	}

	posToOffset(pos: EditorPosition): number {
		return posToOffset(this.cm.state.doc, pos);
	}

	offsetToPos(offset: number): EditorPosition {
		return offsetToPos(this.cm.state.doc, offset);
	}

	coordsAtPos(pos: EditorPosition): DOMRect {
		const off = posToOffset(this.cm.state.doc, pos);
		return (this.cm.coordsAtPos(off) ?? new DOMRect()) as DOMRect;
	}

	posAtCoords(coords: any): EditorPosition {
		const c = normalizeCoords(coords);
		const off = c ? this.cm.posAtCoords(c) : null;
		return offsetToPos(this.cm.state.doc, off ?? 0);
	}
}

export function triggerEditorSuggest(
	mgr: any,
	editor: OutlinerSuggestEditor,
	file: TFile | null
): { triggered: boolean } {
	// Prefer Obsidian's own manager entrypoint when available. It may coordinate internal state
	// beyond the per-suggest `trigger()` methods (and keeps us aligned with core behavior).
	try {
		if (mgr && typeof mgr.trigger === "function") {
			return { triggered: !!mgr.trigger(editor, file, true) };
		}
	} catch {
		// fall back
	}

	if (!mgr?.suggests || typeof mgr.setCurrentSuggest !== "function") return { triggered: false };

	for (const s of mgr.suggests) {
		if (!s || typeof s.trigger !== "function") continue;
		try {
			if (s.trigger(editor, file, true)) {
				mgr.setCurrentSuggest(s);
				return { triggered: true };
			}
		} catch {
			// ignore
		}
	}

	return { triggered: false };
}
