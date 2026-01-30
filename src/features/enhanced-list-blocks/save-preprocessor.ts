import { MarkdownView, TextFileView, type TFile } from "obsidian";
import { around } from "monkey-around";
import type BlockLinkPlus from "../../main";
import { isEnhancedListEnabledFile } from "./enable-scope";
import { clearEnhancedListDirtyRanges, consumeEnhancedListDirtyRanges } from "./normalize-on-save";
import { preprocessEnhancedListContentForSave } from "./save-preprocessor-core";

function isMarkdownViewWithFile(view: any): view is MarkdownView & { file: TFile } {
	const file = view?.file;
	return view instanceof MarkdownView && file && typeof file.path === "string" && String(file.extension ?? "").toLowerCase() === "md";
}

export function registerEnhancedListSavePreprocessor(plugin: BlockLinkPlus): void {
	const proto: any = (TextFileView as any)?.prototype;
	if (!proto) return;

	const uninstaller = around(proto, {
		save(old: any) {
			return async function (this: any, clear?: boolean) {
				if (!isMarkdownViewWithFile(this)) {
					return old.call(this, clear);
				}

				const file = this.file as TFile;
				if (!isEnhancedListEnabledFile(plugin, file)) {
					return old.call(this, clear);
				}

				let content = "";
				try {
					content = typeof this.getViewData === "function" ? String(this.getViewData() ?? "") : "";
				} catch {
					return old.call(this, clear);
				}

				// Always consume dirty ranges to keep memory bounded, even when normalization is disabled.
				const dirtyRanges = consumeEnhancedListDirtyRanges(file.path);
				const next = preprocessEnhancedListContentForSave(content, plugin, { dirtyRanges });

				if (next !== content) {
					// `setViewData()` replaces large document ranges. Other Enhanced List transactionFilters
					// (notably delete-subtree) can misinterpret that as user deletion and corrupt the doc.
					// Guard the apply window so those filters can safely no-op.
					let w: any = null;
					try {
						w = typeof window !== "undefined" ? (window as any) : null;
						if (w) w.__blpSavePreprocessorApplying = (w.__blpSavePreprocessorApplying ?? 0) + 1;
					} catch {
						w = null;
					}

					// Update the editor content before saving so Obsidian writes the final text once,
					// avoiding "file was modified externally" prompts.
					try {
						try {
							this.setViewData(next, false);
						} catch {
							try {
								this.editor?.setValue?.(next);
							} catch {
								// ignore
							}
						}
					} finally {
						try {
							if (w) {
								w.__blpSavePreprocessorApplying = (w.__blpSavePreprocessorApplying ?? 1) - 1;
								if (w.__blpSavePreprocessorApplying <= 0) delete w.__blpSavePreprocessorApplying;
							}
						} catch {
							// ignore
						}
					}

					// Our own pre-save mutations should not count as "user dirty ranges".
					clearEnhancedListDirtyRanges(file.path);
				}

				return old.call(this, clear);
			};
		},
	});

	plugin.register(uninstaller);
}
