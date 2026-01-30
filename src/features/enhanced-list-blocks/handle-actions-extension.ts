import type { EditorState } from "@codemirror/state";
import { ViewPlugin, type ViewUpdate } from "@codemirror/view";
import { Menu, Notice, editorInfoField, editorLivePreviewField } from "obsidian";
import type BlockLinkPlus from "../../main";
import { copyToClipboard } from "../clipboard-handler";
import t from "../../shared/i18n";
import { getEditorFromState } from "../../vendor/vslinko/obsidian-outliner/editor";
import { ObsidianSettings } from "../../vendor/vslinko/obsidian-outliner/services/ObsidianSettings";
import { getEnhancedListScopeManager, isEnhancedListEnabledFile } from "./enable-scope";
import { dispatchEnhancedListBlockSelectionClick } from "./block-selection-extension";
import { ensureEnhancedListSystemLineForActiveListItem } from "./ensure-system-line";
import { openEnhancedListBlockPeek } from "./block-peek";

const HANDLE_SELECTOR = ".cm-formatting-list-ul";

type ResolveHandleLine = (view: any, event: MouseEvent) => number | null;

type HandleActionsDeps = {
	infoField?: typeof editorInfoField;
	livePreviewField?: typeof editorLivePreviewField;
	resolveHandleLine?: ResolveHandleLine;
	onToggleFold?: (view: any, line: number) => void;
	onShowMenu?: (view: any, line: number, event: MouseEvent) => void;
};

/**
 * vslinko Outliner DnD uses a document-level mousedown + mousemove workflow and
 * toggles `body.outliner-plugin-dragging` during a drag. This means:
 * - CM's own mousedown handlers may not run (event stopped in capture phase),
 * - a click can still fire after a drag ends, which would accidentally toggle folding.
 *
 * Track recent DnD drags globally (per app) and suppress handle click actions
 * right after a drag gesture.
 */
let dndClassObserver: MutationObserver | null = null;
let dndObserverRefCount = 0;
let lastOutlinerDndTs = 0;

function ensureDndTracker() {
	dndObserverRefCount++;
	if (dndClassObserver) return;

	let wasDragging = document.body.classList.contains("outliner-plugin-dragging");
	dndClassObserver = new MutationObserver(() => {
		const isDragging = document.body.classList.contains("outliner-plugin-dragging");
		if (wasDragging && !isDragging) {
			lastOutlinerDndTs = Date.now();
		}
		wasDragging = isDragging;
	});
	dndClassObserver.observe(document.body, { attributes: true, attributeFilter: ["class"] });
}

function releaseDndTracker() {
	dndObserverRefCount = Math.max(0, dndObserverRefCount - 1);
	if (dndObserverRefCount !== 0) return;
	dndClassObserver?.disconnect();
	dndClassObserver = null;
}

function wasRecentlyDraggingViaOutliner(): boolean {
	return lastOutlinerDndTs > 0 && Date.now() - lastOutlinerDndTs < 600;
}

function getViewFilePath(view: any, infoField: typeof editorInfoField): string | null {
	try {
		const info = view.state.field(infoField, false);
		return info?.file?.path ?? null;
	} catch {
		return null;
	}
}

function getViewLivePreview(view: any, livePreviewField: typeof editorLivePreviewField): boolean | null {
	try {
		const v = view.state.field?.(livePreviewField, false);
		return v === true ? true : v === false ? false : null;
	} catch {
		return null;
	}
}

