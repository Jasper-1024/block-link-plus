import { ViewPlugin, type ViewUpdate } from "@codemirror/view";
import { editorInfoField, editorLivePreviewField } from "obsidian";
import type BlockLinkPlus from "../../main";
import { isEnhancedListEnabledFile } from "../enhanced-list-blocks/enable-scope";
import { BLP_VSLINKO_SCOPE_CLASS } from "../../vendor/vslinko/blp-scope";

function isBuiltInVslinkoEnabled(plugin: BlockLinkPlus): boolean {
	return Boolean(plugin.settings.builtInObsidianOutlinerEnabled || plugin.settings.builtInObsidianZoomEnabled);
}

function shouldApplyScopeClass(view: any, plugin: BlockLinkPlus): boolean {
	if (!isBuiltInVslinkoEnabled(plugin)) return false;

	const info = view.state.field(editorInfoField, false);
	const file = info?.file;
	if (!file) return false;

	// Default behavior (opt-out): vendored modules apply everywhere.
	if (!plugin.settings.builtInVslinkoScopeToEnhancedList) return true;

	// Scoped mode: only in Enhanced List enabled files + Live Preview.
	try {
		if (view.state.field?.(editorLivePreviewField, false) !== true) {
			return false;
		}
	} catch {
		return false;
	}

	return isEnhancedListEnabledFile(plugin, file);
}

export function createBuiltInVslinkoScopeExtension(plugin: BlockLinkPlus) {
	return ViewPlugin.fromClass(
		class {
			private view: any;
			private scheduled: number | null = null;

			constructor(view: any) {
				this.view = view;
				this.refresh();
				// CM can still mutate the editor DOM during initial mount; re-apply once after mount.
				this.scheduled = window.setTimeout(() => this.refresh(), 0);
			}

			update(_update: ViewUpdate) {
				this.refresh();
			}

			destroy() {
				if (this.scheduled !== null) {
					clearTimeout(this.scheduled);
					this.scheduled = null;
				}
				this.view?.dom?.classList?.remove(BLP_VSLINKO_SCOPE_CLASS);
			}

			private refresh() {
				const next = shouldApplyScopeClass(this.view, plugin);
				this.view.dom.classList.toggle(BLP_VSLINKO_SCOPE_CLASS, next);
			}
		}
	);
}
