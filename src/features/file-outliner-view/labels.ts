import i18n from "shared/i18n";

export type FileOutlinerCommandLabels = {
	toggleTaskStatus: string;
	toggleTaskMarker: string;
};

export type FileOutlinerContextMenuLabels = {
	copyBlockReference: string;
	copyBlockEmbed: string;
	copyBlockUrl: string;
	convertToTask: string;
	convertToNormalBlock: string;
	copy: string;
	cut: string;
	paste: string;
	pasteAsText: string;
	delete: string;
	collapse: string;
	expand: string;
};

const FALLBACK_COMMANDS: FileOutlinerCommandLabels = {
	toggleTaskStatus: "Outliner: Toggle task status",
	toggleTaskMarker: "Outliner: Toggle task marker",
};

const FALLBACK_CONTEXT_MENU: FileOutlinerContextMenuLabels = {
	copyBlockReference: "Copy block reference",
	copyBlockEmbed: "Copy block embed",
	copyBlockUrl: "Copy block URL",
	convertToTask: "Convert to task",
	convertToNormalBlock: "Convert to normal block",
	copy: "Copy",
	cut: "Cut",
	paste: "Paste",
	pasteAsText: "Paste as text",
	delete: "Delete",
	collapse: "Collapse",
	expand: "Expand",
};

export function getFileOutlinerCommandLabels(): FileOutlinerCommandLabels {
	const raw = (i18n.settings as any)?.fileOutliner?.commands;
	if (!raw) return FALLBACK_COMMANDS;

	return {
		toggleTaskStatus: String(raw.toggleTaskStatus ?? FALLBACK_COMMANDS.toggleTaskStatus),
		toggleTaskMarker: String(raw.toggleTaskMarker ?? FALLBACK_COMMANDS.toggleTaskMarker),
	};
}

export function getFileOutlinerContextMenuLabels(): FileOutlinerContextMenuLabels {
	const raw = (i18n.settings as any)?.fileOutliner?.contextMenu;
	if (!raw) return FALLBACK_CONTEXT_MENU;

	return {
		copyBlockReference: String(raw.copyBlockReference ?? FALLBACK_CONTEXT_MENU.copyBlockReference),
		copyBlockEmbed: String(raw.copyBlockEmbed ?? FALLBACK_CONTEXT_MENU.copyBlockEmbed),
		copyBlockUrl: String(raw.copyBlockUrl ?? FALLBACK_CONTEXT_MENU.copyBlockUrl),
		convertToTask: String(raw.convertToTask ?? FALLBACK_CONTEXT_MENU.convertToTask),
		convertToNormalBlock: String(raw.convertToNormalBlock ?? FALLBACK_CONTEXT_MENU.convertToNormalBlock),
		copy: String(raw.copy ?? FALLBACK_CONTEXT_MENU.copy),
		cut: String(raw.cut ?? FALLBACK_CONTEXT_MENU.cut),
		paste: String(raw.paste ?? FALLBACK_CONTEXT_MENU.paste),
		pasteAsText: String(raw.pasteAsText ?? FALLBACK_CONTEXT_MENU.pasteAsText),
		delete: String(raw.delete ?? FALLBACK_CONTEXT_MENU.delete),
		collapse: String(raw.collapse ?? FALLBACK_CONTEXT_MENU.collapse),
		expand: String(raw.expand ?? FALLBACK_CONTEXT_MENU.expand),
	};
}