function shouldEnableHandleActions(
	view: any,
	plugin: BlockLinkPlus,
	infoField: typeof editorInfoField,
	livePreviewField: typeof editorLivePreviewField
): boolean {
	if (!plugin.settings.enhancedListHandleActions) return false;

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

function defaultResolveHandleLine(view: any, event: MouseEvent): number | null {
	const target = event.target as HTMLElement | null;
	const handleEl = target?.closest?.(HANDLE_SELECTOR) as HTMLElement | null;
	if (!handleEl) return null;

	try {
		const pos = view.posAtDOM(handleEl);
		const line = view.state.doc.lineAt(pos).number;
		return Math.max(0, line - 1);
	} catch {
		return null;
	}
}

function setCursorToLine(view: any, infoField: typeof editorInfoField, line: number) {
	const info = view.state.field(infoField, false);
	const editor = info?.editor;

	if (editor && typeof editor.setCursor === "function") {
		editor.setCursor({ line, ch: 0 });
		return;
	}

	try {
		const pos = view.state.doc.line(line + 1).from;
		view.dispatch({ selection: { anchor: pos } });
	} catch {
		// Ignore.
	}
}

function toggleFoldingAtLine(plugin: BlockLinkPlus, state: EditorState, line: number) {
	const obsidianSettings = new ObsidianSettings(plugin.app);
	if (!obsidianSettings.getFoldSettings().foldIndent) {
		new Notice(
			`Unable to fold/unfold because folding is disabled. Please enable "Fold indent" in Obsidian settings.`,
			5000
		);
		return;
	}

	const editor = getEditorFromState(state);
	if (!editor) return;

	const folded = editor.getAllFoldedLines().includes(line);
	if (folded) {
		editor.unfold(line);
	} else {
		editor.fold(line);
	}
}

function showHandleMenu(
	plugin: BlockLinkPlus,
	view: any,
	infoField: typeof editorInfoField,
	line: number,
	event: MouseEvent
) {
	const info = view.state.field(infoField, false);
	const file = info?.file;
	const editor = info?.editor;
	if (!file || !editor) return;

	const menu = new Menu();
	const strings = (t as any).settings?.enhancedListBlocks?.handleActions?.menu;
	const getLabel = (fallback: string, key: string) => (strings?.[key] as string) ?? fallback;

	menu.addItem((item) => {
		item.setTitle(getLabel("Toggle folding", "toggleFolding")).onClick(() => {
			setCursorToLine(view, infoField, line);
			toggleFoldingAtLine(plugin, view.state, line);
		});
	});

	menu.addSeparator();

	menu.addItem((item) => {
		item.setTitle(getLabel("Copy block link", "copyBlockLink")).onClick(() => {
			setCursorToLine(view, infoField, line);
			const blockId = ensureEnhancedListSystemLineForActiveListItem(plugin, editor);
			if (!blockId) {
				new Notice("No list item block id found.");
				return;
			}
			copyToClipboard(plugin.app, plugin.settings as any, file, blockId, false);
		});
	});

	menu.addItem((item) => {
		item.setTitle(getLabel("Copy block embed", "copyBlockEmbed")).onClick(() => {
			setCursorToLine(view, infoField, line);
			const blockId = ensureEnhancedListSystemLineForActiveListItem(plugin, editor);
			if (!blockId) {
				new Notice("No list item block id found.");
				return;
			}
			copyToClipboard(plugin.app, plugin.settings as any, file, blockId, true);
		});
	});

	if (plugin.settings.enhancedListBlockPeekEnabled !== false) {
		menu.addItem((item) => {
			item.setTitle(getLabel("Peek block", "peekBlock")).onClick(() => {
				setCursorToLine(view, infoField, line);
				const blockId = ensureEnhancedListSystemLineForActiveListItem(plugin, editor);
				if (!blockId) {
					new Notice("No list item block id found.");
					return;
				}
				openEnhancedListBlockPeek(plugin, { file, blockId });
			});
		});
	}

	const zoomApi = (window as any).ObsidianZoomPlugin;
	if (zoomApi) {
		menu.addSeparator();

		menu.addItem((item) => {
			item.setTitle(getLabel("Zoom in", "zoomIn")).onClick(() => {
				setCursorToLine(view, infoField, line);
				try {
					zoomApi.zoomIn(editor, line);
				} catch {
					// Ignore.
				}
			});
		});

		menu.addItem((item) => {
			item.setTitle(getLabel("Zoom out", "zoomOut")).onClick(() => {
				setCursorToLine(view, infoField, line);
				try {
					zoomApi.zoomOut(editor);
				} catch {
					// Ignore.
				}
			});
		});
	}

	menu.showAtMouseEvent(event);
}

export function createEnhancedListHandleActionsExtension(
	plugin: BlockLinkPlus,
	deps: HandleActionsDeps = {}
) {
	const infoField = deps.infoField ?? editorInfoField;
	const livePreviewField = deps.livePreviewField ?? editorLivePreviewField;
	const resolveHandleLine = deps.resolveHandleLine ?? defaultResolveHandleLine;

	return ViewPlugin.fromClass(
		class {
			private view: any;
			private isActive = false;
			private lastDragTs = 0;
			private unsubscribe: (() => void) | null = null;
			private didFirstUpdate = false;
			private lastFilePath: string | null = null;
			private lastLivePreview: boolean | null = null;
			private scheduled: number | null = null;

			constructor(view: any) {
				this.view = view;
				this.unsubscribe = getEnhancedListScopeManager(plugin).onChange(() => this.refresh());
				ensureDndTracker();
				this.lastFilePath = getViewFilePath(view, infoField);
				this.lastLivePreview = getViewLivePreview(view, livePreviewField);
				this.refresh();
				// Obsidian/CM can still mutate editor state during initial mount; re-apply once after mount.
				this.scheduleRefresh();
			}

			update(update: ViewUpdate) {
				const filePath = getViewFilePath(update.view, infoField);
				const livePreview = getViewLivePreview(update.view, livePreviewField);
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
				// update cycle so gating self-heals without requiring another CM update.
				this.scheduleRefresh();
			}

			private refresh() {
				this.isActive = shouldEnableHandleActions(this.view, plugin, infoField, livePreviewField);
			}

			private isHandleEvent(event: MouseEvent): boolean {
				const target = event.target as HTMLElement | null;
				return Boolean(target?.closest?.(HANDLE_SELECTOR));
			}

			private handleClick(event: MouseEvent): boolean {
				if (!this.isActive) return false;
				if (!this.isHandleEvent(event)) return false;
				if (wasRecentlyDraggingViaOutliner()) return false;
				if (this.lastDragTs && Date.now() - this.lastDragTs < 600) return false;

				const clickAction = plugin.settings.enhancedListHandleClickAction ?? "toggle-folding";
				if (clickAction === "none") return false;

				const line = resolveHandleLine(this.view, event);
				if (line === null) return false;

				if (clickAction === "select-block") {
					dispatchEnhancedListBlockSelectionClick(this.view, { line, shiftKey: event.shiftKey });
					event.preventDefault();
					return true;
				}

				setCursorToLine(this.view, infoField, line);

				if (clickAction === "menu") {
					if (deps.onShowMenu) {
						deps.onShowMenu(this.view, line, event);
					} else {
						showHandleMenu(plugin, this.view, infoField, line, event);
					}
				} else {
					if (deps.onToggleFold) {
						deps.onToggleFold(this.view, line);
					} else {
						toggleFoldingAtLine(plugin, this.view.state, line);
					}
				}

				event.preventDefault();
				return true;
			}

			private handleContextMenu(event: MouseEvent): boolean {
				if (!this.isActive) return false;
				if (!this.isHandleEvent(event)) return false;

				const line = resolveHandleLine(this.view, event);
				if (line === null) return false;

				setCursorToLine(this.view, infoField, line);

				if (deps.onShowMenu) {
					deps.onShowMenu(this.view, line, event);
				} else {
					showHandleMenu(plugin, this.view, infoField, line, event);
				}

				event.preventDefault();
				return true;
			}

			private handleDragStart(event: DragEvent) {
				if (!this.isActive) return;
				const target = event.target as HTMLElement | null;
				if (!target?.closest?.(HANDLE_SELECTOR)) return;
				this.lastDragTs = Date.now();
			}

			destroy() {
				this.unsubscribe?.();
				this.unsubscribe = null;
				if (this.scheduled !== null) {
					clearTimeout(this.scheduled);
					this.scheduled = null;
				}
				releaseDndTracker();
			}

			private scheduleRefresh() {
				if (this.scheduled !== null) return;
				this.scheduled = window.setTimeout(() => {
					this.scheduled = null;
					this.refresh();
				}, 0);
			}
		},
		{
			eventHandlers: {
				dragstart(event) {
					(this as any).handleDragStart(event as any);
				},
				click(event) {
					return (this as any).handleClick(event as any);
				},
				contextmenu(event) {
					return (this as any).handleContextMenu(event as any);
				},
			},
		}
	);
}
