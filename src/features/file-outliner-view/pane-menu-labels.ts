import i18n from "shared/i18n";

export type FileOutlinerPaneMenuLabels = {
	openAsMarkdown: string;
	openAsMarkdownNewTab: string;
	openAsOutliner: string;
	openAsOutlinerNewTab: string;
};

const FALLBACK: FileOutlinerPaneMenuLabels = {
	openAsMarkdown: "Open as Markdown (source)",
	openAsMarkdownNewTab: "Open as Markdown (new tab)",
	openAsOutliner: "Open as Outliner",
	openAsOutlinerNewTab: "Open as Outliner (new tab)",
};

export function getFileOutlinerPaneMenuLabels(): FileOutlinerPaneMenuLabels {
	// i18n is not strongly typed for newly-added nested keys; keep a typed fallback.
	const raw = (i18n.settings as any)?.fileOutliner?.paneMenu;
	if (!raw) return FALLBACK;

	return {
		openAsMarkdown: String(raw.openAsMarkdown ?? FALLBACK.openAsMarkdown),
		openAsMarkdownNewTab: String(raw.openAsMarkdownNewTab ?? FALLBACK.openAsMarkdownNewTab),
		openAsOutliner: String(raw.openAsOutliner ?? FALLBACK.openAsOutliner),
		openAsOutlinerNewTab: String(raw.openAsOutlinerNewTab ?? FALLBACK.openAsOutlinerNewTab),
	};
}

