import { ViewPlugin, type ViewUpdate } from "@codemirror/view";
import { editorInfoField, editorLivePreviewField } from "obsidian";
import type BlockLinkPlus from "../../main";
import { isEnhancedListEnabledFile } from "./enable-scope";

export const BLP_HIDE_NATIVE_FOLD_INDICATOR_CLASS = "blp-enhanced-list-hide-native-fold-indicator";

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

			constructor(view: any) {
				this.view = view;
				this.refresh();
			}

			update(_update: ViewUpdate) {
				this.refresh();
			}

			destroy() {
				this.view?.dom?.classList?.remove(BLP_HIDE_NATIVE_FOLD_INDICATOR_CLASS);
			}

			private refresh() {
				const next = shouldHideNativeFoldIndicator(this.view, plugin, infoField, livePreviewField);
				this.view.dom.classList.toggle(BLP_HIDE_NATIVE_FOLD_INDICATOR_CLASS, next);
			}
		}
	);
}

