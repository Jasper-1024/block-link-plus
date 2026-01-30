import { ViewPlugin, type ViewUpdate } from "@codemirror/view";
import { editorInfoField, editorLivePreviewField } from "obsidian";
import type BlockLinkPlus from "../../main";
import { getEnhancedListScopeManager, isEnhancedListEnabledFile } from "./enable-scope";

export const BLP_HIDE_NATIVE_FOLD_INDICATOR_CLASS = "blp-enhanced-list-hide-native-fold-indicator";

function getViewFilePath(view: any, infoField: typeof editorInfoField): string | null {
	try {
		const info = view.state.field(infoField, false);
		return info?.file?.path ?? null;
	} catch {
		return null;
	}
}

function getViewLivePreview(view: any, livePreviewField: typeof editorLivePreviewField): boolean | null {
	try {
		const v = view.state.field?.(livePreviewField, false);
		return v === true ? true : v === false ? false : null;
	} catch {
		return null;
	}
}

function shouldHideNativeFoldIndicator(
	view: any,
	plugin: BlockLinkPlus,
	infoField: typeof editorInfoField,
	livePreviewField: typeof editorLivePreviewField
): boolean {
	if (plugin.settings.enhancedListHideNativeFoldIndicator === false) return false;

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

export function createEnhancedListHideNativeFoldIndicatorExtension(
	plugin: BlockLinkPlus,
	fields: { infoField?: typeof editorInfoField; livePreviewField?: typeof editorLivePreviewField } = {}
) {
	const infoField = fields.infoField ?? editorInfoField;
	const livePreviewField = fields.livePreviewField ?? editorLivePreviewField;

	return ViewPlugin.fromClass(
		class {
			private view: any;
			private unsubscribe: (() => void) | null = null;
			private didFirstUpdate = false;
			private lastFilePath: string | null = null;
			private lastLivePreview: boolean | null = null;
			private scheduled: number | null = null;

			constructor(view: any) {
				this.view = view;
				this.unsubscribe = getEnhancedListScopeManager(plugin).onChange(() => this.refresh());
				this.lastFilePath = getViewFilePath(view, infoField);
				this.lastLivePreview = getViewLivePreview(view, livePreviewField);
				this.refresh();
				// Obsidian/CM can still mutate editor state during initial mount; re-apply once after mount.
				this.scheduleRefresh();
			}

			update(update: ViewUpdate) {
				const filePath = getViewFilePath(update.view, infoField);
				const livePreview = getViewLivePreview(update.view, livePreviewField);
				const changed = filePath !== this.lastFilePath || livePreview !== this.lastLivePreview;

				// Obsidian may mutate the editor info field in-place; don't rely on startState vs state.
				// Refresh once on first update, and whenever file / Live Preview changes afterward.
				if (!this.didFirstUpdate) {
					this.didFirstUpdate = true;
					this.lastFilePath = filePath;
					this.lastLivePreview = livePreview;
					this.refresh();
					return;
				}

				if (changed) {
					this.lastFilePath = filePath;
					this.lastLivePreview = livePreview;
					this.refresh();
				}

				// Obsidian may mutate editor info state out-of-band; re-check once after the
				// update cycle so scoped classes self-heal without requiring another CM update.
				this.scheduleRefresh();
			}

			destroy() {
				this.unsubscribe?.();
				this.unsubscribe = null;
				if (this.scheduled !== null) {
					clearTimeout(this.scheduled);
					this.scheduled = null;
				}
				this.view?.dom?.classList?.remove(BLP_HIDE_NATIVE_FOLD_INDICATOR_CLASS);
			}

			private refresh() {
				const next = shouldHideNativeFoldIndicator(this.view, plugin, infoField, livePreviewField);
				this.view.dom.classList.toggle(BLP_HIDE_NATIVE_FOLD_INDICATOR_CLASS, next);
			}

			private scheduleRefresh() {
				if (this.scheduled !== null) return;
				this.scheduled = window.setTimeout(() => {
					this.scheduled = null;
					this.refresh();
				}, 0);
			}
		}
	);
}
