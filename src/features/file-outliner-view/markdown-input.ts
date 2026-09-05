import { EditorState, Prec, type Extension } from "@codemirror/state";
import { EditorView } from "@codemirror/view";

export type MarkdownPairingSettings = { brackets: boolean; markdown: boolean };

type Fence = { marker: string; length: number; indent: string; openingLine: number };

// Scan only this block. A different marker or a shorter run cannot close a fence.
function fenceAt(state: EditorState, pos: number): Fence | null {
	let fence: Fence | null = null;
	const lastLine = state.doc.lineAt(pos).number;
	for (let n = 1; n <= lastLine; n++) {
		const line = state.doc.line(n);
		const match = /^( {0,3})(`{3,}|~{3,})(.*)$/.exec(line.text);
		if (!match) continue;
		if (fence) {
			if (match[2][0] === fence.marker && match[2].length >= fence.length && /^\s*$/.test(match[3])) {
				// Before/within the closing delimiter is still a block-local edit.
				if (n === lastLine && pos < line.from + match[1].length + match[2].length) return fence;
				fence = null;
			}
		} else if (match[2][0] !== "`" || !match[3].includes("`")) {
			if (n === lastLine && pos <= line.from + match[1].length) return null;
			fence = { marker: match[2][0], length: match[2].length, indent: match[1], openingLine: n };
		}
	}
	return fence;
}

function escapedAt(state: EditorState, pos: number): boolean {
	let slashes = 0;
	while (pos > 0 && state.sliceDoc(pos - 1, pos) === "\\") {
		pos--;
		slashes++;
	}
	return slashes % 2 === 1;
}

function inlineCodeAt(state: EditorState, pos: number): boolean {
	const line = state.doc.lineAt(pos);
	const prefix = state.sliceDoc(line.from, pos);
	let delimiter = 0;
	const runs = /`+/g;
	let match: RegExpExecArray | null;
	while ((match = runs.exec(prefix))) {
		if (escapedAt(state, line.from + match.index)) continue;
		if (!delimiter) delimiter = match[0].length;
		else if (delimiter === match[0].length) delimiter = 0;
	}
	return delimiter > 0;
}

export function insertMarkdownNewline(view: EditorView): boolean {
	if (view.state.readOnly || view.composing || view.state.selection.ranges.length !== 1) return false;
	const { from, to } = view.state.selection.main;
	const fence = fenceAt(view.state, from);
	if (!fence || fenceAt(view.state, to)?.openingLine !== fence.openingLine) return false;
	const line = view.state.doc.lineAt(from);
	const indent = line.number === fence.openingLine ? fence.indent : /^\s*/.exec(view.state.sliceDoc(line.from, from))![0];
	const insert = "\n" + indent;
	view.dispatch({ changes: { from, to, insert }, selection: { anchor: from + insert.length }, userEvent: "input.type" });
	return true;
}

export function markdownInputExtensions(getSettings: () => MarkdownPairingSettings): Extension {
	return [
		// basicSetup already owns closeBrackets; configure it rather than adding a
		// second pairing handler. Read settings per operation so toggles apply live.
		EditorState.languageData.of((state, pos) => {
			const settings = getSettings();
			const brackets = settings.brackets ? ["(", "[", "{", "'", '"'] : [];
			if (settings.markdown && !escapedAt(state, pos) && !fenceAt(state, pos)) {
				const inCode = inlineCodeAt(state, pos);
				if (!inCode) brackets.push("*", "_");
				brackets.push("`");
				if (!state.selection.main.empty && !inCode) brackets.push("~", "=");
			}
			return [{ closeBrackets: { brackets } }];
		}),
		Prec.highest(EditorView.inputHandler.of((view, from, to, text) => {
			if (!getSettings().markdown || view.composing || view.compositionStarted || view.state.readOnly) return false;
			if (text !== "`" || from !== to || view.state.selection.ranges.length !== 1) return false;
			const line = view.state.doc.lineAt(from);
			if (!/^ {0,3}``$/.test(line.text) || from !== line.to) return false;
			if (fenceAt(view.state, from)) return false;
			for (let n = line.number + 1; n <= view.state.doc.lines; n++) {
				if (/^ {0,3}`{3,}\s*$/.test(view.state.doc.line(n).text)) return false;
			}
			const indent = line.text.slice(0, -2);
			view.dispatch({
				changes: { from, insert: "`\n" + indent + "```" },
				selection: { anchor: from + 1 },
				userEvent: "input.type",
			});
			return true;
		})),
	];
}
