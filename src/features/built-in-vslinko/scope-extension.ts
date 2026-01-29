import { ViewPlugin, type ViewUpdate } from "@codemirror/view";
import { editorInfoField, editorLivePreviewField } from "obsidian";
import type BlockLinkPlus from "../../main";
import { getEnhancedListScopeManager, isEnhancedListEnabledFile } from "../enhanced-list-blocks/enable-scope";
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
			private unsubscribe: (() => void) | null = null;
			private didFirstUpdate = false;

			constructor(view: any) {
				this.view = view;
				this.unsubscribe = getEnhancedListScopeManager(plugin).onChange(() => this.refresh());
				this.refresh();
				// CM can still mutate the editor DOM during initial mount; re-apply once after mount.
				this.scheduled = window.setTimeout(() => this.refresh(), 0);
			}

			update(_update: ViewUpdate) {
				// Avoid relying on CM mount ordering details; refresh once on first update.
				if (!this.didFirstUpdate) {
					this.didFirstUpdate = true;
					this.refresh();
					return;
				}

				const prevInfo = _update.startState.field(editorInfoField, false);
				const nextInfo = _update.state.field(editorInfoField, false);
				if (prevInfo?.file !== nextInfo?.file) {
					this.refresh();
					return;
				}

				try {
					const prevLP = _update.startState.field?.(editorLivePreviewField, false);
					const nextLP = _update.state.field?.(editorLivePreviewField, false);
					if (prevLP !== nextLP) {
						this.refresh();
					}
				} catch {
					// Ignore.
				}
			}

			destroy() {
				this.unsubscribe?.();
				this.unsubscribe = null;
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
