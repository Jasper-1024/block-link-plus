import { Editor, MarkdownView, Notice, TFile, editorLivePreviewField } from "obsidian";
import t from "shared/i18n";
import type BlockLinkPlus from "../../../main";
import { isEnhancedListEnabledFile } from "../enable-scope";
import { findSibling, inferListIndentUnit, resolveListSubtreeForLine } from "./list-subtree";
import { clearEnhancedListZoom, computeEnhancedListZoomRange, setEnhancedListZoom } from "./zoom";
import { computeSwapWithSiblingRegion, indentSubtreeLines, outdentAndMoveSubtreeLines } from "./ops-core";

function isLivePreview(view: MarkdownView): boolean {
	try {
		return view.editor?.cm?.state.field?.(editorLivePreviewField, false) === true;
	} catch {
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

function replaceLinesInEditor(
	editor: Editor,
	allLines: string[],
	fromLine: number,
	toLineInclusive: number,
	newLines: string[]
) {
	const lineCount = allLines.length;
	const includeTrailingNewline = toLineInclusive + 1 < lineCount;

	const fromPos = { line: fromLine, ch: 0 };
	const toPos = includeTrailingNewline
		? { line: toLineInclusive + 1, ch: 0 }
		: { line: toLineInclusive, ch: (allLines[toLineInclusive] ?? "").length };

	const insertText = newLines.join("\n") + (includeTrailingNewline ? "\n" : "");
	editor.replaceRange(insertText, fromPos, toPos);
}

function getLines(editor: Editor): string[] {
	return editor.getValue().split("\n");
}

function getActiveFileFromView(view: MarkdownView): TFile | null {
	const f = view.file;
	return f instanceof TFile ? f : null;
}

type CommandGateResult =
	| { ok: true; file: TFile }
	| { ok: false; reason?: string; conflict?: "zoom" | "outliner" | "live-preview" };

function gateFileAndMode(plugin: BlockLinkPlus, view: MarkdownView): CommandGateResult {
	const file = getActiveFileFromView(view);
	if (!file) return { ok: false };
	if (!isEnhancedListEnabledFile(plugin, file)) return { ok: false };
	if (!isLivePreview(view)) return { ok: false, conflict: "live-preview" };
	return { ok: true, file };
}

export function registerEnhancedListOpsCommands(plugin: BlockLinkPlus) {
	plugin.addCommand({
		id: "enhanced-list-zoom-in",
		name: "Enhanced List: Zoom in to subtree",
		editorCheckCallback: (isChecking: boolean, editor: Editor, view: MarkdownView) => {
			if (!(view instanceof MarkdownView)) return false;
			const gate = gateFileAndMode(plugin, view);
			const canRun =
				gate.ok && plugin.settings.enhancedListOpsZoom && !isThirdPartyPluginEnabled(plugin, "obsidian-zoom");
			if (isChecking) return canRun;
			if (!canRun) {
				if (!gate.ok && gate.conflict === "live-preview") new Notice(t.notices.enhancedListOpsRequiresLivePreview);
				else if (isThirdPartyPluginEnabled(plugin, "obsidian-zoom")) new Notice(t.notices.enhancedListZoomConflict);
				return true;
			}

			zoomInToSubtree(plugin, editor, view, gate.file);
			return true;
		},
	});

	plugin.addCommand({
		id: "enhanced-list-zoom-out",
		name: "Enhanced List: Zoom out",
		editorCheckCallback: (isChecking: boolean, editor: Editor, view: MarkdownView) => {
			if (!(view instanceof MarkdownView)) return false;
			const gate = gateFileAndMode(plugin, view);
			const canRun =
				gate.ok && plugin.settings.enhancedListOpsZoom && !isThirdPartyPluginEnabled(plugin, "obsidian-zoom");
			if (isChecking) return canRun;
			if (!canRun) {
				if (!gate.ok && gate.conflict === "live-preview") new Notice(t.notices.enhancedListOpsRequiresLivePreview);
				else if (isThirdPartyPluginEnabled(plugin, "obsidian-zoom")) new Notice(t.notices.enhancedListZoomConflict);
				return true;
			}

			const cm = (view.editor as any)?.cm;
			if (cm) clearEnhancedListZoom(cm);
			return true;
		},
	});

	plugin.addCommand({
		id: "enhanced-list-move-subtree-up",
		name: "Enhanced List: Move subtree up",
		editorCheckCallback: (isChecking: boolean, editor: Editor, view: MarkdownView) => {
			if (!(view instanceof MarkdownView)) return false;
			const gate = gateFileAndMode(plugin, view);
			const canRun =
				gate.ok && plugin.settings.enhancedListOpsMove && !isThirdPartyPluginEnabled(plugin, "obsidian-outliner");
			if (isChecking) return canRun;
			if (!canRun) {
				if (!gate.ok && gate.conflict === "live-preview") new Notice(t.notices.enhancedListOpsRequiresLivePreview);
				else if (isThirdPartyPluginEnabled(plugin, "obsidian-outliner"))
					new Notice(t.notices.enhancedListOutlinerConflict);
				return true;
			}

			moveSubtree(plugin, editor, gate.file, "up");
			return true;
		},
	});

	plugin.addCommand({
		id: "enhanced-list-move-subtree-down",
		name: "Enhanced List: Move subtree down",
		editorCheckCallback: (isChecking: boolean, editor: Editor, view: MarkdownView) => {
			if (!(view instanceof MarkdownView)) return false;
			const gate = gateFileAndMode(plugin, view);
			const canRun =
				gate.ok && plugin.settings.enhancedListOpsMove && !isThirdPartyPluginEnabled(plugin, "obsidian-outliner");
			if (isChecking) return canRun;
			if (!canRun) {
				if (!gate.ok && gate.conflict === "live-preview") new Notice(t.notices.enhancedListOpsRequiresLivePreview);
				else if (isThirdPartyPluginEnabled(plugin, "obsidian-outliner"))
					new Notice(t.notices.enhancedListOutlinerConflict);
				return true;
			}

			moveSubtree(plugin, editor, gate.file, "down");
			return true;
		},
	});

	plugin.addCommand({
		id: "enhanced-list-indent-subtree",
		name: "Enhanced List: Indent subtree",
		editorCheckCallback: (isChecking: boolean, editor: Editor, view: MarkdownView) => {
			if (!(view instanceof MarkdownView)) return false;
			const gate = gateFileAndMode(plugin, view);
			const canRun =
				gate.ok &&
				plugin.settings.enhancedListOpsIndent &&
				!isThirdPartyPluginEnabled(plugin, "obsidian-outliner");
			if (isChecking) return canRun;
			if (!canRun) {
				if (!gate.ok && gate.conflict === "live-preview") new Notice(t.notices.enhancedListOpsRequiresLivePreview);
				else if (isThirdPartyPluginEnabled(plugin, "obsidian-outliner"))
					new Notice(t.notices.enhancedListOutlinerConflict);
				return true;
			}

			indentSubtree(plugin, editor, gate.file);
			return true;
		},
	});

	plugin.addCommand({
		id: "enhanced-list-outdent-subtree",
		name: "Enhanced List: Outdent subtree",
		editorCheckCallback: (isChecking: boolean, editor: Editor, view: MarkdownView) => {
			if (!(view instanceof MarkdownView)) return false;
			const gate = gateFileAndMode(plugin, view);
			const canRun =
				gate.ok &&
				plugin.settings.enhancedListOpsIndent &&
				!isThirdPartyPluginEnabled(plugin, "obsidian-outliner");
			if (isChecking) return canRun;
			if (!canRun) {
				if (!gate.ok && gate.conflict === "live-preview") new Notice(t.notices.enhancedListOpsRequiresLivePreview);
				else if (isThirdPartyPluginEnabled(plugin, "obsidian-outliner"))
					new Notice(t.notices.enhancedListOutlinerConflict);
				return true;
			}

			outdentSubtree(plugin, editor, gate.file);
			return true;
		},
	});
}

function zoomInToSubtree(plugin: BlockLinkPlus, editor: Editor, view: MarkdownView, file: TFile) {
	const cache = plugin.app.metadataCache.getFileCache(file);
	const listItems = cache?.listItems ?? null;
	if (!listItems || listItems.length === 0) return;

	const cursor = editor.getCursor();
	const resolved = resolveListSubtreeForLine(listItems, cursor.line);
	if (!resolved) return;

	const cm = (view.editor as any)?.cm;
	if (!cm) return;

	const doc = cm.state.doc;
	setEnhancedListZoom(cm, computeEnhancedListZoomRange(doc, resolved.startLine, resolved.endLine));
}

function moveSubtree(plugin: BlockLinkPlus, editor: Editor, file: TFile, direction: "up" | "down") {
	const cache = plugin.app.metadataCache.getFileCache(file);
	const listItems = cache?.listItems ?? null;
	if (!listItems || listItems.length === 0) return;

	const cursor = editor.getCursor();
	const resolved = resolveListSubtreeForLine(listItems, cursor.line);
	if (!resolved) return;

	const current = resolved.item;
	const currentStart = resolved.startLine;
	const currentEnd = resolved.endLine;

	const sibling = findSibling(listItems, current, direction === "up" ? "prev" : "next");
	if (!sibling) return;

	const siblingStart = sibling.position.start.line;
	const siblingEnd = sibling.position.end.line;

	const lines = getLines(editor);
	const swap = computeSwapWithSiblingRegion(
		lines,
		{ startLine: currentStart, endLine: currentEnd },
		{ startLine: siblingStart, endLine: siblingEnd },
		direction
	);
	if (!swap) return;

	replaceLinesInEditor(editor, lines, swap.replaceFromLine, swap.replaceToLine, swap.newRegion);

	const rel = cursor.line - currentStart;
	editor.setCursor({ line: swap.newStartLine + rel, ch: cursor.ch });
}

function indentSubtree(plugin: BlockLinkPlus, editor: Editor, file: TFile) {
	const cache = plugin.app.metadataCache.getFileCache(file);
	const listItems = cache?.listItems ?? null;
	if (!listItems || listItems.length === 0) return;

	const cursor = editor.getCursor();
	const resolved = resolveListSubtreeForLine(listItems, cursor.line);
	if (!resolved) return;

	const current = resolved.item;
	const currentStart = resolved.startLine;
	const currentEnd = resolved.endLine;

	// Can't indent the first sibling (Logseq/Roam style).
	const prevSibling = findSibling(listItems, current, "prev");
	if (!prevSibling) return;

	const lines = getLines(editor);
	const unit = inferListIndentUnit(lines, listItems);
	const updated = indentSubtreeLines(lines, { startLine: currentStart, endLine: currentEnd }, unit);
	replaceLinesInEditor(editor, lines, currentStart, currentEnd, updated);

	if (cursor.line >= currentStart && cursor.line <= currentEnd) {
		editor.setCursor({ line: cursor.line, ch: cursor.ch + unit.length });
	}
}

function outdentSubtree(plugin: BlockLinkPlus, editor: Editor, file: TFile) {
	const cache = plugin.app.metadataCache.getFileCache(file);
	const listItems = cache?.listItems ?? null;
	if (!listItems || listItems.length === 0) return;

	const cursor = editor.getCursor();
	const resolved = resolveListSubtreeForLine(listItems, cursor.line);
	if (!resolved) return;

	const current = resolved.item;
	const currentStart = resolved.startLine;
	const currentEnd = resolved.endLine;

	if (current.parent < 0) return;

	const parentItem = listItems.find((i) => i.position.start.line === current.parent);
	if (!parentItem) return;

	const lines = getLines(editor);
	const unit = inferListIndentUnit(lines, listItems);
	const insertionLineOriginal = parentItem.position.end.line + 1;
	const moved = outdentAndMoveSubtreeLines(
		lines,
		{ startLine: currentStart, endLine: currentEnd },
		insertionLineOriginal,
		unit
	);
	if (!moved) return;
	const nextLines = moved.nextLines;
	const insertionLine = moved.newStartLine;

	// Replace the whole document (simple + atomic undo).
	editor.replaceRange(
		nextLines.join("\n"),
		{ line: 0, ch: 0 },
		{ line: lines.length - 1, ch: (lines[lines.length - 1] ?? "").length }
	);

	const rel = cursor.line - currentStart;
	const newCursorLine = insertionLine + rel;
	const newCursorCh = Math.max(0, cursor.ch - unit.length);
	editor.setCursor({ line: newCursorLine, ch: newCursorCh });
}
