import { MarkdownPostProcessorContext, MarkdownRenderChild, TFile } from "obsidian";
import type BlockLinkPlus from "../main";
import { isEnhancedListEnabledFile } from "../features/enhanced-list-blocks/enable-scope";
import { isTimeSection } from "../utils";

const SYSTEM_LINE_REGEX =
	/\[date::\s*\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\](?:\s*\^[a-zA-Z0-9_-]+)?/g;

const ENHANCED_LIST_READING_MODE_HIDER_MARKER = "data-blp-enhanced-list-reading-mode-hider";

function removePreviousBr(el: HTMLElement) {
	let prev: ChildNode | null = el.previousSibling;
	while (prev && prev.nodeType === Node.TEXT_NODE && !(prev.textContent ?? "").trim()) {
		prev = prev.previousSibling;
	}

	if (prev && prev.nodeType === Node.ELEMENT_NODE && (prev as Element).tagName === "BR") {
		(prev as Element).remove();
	}
}

function hideEnhancedListSystemLineInReadingMode(el: HTMLElement) {
	// 1) Best-effort raw text stripping (works when inline fields are still text).
	const walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT);
	let node: Text | null = walker.nextNode() as Text | null;
	while (node) {
		const text = node.nodeValue ?? "";
		const next = text.replace(SYSTEM_LINE_REGEX, "");
		if (next !== text) {
			node.nodeValue = next;
		}
		node = walker.nextNode() as Text | null;
	}

	// 2) Dataview-rendered inline fields (common in Reading mode).
	const dateKeys = el.querySelectorAll(
		'.dataview.inline-field-key[data-dv-key="date"], .dataview.inline-field-key[data-dv-norm-key="date"]'
	);

	for (const keyEl of Array.from(dateKeys)) {
		const fieldEl = keyEl.closest(".dataview.inline-field") as HTMLElement | null;
		if (!fieldEl) continue;
		// Limit to list items to avoid unexpected hiding outside Enhanced List Blocks.
		if (!fieldEl.closest("li")) continue;

		removePreviousBr(fieldEl);
		fieldEl.remove();
	}
}

class EnhancedListReadingModeHiderChild extends MarkdownRenderChild {
	private observer: MutationObserver | null = null;

	constructor(containerEl: HTMLElement) {
		super(containerEl);
	}

	onload(): void {
		hideEnhancedListSystemLineInReadingMode(this.containerEl);

		this.observer = new MutationObserver(() => {
			hideEnhancedListSystemLineInReadingMode(this.containerEl);
		});
		this.observer.observe(this.containerEl, { childList: true, subtree: true });
	}

	onunload(): void {
		this.observer?.disconnect();
		this.observer = null;
	}
}

export function markdownPostProcessor(el: HTMLElement, ctx: MarkdownPostProcessorContext, plugin: BlockLinkPlus) {
	// Process time section headings if enabled
	if (plugin.settings.time_section_plain_style) {
		const headings = el.querySelectorAll("h1, h2, h3, h4, h5, h6");
		headings.forEach((heading) => {
			if (
				heading.textContent &&
				isTimeSection(heading.textContent.trim(), plugin.settings.time_section_title_pattern)
			) {
				// Add a special class to style time sections as plain text
				heading.classList.add("time-section-plain");
			}
		});
	}

	const file = plugin.app.vault.getAbstractFileByPath(ctx.sourcePath);
	if (!(file instanceof TFile)) return;
	if (!isEnhancedListEnabledFile(plugin, file)) return;

	// Hide the system tail line in Reading mode.
	hideEnhancedListSystemLineInReadingMode(el);

	// Dataview (and other processors) may render after us; observe and re-apply.
	if (typeof (ctx as any)?.addChild === "function" && !el.hasAttribute(ENHANCED_LIST_READING_MODE_HIDER_MARKER)) {
		el.setAttribute(ENHANCED_LIST_READING_MODE_HIDER_MARKER, "1");
		ctx.addChild(new EnhancedListReadingModeHiderChild(el));
	}
}
