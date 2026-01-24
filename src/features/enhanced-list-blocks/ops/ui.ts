import { RangeSetBuilder } from "@codemirror/state";
import { Decoration, ViewPlugin, ViewUpdate } from "@codemirror/view";
import { editorInfoField, editorLivePreviewField } from "obsidian";
import type BlockLinkPlus from "../../../main";
import { isEnhancedListEnabledFile } from "../enable-scope";
import { resolveListSubtreeForLine } from "./list-subtree";

function isThirdPartyPluginEnabled(plugin: BlockLinkPlus, pluginId: string): boolean {
	try {
		return Boolean((plugin.app as any)?.plugins?.enabledPlugins?.has?.(pluginId));
	} catch {
		return false;
	}
}

function applyRootClasses(view: any, plugin: BlockLinkPlus) {
	const el: HTMLElement | null = view?.dom ?? null;
	if (!el) return;

	const isLivePreview = (() => {
		try {
			return view.state.field?.(editorLivePreviewField, false) === true;
		} catch {
			return false;
		}
	})();

	let file: any = null;
	try {
		const info = view.state.field(editorInfoField, false);
		file = info?.file ?? null;
	} catch {
		file = null;
	}

	const enabledFile = Boolean(file && isEnhancedListEnabledFile(plugin, file));
	const outlinerConflict = isThirdPartyPluginEnabled(plugin, "obsidian-outliner");

	const verticalLinesEnabled = Boolean(
		isLivePreview && enabledFile && plugin.settings.enhancedListOpsVerticalLines && !outlinerConflict
	);
	const bulletThreadingEnabled = Boolean(
		isLivePreview && enabledFile && plugin.settings.enhancedListOpsBulletThreading && !outlinerConflict
	);

	el.classList.toggle("blp-enhanced-list-vertical-lines", verticalLinesEnabled);
	el.classList.toggle("blp-enhanced-list-bullet-threading", bulletThreadingEnabled);
}

function buildBulletThreadingDecorations(view: any, plugin: BlockLinkPlus) {
	const builder = new RangeSetBuilder<Decoration>();

	try {
		if (view.state.field?.(editorLivePreviewField, false) !== true) return builder.finish();
	} catch {
		return builder.finish();
	}

	if (!plugin.settings.enhancedListOpsBulletThreading) return builder.finish();
	if (isThirdPartyPluginEnabled(plugin, "obsidian-outliner")) return builder.finish();

	const info = view.state.field(editorInfoField, false);
	const file = info?.file;
	if (!file) return builder.finish();
	if (!isEnhancedListEnabledFile(plugin, file)) return builder.finish();

	const cache = plugin.app.metadataCache.getFileCache(file);
	const listItems = cache?.listItems ?? null;
	if (!listItems || listItems.length === 0) return builder.finish();

	const headPos = view.state.selection.main.head;
	const cursorLine = view.state.doc.lineAt(headPos).number - 1;

	const resolved = resolveListSubtreeForLine(listItems, cursorLine);
	if (!resolved) return builder.finish();

	const byStartLine = new Map<number, (typeof listItems)[number]>();
	for (const item of listItems) {
		byStartLine.set(item.position.start.line, item);
	}

	const activeLine = resolved.item.position.start.line;
	const ancestorLines: number[] = [];

	let cur = resolved.item;
	while (cur.parent >= 0) {
		const parent = byStartLine.get(cur.parent);
		if (!parent) break;
		ancestorLines.push(parent.position.start.line);
		cur = parent;
	}

	const activeDocLine = view.state.doc.line(activeLine + 1);
	builder.add(
		activeDocLine.from,
		activeDocLine.from,
		Decoration.line({ class: "blp-enhanced-list-threading-active" })
	);

	for (const lineNo of ancestorLines) {
		const l = view.state.doc.line(lineNo + 1);
		builder.add(l.from, l.from, Decoration.line({ class: "blp-enhanced-list-threading-ancestor" }));
	}

	return builder.finish();
}

export function createEnhancedListOpsUiExtension(plugin: BlockLinkPlus) {
	return ViewPlugin.fromClass(
		class {
			decorations: any;

			private lastVerticalLines = false;
			private lastBulletThreading = false;
			private lastOutlinerConflict = false;
			private lastFilePath: string | null = null;

			constructor(view: any) {
				this.decorations = buildBulletThreadingDecorations(view, plugin);
				applyRootClasses(view, plugin);
				this.captureGate(view);
			}

			private captureGate(view: any) {
				this.lastVerticalLines = Boolean(plugin.settings.enhancedListOpsVerticalLines);
				this.lastBulletThreading = Boolean(plugin.settings.enhancedListOpsBulletThreading);
				this.lastOutlinerConflict = isThirdPartyPluginEnabled(plugin, "obsidian-outliner");
				try {
					const info = view.state.field(editorInfoField, false);
					this.lastFilePath = info?.file?.path ?? null;
				} catch {
					this.lastFilePath = null;
				}
			}

			update(update: ViewUpdate) {
				const verticalLines = Boolean(plugin.settings.enhancedListOpsVerticalLines);
				const bulletThreading = Boolean(plugin.settings.enhancedListOpsBulletThreading);
				const outlinerConflict = isThirdPartyPluginEnabled(plugin, "obsidian-outliner");

				let filePath: string | null = null;
				try {
					const info = update.state.field(editorInfoField, false);
					filePath = info?.file?.path ?? null;
				} catch {
					filePath = null;
				}

				const gateChanged =
					verticalLines !== this.lastVerticalLines ||
					bulletThreading !== this.lastBulletThreading ||
					outlinerConflict !== this.lastOutlinerConflict ||
					filePath !== this.lastFilePath;

				if (gateChanged || update.docChanged || update.selectionSet || update.viewportChanged) {
					applyRootClasses(update.view, plugin);
					this.decorations = buildBulletThreadingDecorations(update.view, plugin);
					this.captureGate(update.view);
				}
			}
		},
		{
			decorations: (v) => v.decorations,
		}
	);
}

