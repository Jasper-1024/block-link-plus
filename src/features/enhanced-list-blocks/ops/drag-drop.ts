import { RangeSetBuilder, StateEffect, StateField } from "@codemirror/state";
import { Decoration, ViewPlugin, ViewUpdate, WidgetType } from "@codemirror/view";
import { editorInfoField, editorLivePreviewField } from "obsidian";
import type BlockLinkPlus from "../../../main";
import { isEnhancedListEnabledFile } from "../enable-scope";
import { inferListIndentUnit, resolveListSubtreeForLine } from "./list-subtree";

type DropPlacement = "above" | "below" | "child" | "outdent";

type DropIndicator = {
	targetLine: number;
	placement: DropPlacement;
};

const setDropIndicatorEffect = StateEffect.define<DropIndicator | null>();

const dropIndicatorField = StateField.define<DropIndicator | null>({
	create() {
		return null;
	},
	update(value, tr) {
		for (const e of tr.effects) {
			if (e.is(setDropIndicatorEffect)) return e.value;
		}
		return value;
	},
});

class DragHandleWidget extends WidgetType {
	constructor(private line: number) {
		super();
	}

	toDOM() {
		const el = document.createElement("span");
		el.className = "blp-enhanced-list-drag-handle";
		el.setAttribute("draggable", "true");
		el.setAttribute("data-blp-line", String(this.line));
		el.setAttribute("aria-hidden", "true");
		el.textContent = "⋮⋮";
		return el;
	}

	ignoreEvent() {
		return false;
	}
}

function isThirdPartyPluginEnabled(plugin: BlockLinkPlus, pluginId: string): boolean {
	try {
		return Boolean((plugin.app as any)?.plugins?.enabledPlugins?.has?.(pluginId));
	} catch {
		return false;
	}
}

function getLeadingWhitespace(text: string): string {
	return text.match(/^\s*/)?.[0] ?? "";
}

function countIndentUnits(ws: string, unit: string): { count: number; remainder: string } {
	let count = 0;
	let rest = ws;
	while (unit && rest.startsWith(unit)) {
		count++;
		rest = rest.slice(unit.length);
	}
	return { count, remainder: rest };
}

function adjustIndent(line: string, delta: number, unit: string): string {
	if (delta === 0) return line;
	const ws = getLeadingWhitespace(line);
	const { count, remainder } = countIndentUnits(ws, unit);
	const nextCount = Math.max(0, count + delta);
	const nextWs = unit.repeat(nextCount) + remainder;
	return nextWs + line.slice(ws.length);
}

function computeGroupKey(listItems: any[], startLine: number): number | null {
	const byStart = new Map<number, any>();
	for (const it of listItems) byStart.set(it.position.start.line, it);
	const item = byStart.get(startLine);
	if (!item) return null;

	let cur = item;
	while (cur.parent >= 0) {
		const p = byStart.get(cur.parent);
		if (!p) break;
		cur = p;
	}
	return typeof cur.parent === "number" ? cur.parent : null;
}

function buildDecorations(view: any, plugin: BlockLinkPlus) {
	const builder = new RangeSetBuilder<Decoration>();

	// Live Preview only.
	try {
		if (view.state.field?.(editorLivePreviewField, false) !== true) return builder.finish();
	} catch {
		return builder.finish();
	}

	if (!plugin.settings.enhancedListOpsDragDrop) return builder.finish();
	if (isThirdPartyPluginEnabled(plugin, "obsidian-outliner")) return builder.finish();

	const info = view.state.field(editorInfoField, false);
	const file = info?.file;
	if (!file) return builder.finish();
	if (!isEnhancedListEnabledFile(plugin, file)) return builder.finish();

	// Drag handles (visible ranges only).
	const listMarkerRegex = /^\s*(?:[-*+]|\d+\.)\s+/;
	for (const { from, to } of view.visibleRanges) {
		let pos = from;
		while (pos <= to) {
			const line = view.state.doc.lineAt(pos);
			if (listMarkerRegex.test(line.text)) {
				const lineNo = line.number - 1;
				builder.add(
					line.from,
					line.from,
					Decoration.widget({
						widget: new DragHandleWidget(lineNo),
						side: -1,
					})
				);
			}
			pos = line.to + 1;
		}
	}

	const indicator = view.state.field(dropIndicatorField, false) as DropIndicator | null;
	if (indicator) {
		try {
			const l = view.state.doc.line(indicator.targetLine + 1);
			builder.add(
				l.from,
				l.from,
				Decoration.line({
					class: `blp-enhanced-list-dnd-drop-target blp-enhanced-list-dnd-drop-${indicator.placement}`,
				})
			);
		} catch {
			// ignore
		}
	}

	return builder.finish();
}

