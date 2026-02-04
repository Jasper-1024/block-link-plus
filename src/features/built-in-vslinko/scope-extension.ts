import { ViewPlugin, type ViewUpdate } from "@codemirror/view";
import { editorInfoField, editorLivePreviewField } from "obsidian";
import type BlockLinkPlus from "../../main";
import { getFileOutlinerScopeManager, isFileOutlinerEnabledFile } from "../file-outliner-view/enable-scope";
import { BLP_VSLINKO_SCOPE_CLASS } from "../../vendor/vslinko/blp-scope";

function isBuiltInVslinkoEnabled(plugin: BlockLinkPlus): boolean {
	return Boolean(plugin.settings.builtInObsidianOutlinerEnabled || plugin.settings.builtInObsidianZoomEnabled);
}

function getViewFilePath(view: any): string | null {
	try {
		const info = view.state.field(editorInfoField, false);
		return info?.file?.path ?? null;
	} catch {
		return null;
	}
}

function getViewLivePreview(view: any): boolean | null {
	try {
		const v = view.state.field?.(editorLivePreviewField, false);
		return v === true ? true : v === false ? false : null;
	} catch {
		return null;
	}
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

	return isFileOutlinerEnabledFile(plugin, file);
}

export function createBuiltInVslinkoScopeExtension(plugin: BlockLinkPlus) {
	return ViewPlugin.fromClass(
		class {
			private view: any;
			private scheduled: number | null = null;
			private unsubscribe: (() => void) | null = null;
			private didFirstUpdate = false;
			private lastFilePath: string | null = null;
			private lastLivePreview: boolean | null = null;

			constructor(view: any) {
				this.view = view;
				this.unsubscribe = getFileOutlinerScopeManager(plugin).onChange(() => this.refresh());
				this.lastFilePath = getViewFilePath(view);
				this.lastLivePreview = getViewLivePreview(view);
				this.refresh();
				// Obsidian/CM can still mutate the editor state/DOM during initial mount.
				// Re-apply once after mount to avoid missing scoped classes.
				this.scheduleRefresh();
			}

			update(update: ViewUpdate) {
				const filePath = getViewFilePath(update.view);
				const livePreview = getViewLivePreview(update.view);
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
				this.view?.dom?.classList?.remove(BLP_VSLINKO_SCOPE_CLASS);
			}

			private refresh() {
				const next = shouldApplyScopeClass(this.view, plugin);
				this.view.dom.classList.toggle(BLP_VSLINKO_SCOPE_CLASS, next);
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
