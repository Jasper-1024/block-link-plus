import { RangeSetBuilder, StateEffect, StateField } from "@codemirror/state";
import { Decoration, ViewPlugin, ViewUpdate, WidgetType } from "@codemirror/view";
import { editorInfoField, editorLivePreviewField } from "obsidian";
import type BlockLinkPlus from "../../../main";
import { isEnhancedListEnabledFile } from "../enable-scope";

export type EnhancedListZoomRange = { from: number; to: number };

const setZoomEffect = StateEffect.define<EnhancedListZoomRange | null>();

const zoomField = StateField.define<EnhancedListZoomRange | null>({
	create() {
		return null;
	},
	update(value, tr) {
		for (const e of tr.effects) {
			if (e.is(setZoomEffect)) return e.value;
		}
		if (!value) return value;

		return {
			from: tr.changes.mapPos(value.from, 1),
			to: tr.changes.mapPos(value.to, -1),
		};
	},
});

class HiddenBlockWidget extends WidgetType {
	toDOM() {
		const el = document.createElement("div");
		el.style.display = "none";
		return el;
	}
	ignoreEvent() {
		return true;
	}
}

function isThirdPartyPluginEnabled(plugin: BlockLinkPlus, pluginId: string): boolean {
	try {
		return Boolean((plugin.app as any)?.plugins?.enabledPlugins?.has?.(pluginId));
	} catch {
		return false;
	}
}

function buildZoomDecorations(view: any, plugin: BlockLinkPlus) {
	const builder = new RangeSetBuilder<Decoration>();

	// Live Preview only.
	try {
		if (view.state.field?.(editorLivePreviewField, false) !== true) return builder.finish();
	} catch {
		return builder.finish();
	}

	if (!plugin.settings.enhancedListOpsZoom) return builder.finish();
	if (isThirdPartyPluginEnabled(plugin, "obsidian-zoom")) return builder.finish();

	const info = view.state.field(editorInfoField, false);
	const file = info?.file;
	if (!file) return builder.finish();
	if (!isEnhancedListEnabledFile(plugin, file)) return builder.finish();

	const zoom = view.state.field(zoomField, false) as EnhancedListZoomRange | null;
	if (!zoom) return builder.finish();

	const doc = view.state.doc;
	const docLength = doc.length;
	const from = Math.max(0, Math.min(docLength, zoom.from));
	const to = Math.max(from, Math.min(docLength, zoom.to));

	let hideBottomFrom = to;
	if (hideBottomFrom < docLength) {
		// Keep a trailing newline visible when possible so the cursor can sit at the end boundary.
		const nextChar = doc.sliceString(hideBottomFrom, hideBottomFrom + 1);
		if (nextChar === "\n") hideBottomFrom = Math.min(docLength, hideBottomFrom + 1);
	}

	const hiddenWidget = new HiddenBlockWidget();

	if (from > 0) {
		builder.add(0, from, Decoration.replace({ widget: hiddenWidget, block: true }));
	}
	if (hideBottomFrom < docLength) {
		builder.add(hideBottomFrom, docLength, Decoration.replace({ widget: hiddenWidget, block: true }));
	}

	return builder.finish();
}

export function setEnhancedListZoom(view: any, range: EnhancedListZoomRange | null) {
	view.dispatch({ effects: setZoomEffect.of(range) });
}

export function clearEnhancedListZoom(view: any) {
	view.dispatch({ effects: setZoomEffect.of(null) });
}

export function computeEnhancedListZoomRange(doc: any, startLine: number, endLine: number): EnhancedListZoomRange {
	const safeStartLine = Math.max(0, startLine);
	const safeEndLine = Math.max(safeStartLine, endLine);

	const startNum = Math.min(doc.lines, safeStartLine + 1);
	const endNum = Math.min(doc.lines, safeEndLine + 1);

	return {
		from: doc.line(startNum).from,
		to: doc.line(endNum).to,
	};
}

export function createEnhancedListZoomExtension(plugin: BlockLinkPlus) {
	return [
		zoomField,
		ViewPlugin.fromClass(
			class {
				decorations: any;

				private lastZoomEnabled = false;
				private lastHasConflict = false;
				private lastFilePath: string | null = null;

				constructor(view: any) {
					this.decorations = buildZoomDecorations(view, plugin);
					this.captureGate(view);
				}

				private captureGate(view: any) {
					this.lastZoomEnabled = Boolean(plugin.settings.enhancedListOpsZoom);
					this.lastHasConflict = isThirdPartyPluginEnabled(plugin, "obsidian-zoom");
					try {
						const info = view.state.field(editorInfoField, false);
						this.lastFilePath = info?.file?.path ?? null;
					} catch {
						this.lastFilePath = null;
					}
				}

				update(update: ViewUpdate) {
					const zoomChanged =
						update.startState.field(zoomField, false) !== update.state.field(zoomField, false);

					const zoomEnabled = Boolean(plugin.settings.enhancedListOpsZoom);
					const hasConflict = isThirdPartyPluginEnabled(plugin, "obsidian-zoom");

					let filePath: string | null = null;
					try {
						const info = update.state.field(editorInfoField, false);
						filePath = info?.file?.path ?? null;
					} catch {
						filePath = null;
					}

					const gateChanged =
						zoomEnabled !== this.lastZoomEnabled ||
						hasConflict !== this.lastHasConflict ||
						filePath !== this.lastFilePath;

					if (update.docChanged || update.viewportChanged || update.selectionSet || zoomChanged || gateChanged) {
						this.decorations = buildZoomDecorations(update.view, plugin);
						this.captureGate(update.view);
					}
				}
			},
			{
				decorations: (v) => v.decorations,
			}
		),
	];
}