export function createEnhancedListDragDropExtension(plugin: BlockLinkPlus) {
	return [
		dropIndicatorField,
		ViewPlugin.fromClass(
			class {
				decorations: any;
				private dragging:
					| {
							filePath: string;
							startLine: number;
							endLine: number;
							groupKey: number | null;
					  }
					| null = null;

				private lastEnabled = false;
				private lastConflict = false;
				private lastFilePath: string | null = null;

				constructor(private view: any) {
					this.decorations = buildDecorations(view, plugin);
					this.captureGate(view);
					this.applyRootClass(view);

					view.dom.addEventListener("dragstart", this.onDragStart, true);
					view.dom.addEventListener("dragover", this.onDragOver, true);
					view.dom.addEventListener("dragleave", this.onDragLeave, true);
					view.dom.addEventListener("drop", this.onDrop, true);
					view.dom.addEventListener("dragend", this.onDragEnd, true);
				}

				destroy() {
					this.view.dom.removeEventListener("dragstart", this.onDragStart, true);
					this.view.dom.removeEventListener("dragover", this.onDragOver, true);
					this.view.dom.removeEventListener("dragleave", this.onDragLeave, true);
					this.view.dom.removeEventListener("drop", this.onDrop, true);
					this.view.dom.removeEventListener("dragend", this.onDragEnd, true);
				}

				private captureGate(view: any) {
					this.lastEnabled = Boolean(plugin.settings.enhancedListOpsDragDrop);
					this.lastConflict = isThirdPartyPluginEnabled(plugin, "obsidian-outliner");
					try {
						const info = view.state.field(editorInfoField, false);
						this.lastFilePath = info?.file?.path ?? null;
					} catch {
						this.lastFilePath = null;
					}
				}

				private gateAllows(view: any): { ok: true; filePath: string } | { ok: false } {
					const enabled = Boolean(plugin.settings.enhancedListOpsDragDrop);
					if (!enabled) return { ok: false };
					if (isThirdPartyPluginEnabled(plugin, "obsidian-outliner")) return { ok: false };

					try {
						if (view.state.field?.(editorLivePreviewField, false) !== true) return { ok: false };
					} catch {
						return { ok: false };
					}

					const info = view.state.field(editorInfoField, false);
					const file = info?.file;
					if (!file) return { ok: false };
					if (!isEnhancedListEnabledFile(plugin, file)) return { ok: false };
					return { ok: true, filePath: file.path };
				}

				private applyRootClass(view: any) {
					const el: HTMLElement | null = view?.dom ?? null;
					if (!el) return;
					const gate = this.gateAllows(view);
					el.classList.toggle("blp-enhanced-list-dnd", gate.ok);
					el.classList.toggle("blp-enhanced-list-dnd-dragging", Boolean(this.dragging) && gate.ok);
				}

				update(update: ViewUpdate) {
					const gate = this.gateAllows(update.view);
					const enabled = Boolean(plugin.settings.enhancedListOpsDragDrop);
					const conflict = isThirdPartyPluginEnabled(plugin, "obsidian-outliner");

					let filePath: string | null = null;
					try {
						const info = update.state.field(editorInfoField, false);
						filePath = info?.file?.path ?? null;
					} catch {
						filePath = null;
					}

					const gateChanged = enabled !== this.lastEnabled || conflict !== this.lastConflict || filePath !== this.lastFilePath;
					const dropChanged =
						update.startState.field(dropIndicatorField, false) !== update.state.field(dropIndicatorField, false);

					if (gateChanged || dropChanged || update.docChanged || update.viewportChanged) {
						this.decorations = buildDecorations(update.view, plugin);
						this.captureGate(update.view);
						this.applyRootClass(update.view);
					}

					// If gating is no longer valid, clear transient drag UI.
					if (!gate.ok && this.dragging) {
						this.dragging = null;
						this.applyRootClass(update.view);
						update.view.dispatch({ effects: setDropIndicatorEffect.of(null) });
					}
				}

				private onDragStart = (evt: DragEvent) => {
					const gate = this.gateAllows(this.view);
					if (!gate.ok) return;

					const target = evt.target as HTMLElement | null;
					const handle = target?.closest?.(".blp-enhanced-list-drag-handle") as HTMLElement | null;
					if (!handle) return;

					const lineStr = handle.getAttribute("data-blp-line");
					const startLine = lineStr ? Number.parseInt(lineStr, 10) : NaN;
					if (!Number.isFinite(startLine)) return;

					const info = this.view.state.field(editorInfoField, false);
					const file = info?.file;
					if (!file) return;

					const cache = plugin.app.metadataCache.getFileCache(file);
					const listItems = cache?.listItems ?? null;
					if (!listItems || listItems.length === 0) return;

					const item = listItems.find((i) => i.position.start.line === startLine);
					if (!item) return;

					const endLine = item.position.end.line;
					const groupKey = computeGroupKey(listItems, startLine);

					this.dragging = {
						filePath: gate.filePath,
						startLine,
						endLine,
						groupKey,
					};

					this.applyRootClass(this.view);

					try {
						evt.dataTransfer?.setData(
							"application/x-blp-enhanced-list-subtree",
							JSON.stringify({ filePath: gate.filePath, startLine, endLine })
						);
						evt.dataTransfer?.setData("text/plain", "");
						evt.dataTransfer!.effectAllowed = "move";
					} catch {
						// ignore
					}
				};

				private onDragOver = (evt: DragEvent) => {
					if (!this.dragging) return;
					const gate = this.gateAllows(this.view);
					if (!gate.ok) return;
					if (gate.filePath !== this.dragging.filePath) return;

					const pos = this.view.posAtCoords({ x: evt.clientX, y: evt.clientY });
					if (pos == null) return;

					const info = this.view.state.field(editorInfoField, false);
					const file = info?.file;
					if (!file) return;

					const cache = plugin.app.metadataCache.getFileCache(file);
					const listItems = cache?.listItems ?? null;
					if (!listItems || listItems.length === 0) return;

					const dropLine = this.view.state.doc.lineAt(pos).number - 1;
					const resolved = resolveListSubtreeForLine(listItems, dropLine);
					if (!resolved) return;

					const targetStart = resolved.item.position.start.line;
					const targetEnd = resolved.item.position.end.line;

					// Disallow dropping into the dragged subtree itself.
					if (this.dragging.startLine <= targetStart && targetStart <= this.dragging.endLine) return;

					// Restrict to the current list group.
					const targetGroup = computeGroupKey(listItems, targetStart);
					if (this.dragging.groupKey != null && targetGroup != null && this.dragging.groupKey !== targetGroup) return;

					const block = this.view.lineBlockAt(pos);
					const midY = (block.top + block.bottom) / 2;

					let placement: DropPlacement;
					if (evt.shiftKey) placement = "child";
					else if (evt.altKey) placement = "outdent";
					else placement = evt.clientY < midY ? "above" : "below";

					const nextIndicator: DropIndicator = { targetLine: targetStart, placement };
					const prev = this.view.state.field(dropIndicatorField, false) as DropIndicator | null;
					if (!prev || prev.targetLine !== nextIndicator.targetLine || prev.placement !== nextIndicator.placement) {
						evt.preventDefault();
						try {
							if (evt.dataTransfer) evt.dataTransfer.dropEffect = "move";
						} catch {
							// ignore
						}
						this.view.dispatch({ effects: setDropIndicatorEffect.of(nextIndicator) });
					} else {
						evt.preventDefault();
					}
				};

				private onDragLeave = (evt: DragEvent) => {
					if (!this.dragging) return;
					const related = evt.relatedTarget as Node | null;
					if (related && this.view.dom.contains(related)) return;
					this.view.dispatch({ effects: setDropIndicatorEffect.of(null) });
				};

				private onDrop = (evt: DragEvent) => {
					if (!this.dragging) return;
					const gate = this.gateAllows(this.view);
					if (!gate.ok) return;
					if (gate.filePath !== this.dragging.filePath) return;

					const indicator = this.view.state.field(dropIndicatorField, false) as DropIndicator | null;
					if (!indicator) return;

					const info = this.view.state.field(editorInfoField, false);
					const file = info?.file;
					if (!file) return;

					const cache = plugin.app.metadataCache.getFileCache(file);
					const listItems = cache?.listItems ?? null;
					if (!listItems || listItems.length === 0) return;

					const lines = this.view.state.doc.toString().split("\n");
					const unit = inferListIndentUnit(lines, listItems);

					const targetItem = listItems.find((i) => i.position.start.line === indicator.targetLine);
					if (!targetItem) return;

					const sourceStart = this.dragging.startLine;
					const sourceEnd = this.dragging.endLine;
					const sourceCount = sourceEnd - sourceStart + 1;

					const insertionLineOriginal = (() => {
						if (indicator.placement === "above") return targetItem.position.start.line;
						return targetItem.position.end.line + 1;
					})();

					// No-op if insertion point is inside the source subtree.
					if (sourceStart <= insertionLineOriginal && insertionLineOriginal <= sourceEnd + 1) return;

					const sourceIndentWs = getLeadingWhitespace(lines[sourceStart] ?? "");
					const targetIndentWs = getLeadingWhitespace(lines[targetItem.position.start.line] ?? "");

					const sourceLevel = countIndentUnits(sourceIndentWs, unit).count;
					const targetLevel = countIndentUnits(targetIndentWs, unit).count;

					let desiredLevel = targetLevel;
					if (indicator.placement === "child") desiredLevel = targetLevel + 1;
					else if (indicator.placement === "outdent") desiredLevel = Math.max(0, targetLevel - 1);

					const delta = desiredLevel - sourceLevel;

					const nextLines = [...lines];
					const subtree = nextLines.splice(sourceStart, sourceCount);
					const adjustedSubtree = delta === 0 ? subtree : subtree.map((l) => adjustIndent(l, delta, unit));

					let insertionLine = insertionLineOriginal;
					if (insertionLine > sourceStart) insertionLine -= sourceCount;
					insertionLine = Math.max(0, Math.min(nextLines.length, insertionLine));
					nextLines.splice(insertionLine, 0, ...adjustedSubtree);

					const newText = nextLines.join("\n");
					const newCursorOffset = (() => {
						let offset = 0;
						for (let i = 0; i < insertionLine; i++) offset += nextLines[i].length + 1;
						return offset;
					})();

					evt.preventDefault();

					this.dragging = null;
					this.applyRootClass(this.view);

					this.view.dispatch({
						changes: { from: 0, to: this.view.state.doc.length, insert: newText },
						selection: { anchor: Math.min(newCursorOffset, newText.length) },
						effects: setDropIndicatorEffect.of(null),
					});
				};

				private onDragEnd = (_evt: DragEvent) => {
					if (!this.dragging) return;
					this.dragging = null;
					this.applyRootClass(this.view);
					this.view.dispatch({ effects: setDropIndicatorEffect.of(null) });
				};
			},
			{
				decorations: (v) => v.decorations,
			}
		),
	];
}
