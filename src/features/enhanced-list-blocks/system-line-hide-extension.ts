import { RangeSetBuilder } from "@codemirror/state";
import { Decoration, ViewPlugin, ViewUpdate } from "@codemirror/view";
import { editorInfoField, editorLivePreviewField } from "obsidian";
import type BlockLinkPlus from "../../main";
import { isEnhancedListEnabledFile } from "./enable-scope";
import { SYSTEM_LINE_MERGED_RE } from "./list-parse";

function buildDecorations(view: any, plugin: BlockLinkPlus) {
	const builder = new RangeSetBuilder<Decoration>();

	if (!plugin.settings.enhancedListHideSystemLine) {
		return builder.finish();
	}

	try {
		if (view.state.field?.(editorLivePreviewField, false) !== true) {
			return builder.finish();
		}
	} catch {
		return builder.finish();
	}

	const info = view.state.field(editorInfoField, false);
	const file = info?.file;
	if (!file) return builder.finish();
	if (!isEnhancedListEnabledFile(plugin, file)) return builder.finish();

	for (const { from, to } of view.visibleRanges) {
		let pos = from;
		while (pos <= to) {
			const line = view.state.doc.lineAt(pos);
			if (SYSTEM_LINE_MERGED_RE.test(line.text)) {
				builder.add(
					line.from,
					line.from,
					Decoration.line({
						class: "blp-enhanced-list-system-line-hidden",
						attributes: { style: "display: none !important;" },
					})
				);
			}
			pos = line.to + 1;
		}
	}

	return builder.finish();
}

export function createEnhancedListSystemLineHideExtension(plugin: BlockLinkPlus) {
	return ViewPlugin.fromClass(
		class {
			decorations: any;
			private lastHideSetting: boolean;

			constructor(view: any) {
				this.decorations = buildDecorations(view, plugin);
				this.lastHideSetting = plugin.settings.enhancedListHideSystemLine;
			}

			update(update: ViewUpdate) {
				const nextHideSetting = plugin.settings.enhancedListHideSystemLine;
				if (nextHideSetting !== this.lastHideSetting || update.docChanged || update.viewportChanged) {
					this.lastHideSetting = nextHideSetting;
					this.decorations = buildDecorations(update.view, plugin);
				}
			}
		},
		{
			decorations: (v) => v.decorations,
		}
	);
}
