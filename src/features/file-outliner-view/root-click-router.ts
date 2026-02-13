import type BlockLinkPlus from "../../main";

export type OutlinerRootClickRouterHost = {
	app: any;
	plugin: BlockLinkPlus;
	getDefaultSourcePath: () => string;
	debugLog: (scope: string, err: unknown) => void;
};

function resolveSourcePathForInternalLink(
	host: OutlinerRootClickRouterHost,
	targetEl: HTMLElement,
	defaultSourcePath: string
): string {
	if (!defaultSourcePath) return defaultSourcePath;

	const embedEl = targetEl.closest<HTMLElement>(".internal-embed.markdown-embed");
	if (!embedEl) return defaultSourcePath;

	const raw = (embedEl.getAttribute("src") ?? embedEl.getAttribute("alt") ?? "").trim();
	if (!raw) return defaultSourcePath;

	const pipeIndex = raw.indexOf("|");
	const actual = pipeIndex === -1 ? raw : raw.substring(0, pipeIndex);
	const hashIndex = actual.indexOf("#");
	const notePath = (hashIndex === -1 ? actual : actual.substring(0, hashIndex)).trim();
	if (!notePath) return defaultSourcePath;

	try {
		const file = host.app.metadataCache.getFirstLinkpathDest(notePath, defaultSourcePath);
		return file?.path ?? defaultSourcePath;
	} catch (err) {
		host.debugLog("rootClick/resolveSourcePathForInternalLink", err);
		return defaultSourcePath;
	}
}

export function handleOutlinerRootClickCapture(evt: MouseEvent, host: OutlinerRootClickRouterHost): void {
	const target = evt.target as HTMLElement | null;
	if (!target) return;
	if (evt.defaultPrevented) return;

	// Never intercept clicks inside embed editors / our CM6 editor host.
	if (target.closest(".markdown-source-view")) return;
	if (target.closest(".blp-file-outliner-editor")) return;

	const defaultSourcePath = host.getDefaultSourcePath();

	// 1) Route `.internal-link` navigation (MarkdownRenderer output) through Obsidian's pipeline.
	const anchor = target.closest("a.internal-link") as HTMLAnchorElement | null;
	if (anchor) {
		const href =
			anchor.getAttribute("data-href") ??
			(anchor as any)?.dataset?.href ??
			anchor.getAttribute("href") ??
			"";
		if (!href) return;

		evt.preventDefault();
		evt.stopPropagation();

		const sourcePath = resolveSourcePathForInternalLink(host, anchor, defaultSourcePath);
		const newLeaf = Boolean(evt.ctrlKey || evt.metaKey);
		void host.app.workspace.openLinkText(href, sourcePath, newLeaf);
		return;
	}

	// 2) Inline-edit embeds inside outliner display (opt-in to InlineEditEngine).
	const embedEl = target.closest<HTMLElement>(".internal-embed.markdown-embed");
	if (!embedEl) return;
	if (!defaultSourcePath) return;

	// Respect interactive controls inside embeds (e.g. buttons, links).
	if (target.closest("a, button, input, textarea")) return;

	evt.preventDefault();
	evt.stopPropagation();

	void host.plugin.inlineEditEngine.mountInlineEmbedInOutliner(embedEl, defaultSourcePath);
}

