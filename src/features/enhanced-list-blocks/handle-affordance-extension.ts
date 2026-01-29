import { ViewPlugin, type ViewUpdate } from "@codemirror/view";
import { editorInfoField, editorLivePreviewField } from "obsidian";
import type BlockLinkPlus from "../../main";
import { getEnhancedListScopeManager, isEnhancedListEnabledFile } from "./enable-scope";

const HANDLE_CLASS = "blp-enhanced-list-handle";

function shouldEnableHandle(
	view: any,
	plugin: BlockLinkPlus,
	infoField: typeof editorInfoField,
	livePreviewField: typeof editorLivePreviewField
): boolean {
	if (!plugin.settings.enhancedListHandleAffordance) return false;

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

export function createEnhancedListHandleAffordanceExtension(
	plugin: BlockLinkPlus,
	fields: {
		infoField?: typeof editorInfoField;
		livePreviewField?: typeof editorLivePreviewField;
	} = {}
) {
	const infoField = fields.infoField ?? editorInfoField;
	const livePreviewField = fields.livePreviewField ?? editorLivePreviewField;

	return ViewPlugin.fromClass(
		class {
			private view: any;
			private isActive = false;
			private unsubscribe: (() => void) | null = null;
			private didFirstUpdate = false;

			constructor(view: any) {
				this.view = view;
				this.unsubscribe = getEnhancedListScopeManager(plugin).onChange(() => this.refresh());
				this.refresh();
			}

			update(update: ViewUpdate) {
				// CM can still mutate editor DOM during initial mount; re-apply once on first update.
				if (!this.didFirstUpdate) {
					this.didFirstUpdate = true;
					this.refresh();
					return;
				}

				const prevInfo = update.startState.field(infoField, false);
				const nextInfo = update.state.field(infoField, false);
				if (prevInfo?.file !== nextInfo?.file) {
					this.refresh();
					return;
				}

				try {
					const prevLP = update.startState.field?.(livePreviewField, false);
					const nextLP = update.state.field?.(livePreviewField, false);
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
				this.view?.dom?.classList?.remove(HANDLE_CLASS);
			}

			private refresh() {
				const next = shouldEnableHandle(this.view, plugin, infoField, livePreviewField);
				this.isActive = next;
				this.view.dom.classList.toggle(HANDLE_CLASS, next);
			}
		}
	);
}
