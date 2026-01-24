import { MarkdownPostProcessorContext, MarkdownRenderChild, TFile } from "obsidian";
import type BlockLinkPlus from "../main";
import { isEnhancedListEnabledFile } from "../features/enhanced-list-blocks/enable-scope";

const SYSTEM_LINE_REGEX =
	/\[date::\s*\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\](?:\s*\^[a-zA-Z0-9_-]+)?/g;

const ENHANCED_LIST_READING_MODE_HIDER_MARKER = "data-blp-enhanced-list-reading-mode-hider";
const ENHANCED_LIST_SYSTEM_LINE_HIDDEN_MARKER = "data-blp-enhanced-list-system-line-hidden";
const ENHANCED_LIST_SYSTEM_LINE_HIDDEN_KIND_TOKEN = "token";
const ENHANCED_LIST_SYSTEM_LINE_HIDDEN_KIND_ELEMENT = "el";

function hidePreviousBr(el: HTMLElement) {
	let prev: ChildNode | null = el.previousSibling;
	while (prev && prev.nodeType === Node.TEXT_NODE && !(prev.textContent ?? "").trim()) {
		prev = prev.previousSibling;
	}

	if (prev && prev.nodeType === Node.ELEMENT_NODE && (prev as Element).tagName === "BR") {
		(prev as HTMLElement).style.display = "none";
		(prev as HTMLElement).setAttribute(ENHANCED_LIST_SYSTEM_LINE_HIDDEN_MARKER, ENHANCED_LIST_SYSTEM_LINE_HIDDEN_KIND_ELEMENT);
	}
}

function unhideEnhancedListSystemLineInReadingMode(el: HTMLElement) {
	const marked = el.querySelectorAll(`[${ENHANCED_LIST_SYSTEM_LINE_HIDDEN_MARKER}]`);
	for (const node of Array.from(marked)) {
		const kind = node.getAttribute(ENHANCED_LIST_SYSTEM_LINE_HIDDEN_MARKER);

		if (node.tagName === "SPAN" && kind === ENHANCED_LIST_SYSTEM_LINE_HIDDEN_KIND_TOKEN) {
			node.replaceWith(document.createTextNode(node.textContent ?? ""));
			continue;
		}

		(node as HTMLElement).style.removeProperty("display");
		node.removeAttribute(ENHANCED_LIST_SYSTEM_LINE_HIDDEN_MARKER);
	}
}

function hideEnhancedListSystemLineInReadingMode(el: HTMLElement) {
	unhideEnhancedListSystemLineInReadingMode(el);

	// 1) Best-effort raw text hiding (works when inline fields are still text).
	const walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT);
	const nodes: Text[] = [];
	let node: Text | null = walker.nextNode() as Text | null;
	while (node) {
		nodes.push(node);
		node = walker.nextNode() as Text | null;
	}

	for (const textNode of nodes) {
		if (!textNode.parentElement?.closest("li")) continue;

		const text = textNode.nodeValue ?? "";
		SYSTEM_LINE_REGEX.lastIndex = 0;
		if (!SYSTEM_LINE_REGEX.test(text)) continue;

		SYSTEM_LINE_REGEX.lastIndex = 0;
		const frag = document.createDocumentFragment();
		let last = 0;
		let match: RegExpExecArray | null;
		while ((match = SYSTEM_LINE_REGEX.exec(text)) !== null) {
			const start = match.index;
			const end = start + match[0].length;
			const before = text.slice(last, start);
			if (before) frag.append(document.createTextNode(before));

			const span = document.createElement("span");
			span.style.display = "none";
			span.setAttribute(ENHANCED_LIST_SYSTEM_LINE_HIDDEN_MARKER, ENHANCED_LIST_SYSTEM_LINE_HIDDEN_KIND_TOKEN);
			span.textContent = match[0];
			frag.append(span);

			last = end;
		}

		const after = text.slice(last);
		if (after) frag.append(document.createTextNode(after));

		textNode.replaceWith(frag);
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

		hidePreviousBr(fieldEl);
		fieldEl.style.display = "none";
		fieldEl.setAttribute(ENHANCED_LIST_SYSTEM_LINE_HIDDEN_MARKER, ENHANCED_LIST_SYSTEM_LINE_HIDDEN_KIND_ELEMENT);
	}

	// Best-effort: hide the line break before the system line to avoid blank lines.
	const hiddenTokens = el.querySelectorAll(
		`span[${ENHANCED_LIST_SYSTEM_LINE_HIDDEN_MARKER}="${ENHANCED_LIST_SYSTEM_LINE_HIDDEN_KIND_TOKEN}"]`
	);
	for (const token of Array.from(hiddenTokens)) {
		if (!token.closest("li")) continue;
		hidePreviousBr(token as HTMLElement);
	}
}

class EnhancedListReadingModeHiderChild extends MarkdownRenderChild {
	private observer: MutationObserver | null = null;
	private readonly plugin: BlockLinkPlus;
	private lastHideSetting: boolean;

	constructor(containerEl: HTMLElement, plugin: BlockLinkPlus) {
		super(containerEl);
		this.plugin = plugin;
		this.lastHideSetting = plugin.settings.enhancedListHideSystemLine;
	}

	onload(): void {
		if (this.plugin.settings.enhancedListHideSystemLine) {
			hideEnhancedListSystemLineInReadingMode(this.containerEl);
		} else {
			unhideEnhancedListSystemLineInReadingMode(this.containerEl);
		}

		this.observer = new MutationObserver(() => {
			const nextHide = this.plugin.settings.enhancedListHideSystemLine;
			if (nextHide) {
				hideEnhancedListSystemLineInReadingMode(this.containerEl);
			} else if (this.lastHideSetting !== nextHide) {
				unhideEnhancedListSystemLineInReadingMode(this.containerEl);
			}
			this.lastHideSetting = nextHide;
		});
		this.observer.observe(this.containerEl, { childList: true, subtree: true });
	}

	onunload(): void {
		this.observer?.disconnect();
		this.observer = null;
	}
}

export function markdownPostProcessor(el: HTMLElement, ctx: MarkdownPostProcessorContext, plugin: BlockLinkPlus) {
	const file = plugin.app.vault.getAbstractFileByPath(ctx.sourcePath);
	if (!(file instanceof TFile)) return;
	if (!isEnhancedListEnabledFile(plugin, file)) return;

	// Dataview (and other processors) may render after us; observe and re-apply.
	if (typeof (ctx as any)?.addChild === "function" && !el.hasAttribute(ENHANCED_LIST_READING_MODE_HIDER_MARKER)) {
		el.setAttribute(ENHANCED_LIST_READING_MODE_HIDER_MARKER, "1");
		ctx.addChild(new EnhancedListReadingModeHiderChild(el, plugin));
	}

	// Apply once eagerly (the child observer will keep it up-to-date for late renders).
	if (plugin.settings.enhancedListHideSystemLine) {
		hideEnhancedListSystemLineInReadingMode(el);
	} else {
		unhideEnhancedListSystemLineInReadingMode(el);
	}
}
