import { StateEffect, StateField } from "@codemirror/state";
import { RangeSetBuilder } from "@codemirror/state";
import { Decoration, type DecorationSet, EditorView, ViewPlugin, type ViewUpdate, keymap } from "@codemirror/view";
import { editorInfoField, editorLivePreviewField } from "obsidian";
import type BlockLinkPlus from "../../main";
import { isEnhancedListEnabledFile } from "./enable-scope";
import { FENCE_LINE_REGEX, LIST_ITEM_PREFIX_RE, escapeRegex } from "./list-parse";

const SELECTED_BLOCK_CLASS = "blp-enhanced-list-block-selected";

type BlockSelectionState = {
	anchorPos: number | null;
	selectedStartPos: number[]; // sorted, unique, line.from positions
};

type BlockSelectionEffect =
	| { kind: "clear" }
	| { kind: "click"; pos: number; shiftKey: boolean };

const blockSelectionEffect = StateEffect.define<BlockSelectionEffect>();

function clampPos(pos: number, docLen: number): number {
	if (!Number.isFinite(pos)) return 0;
	return Math.max(0, Math.min(docLen, Math.floor(pos)));
}

function normalizePosToListStart(doc: any, pos: number): number | null {
	const p = clampPos(pos, doc.length);
	const line = doc.lineAt(p);
	if (!LIST_ITEM_PREFIX_RE.test(line.text)) return null;
	return line.from;
}

function buildFenceStateMap(doc: any): boolean[] {
	const inFenceByLine: boolean[] = new Array(Math.max(0, doc.lines) + 1).fill(false);

	let inFence = false;
	let fenceChar = "";
	let fenceLen = 0;
	let openedAtLineNo = 0;

	for (let ln = 1; ln <= doc.lines; ln++) {
		const text = doc.line(ln).text ?? "";

		if (!inFence) {
			const m = text.match(FENCE_LINE_REGEX);
			if (m) {
				inFence = true;
				fenceChar = (m[2] ?? "")[0] ?? "";
				fenceLen = (m[2] ?? "").length;
				openedAtLineNo = ln;
			}
		}

		inFenceByLine[ln] = inFence;

		if (inFence) {
			const closeRe = new RegExp(`^\\s*${escapeRegex(fenceChar)}{${fenceLen},}\\s*$`);
			if (fenceChar && fenceLen >= 3 && ln !== openedAtLineNo && closeRe.test(text)) {
				inFence = false;
				fenceChar = "";
				fenceLen = 0;
				openedAtLineNo = 0;
			}
		}
	}

	return inFenceByLine;
}

function collectListStartPositionsBetween(doc: any, anchorPos: number, clickPos: number): number[] {
	const aLine = doc.lineAt(anchorPos).number;
	const bLine = doc.lineAt(clickPos).number;
	const startLine = Math.min(aLine, bLine);
	const endLine = Math.max(aLine, bLine);

	const fenceMap = buildFenceStateMap(doc);

	const out: number[] = [];
	for (let ln = startLine; ln <= endLine; ln++) {
		if (fenceMap[ln]) continue;
		const line = doc.line(ln);
		if (LIST_ITEM_PREFIX_RE.test(line.text)) {
			out.push(line.from);
		}
	}

	// Ensure uniqueness + stable order.
	return [...new Set(out)].sort((x, y) => x - y);
}

function mapSelectionState(value: BlockSelectionState, tr: any): BlockSelectionState {
	const doc = tr.state.doc;
	const selected = new Set<number>();

	for (const pos of value.selectedStartPos) {
		const mapped = clampPos(tr.changes.mapPos(pos, 1), doc.length);
		const normalized = normalizePosToListStart(doc, mapped);
		if (normalized != null) selected.add(normalized);
	}

	let anchorPos: number | null = null;
	if (value.anchorPos != null) {
		const mapped = clampPos(tr.changes.mapPos(value.anchorPos, 1), doc.length);
		anchorPos = normalizePosToListStart(doc, mapped);
	}

	const selectedStartPos = [...selected].sort((a, b) => a - b);
	if (anchorPos == null && selectedStartPos.length > 0) {
		anchorPos = selectedStartPos[0];
	}

	return { anchorPos, selectedStartPos };
}

