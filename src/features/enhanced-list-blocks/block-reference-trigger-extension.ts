import { ViewPlugin, type ViewUpdate } from "@codemirror/view";
import { editorInfoField, editorLivePreviewField } from "obsidian";
import type BlockLinkPlus from "../../main";
import { isEnhancedListEnabledFile } from "./enable-scope";
import { openEnhancedListBlockReferencePicker } from "./block-reference-picker";

let modalOpen = false;

function shouldEnableTrigger(view: any, plugin: BlockLinkPlus): boolean {
	if (plugin.settings.enhancedListDoubleParenTriggerEnabled !== true) {
		return false;
	}

	try {
		if (view.state.field?.(editorLivePreviewField, false) !== true) {
			return false;
		}
	} catch {
		return false;
	}

	const info = view.state.field(editorInfoField, false);
	const file = info?.file;
	if (!file) return false;
	if (!isEnhancedListEnabledFile(plugin, file)) return false;

	return true;
}

function didJustTypeDoubleParen(update: ViewUpdate): { from: number; to: number } | null {
	if (!update.docChanged) return null;
	const head = update.state.selection.main.head;
	if (head < 2) return null;
	if (update.state.doc.sliceString(head - 2, head) !== "((") return null;
	return { from: head - 2, to: head };
}

export function createEnhancedListBlockReferenceTriggerExtension(plugin: BlockLinkPlus) {
	return ViewPlugin.fromClass(
		class {
			private view: any;

			constructor(view: any) {
				this.view = view;
			}

			update(update: ViewUpdate) {
				if (modalOpen) return;
				if (!shouldEnableTrigger(update.view, plugin)) return;

				const range = didJustTypeDoubleParen(update);
				if (!range) return;

				modalOpen = true;
				// Defer modal open so we don't re-enter CM update logic.
				setTimeout(() => {
					openEnhancedListBlockReferencePicker(plugin, {
						view: this.view,
						from: range.from,
						to: range.to,
						embed: false,
						onClose: () => {
							modalOpen = false;
						},
					});
				}, 0);
			}
		}
	);
}
