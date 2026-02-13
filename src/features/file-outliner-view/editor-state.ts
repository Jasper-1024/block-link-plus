import { EditorState, Prec } from "@codemirror/state";
import { EditorView, keymap } from "@codemirror/view";
import { basicSetup } from "@codemirror/basic-setup";

import { isPlainTextPasteShortcut } from "./editor-shortcuts";
import type { ArrowNavDirection } from "./arrow-navigation";

export type OutlinerEditorStateHost = {
	isSyncSuppressed: () => boolean;
	isArrowNavDispatching: () => boolean;
	shouldPreserveArrowNavGoalOnce: () => boolean;

	onResetArrowNavGoalColumn: () => void;
	onPlainTextPasteShortcut: () => void;

	onDocChanged: (nextText: string) => void;
	onMaybeTriggerSuggest: () => void;
	onPaste: (evt: ClipboardEvent) => boolean;

	onToggleTask: () => boolean;
	onToggleTaskMarker: () => boolean;
	onArrowNavigate: (dir: ArrowNavDirection, editor: EditorView) => boolean;
	onEnter: () => boolean;
	onSoftEnter: (editor: EditorView) => boolean;
	onTab: (shift: boolean) => boolean;
	onBackspace: () => boolean;
	onDelete: () => boolean;
};

export function createOutlinerEditorState(
	doc: string,
	sel: { cursorStart: number; cursorEnd: number },
	host: OutlinerEditorStateHost
): EditorState {
	const clamp = (n: number) => Math.max(0, Math.min(doc.length, Math.floor(n)));
	const anchor = clamp(sel.cursorStart);
	const head = clamp(sel.cursorEnd);

	return EditorState.create({
		doc,
		selection: { anchor, head },
		extensions: [
			basicSetup,
			EditorView.lineWrapping,
			EditorView.theme({
				"&": {
					font: "inherit",
				},
				".cm-scroller": {
					font: "inherit",
					lineHeight: "inherit",
				},
			}),
			Prec.high(
				keymap.of([
					{
						key: "Mod-Enter",
						run: () => host.onToggleTask(),
					},
					{
						key: "Mod-Shift-Enter",
						run: () => host.onToggleTaskMarker(),
					},
					{
						key: "ArrowUp",
						run: (view) => host.onArrowNavigate("up", view),
					},
					{
						key: "ArrowDown",
						run: (view) => host.onArrowNavigate("down", view),
					},
					{
						key: "Shift-Enter",
						run: (view) => host.onSoftEnter(view),
					},
					{
						key: "Enter",
						run: () => host.onEnter(),
					},
					{
						key: "Tab",
						run: () => host.onTab(false),
					},
					{
						key: "Shift-Tab",
						run: () => host.onTab(true),
					},
					{
						key: "Backspace",
						run: () => host.onBackspace(),
					},
					{
						key: "Delete",
						run: () => host.onDelete(),
					},
				])
			),
			EditorView.updateListener.of((update) => {
				if (host.isSyncSuppressed()) return;

				if (update.docChanged) {
					host.onDocChanged(update.state.doc.toString());
					host.onMaybeTriggerSuggest();
				}

				// Keep ArrowUp/Down "goal column" stable across real vertical navigation, but reset it
				// whenever selection changes through other means (mouse click, programmatic dispatch, etc.).
				if (
					update.selectionSet &&
					!host.isArrowNavDispatching() &&
					!host.shouldPreserveArrowNavGoalOnce()
				) {
					host.onResetArrowNavGoalColumn();
				}
			}),
			EditorView.domEventHandlers({
				keydown: (evt) => {
					if (isPlainTextPasteShortcut(evt)) host.onPlainTextPasteShortcut();

					const key = String((evt as any)?.key ?? "");
					const isPlainArrow =
						(key === "ArrowUp" || key === "ArrowDown") &&
						!Boolean((evt as any)?.shiftKey) &&
						!Boolean((evt as any)?.ctrlKey) &&
						!Boolean((evt as any)?.metaKey) &&
						!Boolean((evt as any)?.altKey);
					if (!isPlainArrow) host.onResetArrowNavGoalColumn();

					return false;
				},
				pointerdown: () => {
					host.onResetArrowNavGoalColumn();
					return false;
				},
				paste: (evt) => host.onPaste(evt),
			}),
		],
	});
}