export const enhancedListBlockSelectionStateField = StateField.define<BlockSelectionState>({
	create() {
		return { anchorPos: null, selectedStartPos: [] };
	},
	update(value, tr) {
		let next = value;

		if (tr.docChanged && (next.anchorPos != null || next.selectedStartPos.length > 0)) {
			next = mapSelectionState(next, tr);
		}

		for (const e of tr.effects) {
			if (!e.is(blockSelectionEffect)) continue;
			const payload = e.value;

			if (payload.kind === "clear") {
				next = { anchorPos: null, selectedStartPos: [] };
				continue;
			}

			const clickPos = normalizePosToListStart(tr.state.doc, payload.pos);
			if (clickPos == null) continue;

			// Plain click selects exactly one block and becomes the shift-range anchor.
			if (!payload.shiftKey || next.anchorPos == null) {
				next = { anchorPos: clickPos, selectedStartPos: [clickPos] };
				continue;
			}

			// Shift-click selects a contiguous range of blocks (document order).
			const selectedStartPos = collectListStartPositionsBetween(tr.state.doc, next.anchorPos, clickPos);
			next = { anchorPos: next.anchorPos, selectedStartPos };
		}

		return next;
	},
});

function shouldShowBlockSelection(
	view: any,
	plugin: BlockLinkPlus,
	infoField: typeof editorInfoField,
	livePreviewField: typeof editorLivePreviewField
): boolean {
	if (!plugin.settings.enhancedListHandleActions) return false;
	if (plugin.settings.enhancedListHandleClickAction !== "select-block") return false;

	try {
		if (view.state.field?.(livePreviewField, false) !== true) {
			return false;
		}
	} catch {
		return false;
	}

	const info = view.state.field(infoField, false);
	const file = info?.file;
	if (!file) return false;

	return isEnhancedListEnabledFile(plugin, file);
}

function buildDecorations(
	view: any,
	plugin: BlockLinkPlus,
	infoField: typeof editorInfoField,
	livePreviewField: typeof editorLivePreviewField
): DecorationSet {
	if (!shouldShowBlockSelection(view, plugin, infoField, livePreviewField)) return Decoration.none;

	const state = view.state.field(enhancedListBlockSelectionStateField, false) as BlockSelectionState | undefined;
	if (!state || state.selectedStartPos.length === 0) return Decoration.none;

	const builder = new RangeSetBuilder<Decoration>();
	const deco = Decoration.line({ class: SELECTED_BLOCK_CLASS });

	for (const pos of state.selectedStartPos) {
		try {
			const line = view.state.doc.lineAt(pos);
			builder.add(line.from, line.from, deco);
		} catch {
			// ignore
		}
	}

	return builder.finish();
}

export function clearEnhancedListBlockSelection(view: EditorView) {
	view.dispatch({ effects: [blockSelectionEffect.of({ kind: "clear" })] });
}

export function dispatchEnhancedListBlockSelectionClick(
	view: EditorView,
	args: { line: number; shiftKey: boolean }
) {
	const lineNo = args.line + 1;
	if (lineNo < 1 || lineNo > view.state.doc.lines) return;
	const pos = view.state.doc.line(lineNo).from;
	view.dispatch({ effects: [blockSelectionEffect.of({ kind: "click", pos, shiftKey: args.shiftKey })] });
}

export function createEnhancedListBlockSelectionExtension(
	plugin: BlockLinkPlus,
	fields: { infoField?: typeof editorInfoField; livePreviewField?: typeof editorLivePreviewField } = {}
) {
	const infoField = fields.infoField ?? editorInfoField;
	const livePreviewField = fields.livePreviewField ?? editorLivePreviewField;

	const escapeKey = keymap.of([
		{
			key: "Escape",
			run: (view) => {
				const st = view.state.field(enhancedListBlockSelectionStateField, false) as
					| BlockSelectionState
					| undefined;
				if (!st || st.selectedStartPos.length === 0) return false;
				if (!shouldShowBlockSelection(view, plugin, infoField, livePreviewField)) return false;
				clearEnhancedListBlockSelection(view);
				return true;
			},
		},
	]);

	const decorations = ViewPlugin.fromClass(
		class {
			decorations: DecorationSet;
			private lastKey = "";

			constructor(view: any) {
				this.decorations = buildDecorations(view, plugin, infoField, livePreviewField);
				this.lastKey = this.selectionKey(view);
			}

			update(update: ViewUpdate) {
				const nextKey = this.selectionKey(update.view);
				if (update.docChanged || update.viewportChanged || update.selectionSet || nextKey !== this.lastKey) {
					this.lastKey = nextKey;
					this.decorations = buildDecorations(update.view, plugin, infoField, livePreviewField);
				}
			}

			private selectionKey(view: any): string {
				if (!shouldShowBlockSelection(view, plugin, infoField, livePreviewField)) return "";
				const st = view.state.field(enhancedListBlockSelectionStateField, false) as
					| BlockSelectionState
					| undefined;
				if (!st || st.selectedStartPos.length === 0) return "";
				return st.anchorPos + ":" + st.selectedStartPos.join(",");
			}
		},
		{
			decorations: (v) => v.decorations,
		}
	);

	return [enhancedListBlockSelectionStateField, escapeKey, decorations];
}
