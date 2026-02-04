import { MarkdownPostProcessorContext, MarkdownRenderChild, TFile } from "obsidian";
import type BlockLinkPlus from "../main";
import { isFileOutlinerEnabledFile } from "../features/file-outliner-view/enable-scope";

// File-outliner v2 system tail line marker.
const OUTLINER_SYS_MARKER_RE = /\[blp_sys::\s*1\]/;
const OUTLINER_SYS_TOKENS_RE = /(\[[^\[\]]+?::[^\]]*?\]|\^[a-zA-Z0-9_-]+)/g;

const OUTLINER_READING_MODE_HIDER_MARKER = "data-blp-outliner-reading-mode-hider";
const OUTLINER_SYSTEM_LINE_HIDDEN_MARKER = "data-blp-outliner-system-line-hidden";
const OUTLINER_SYSTEM_LINE_HIDDEN_KIND_TOKEN = "token";
const OUTLINER_SYSTEM_LINE_HIDDEN_KIND_ELEMENT = "el";

function hidePreviousBr(el: HTMLElement) {
	let prev: ChildNode | null = el.previousSibling;
	while (prev && prev.nodeType === Node.TEXT_NODE && !(prev.textContent ?? "").trim()) {
		prev = prev.previousSibling;
	}

	if (prev && prev.nodeType === Node.ELEMENT_NODE && (prev as Element).tagName === "BR") {
		(prev as HTMLElement).style.display = "none";
		(prev as HTMLElement).setAttribute(OUTLINER_SYSTEM_LINE_HIDDEN_MARKER, OUTLINER_SYSTEM_LINE_HIDDEN_KIND_ELEMENT);
	}
}

function hidePreviousBrChain(el: HTMLElement, maxCount: number) {
	let prev: ChildNode | null = el.previousSibling;
	let hidden = 0;

	while (prev && hidden < maxCount) {
		while (prev && prev.nodeType === Node.TEXT_NODE && !(prev.textContent ?? "").trim()) {
			prev = prev.previousSibling;
		}

		if (!prev || prev.nodeType !== Node.ELEMENT_NODE) break;
		if ((prev as Element).tagName !== "BR") break;

		(prev as HTMLElement).style.display = "none";
		(prev as HTMLElement).setAttribute(OUTLINER_SYSTEM_LINE_HIDDEN_MARKER, OUTLINER_SYSTEM_LINE_HIDDEN_KIND_ELEMENT);

		hidden++;
		prev = prev.previousSibling;
	}
}

function unhideSystemLineInReadingMode(el: HTMLElement) {
	const marked = el.querySelectorAll(`[${OUTLINER_SYSTEM_LINE_HIDDEN_MARKER}]`);
	for (const node of Array.from(marked)) {
		const kind = node.getAttribute(OUTLINER_SYSTEM_LINE_HIDDEN_MARKER);

		if (node.tagName === "SPAN" && kind === OUTLINER_SYSTEM_LINE_HIDDEN_KIND_TOKEN) {
			node.replaceWith(document.createTextNode(node.textContent ?? ""));
			continue;
		}

		(node as HTMLElement).style.removeProperty("display");
		node.removeAttribute(OUTLINER_SYSTEM_LINE_HIDDEN_MARKER);
	}
}

function hideSystemLineInReadingMode(el: HTMLElement) {
	unhideSystemLineInReadingMode(el);

	// 0) Outliner v2: hide the entire tail line when the `[blp_sys:: 1]` marker is present.
	const markerWalker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT);
	const markerTextNodes: Text[] = [];
	let markerNode: Text | null = markerWalker.nextNode() as Text | null;
	while (markerNode) {
		markerTextNodes.push(markerNode);
		markerNode = markerWalker.nextNode() as Text | null;
	}

	for (const textNode of markerTextNodes) {
		if (!textNode.parentElement?.closest("li")) continue;

		const text = textNode.nodeValue ?? "";
		if (!OUTLINER_SYS_MARKER_RE.test(text)) continue;

		OUTLINER_SYS_TOKENS_RE.lastIndex = 0;
		const frag = document.createDocumentFragment();
		let last = 0;
		let match: RegExpExecArray | null;
		while ((match = OUTLINER_SYS_TOKENS_RE.exec(text)) !== null) {
			const start = match.index;
			const end = start + match[0].length;
			const before = text.slice(last, start);
			if (before) frag.append(document.createTextNode(before));

			const span = document.createElement("span");
			span.style.display = "none";
			span.setAttribute(OUTLINER_SYSTEM_LINE_HIDDEN_MARKER, OUTLINER_SYSTEM_LINE_HIDDEN_KIND_TOKEN);
			span.textContent = match[0];
			frag.append(span);

			last = end;
		}

		const after = text.slice(last);
		if (after) frag.append(document.createTextNode(after));

		textNode.replaceWith(frag);
	}

	// 1) Dataview-rendered inline fields (common in Reading mode).
	// Outliner v2 system tail lines: hide the whole line that contains the marker field.
	const sysMarkerKeys = el.querySelectorAll(
		'.dataview.inline-field-key[data-dv-key="blp_sys"], .dataview.inline-field-key[data-dv-norm-key="blp_sys"]'
	);

	for (const keyEl of Array.from(sysMarkerKeys)) {
		const fieldEl = keyEl.closest(".dataview.inline-field") as HTMLElement | null;
		if (!fieldEl) continue;
		if (!fieldEl.closest("li")) continue;

		const valueEl = fieldEl.querySelector(".dataview.inline-field-value") as HTMLElement | null;
		const valueText = (valueEl?.textContent ?? "").trim();
		if (valueText !== "1") continue;

		// Hide all Dataview inline fields on the same line as the marker.
		const hideInlineField = (n: ChildNode) => {
			if (n.nodeType !== Node.ELEMENT_NODE) return;
			const el = n as HTMLElement;
			if (!el.classList.contains("dataview") || !el.classList.contains("inline-field")) return;
			hidePreviousBrChain(el, 2);
			el.style.display = "none";
			el.setAttribute(OUTLINER_SYSTEM_LINE_HIDDEN_MARKER, OUTLINER_SYSTEM_LINE_HIDDEN_KIND_ELEMENT);
		};

		hideInlineField(fieldEl);

		let prev: ChildNode | null = fieldEl.previousSibling;
		while (prev) {
			if (prev.nodeType === Node.ELEMENT_NODE && (prev as Element).tagName === "BR") break;
			hideInlineField(prev);
			prev = prev.previousSibling;
		}

		let next: ChildNode | null = fieldEl.nextSibling;
		while (next) {
			if (next.nodeType === Node.ELEMENT_NODE && (next as Element).tagName === "BR") break;
			hideInlineField(next);
			next = next.nextSibling;
		}

		// Also hide any caret id token `^xxxx` that remains as raw text on that line.
		const li = fieldEl.closest("li") as HTMLElement | null;
		if (li) {
			const textWalker = document.createTreeWalker(li, NodeFilter.SHOW_TEXT);
			const textNodes: Text[] = [];
			let t: Text | null = textWalker.nextNode() as Text | null;
			while (t) {
				textNodes.push(t);
				t = textWalker.nextNode() as Text | null;
			}

			for (const tn of textNodes) {
				const raw = tn.nodeValue ?? "";
				if (!raw.includes("^")) continue;

				const caretRe = /\^([a-zA-Z0-9_-]+)\s*/g;
				caretRe.lastIndex = 0;
				const frag = document.createDocumentFragment();
				let last = 0;
				let match: RegExpExecArray | null;
				while ((match = caretRe.exec(raw)) !== null) {
					const start = match.index;
					const end = start + match[0].length;

					const before = raw.slice(last, start);
					if (before) frag.append(document.createTextNode(before));

					const span = document.createElement("span");
					span.style.display = "none";
					span.setAttribute(OUTLINER_SYSTEM_LINE_HIDDEN_MARKER, OUTLINER_SYSTEM_LINE_HIDDEN_KIND_TOKEN);
					span.textContent = match[0];
					frag.append(span);

					last = end;
				}

				if (last === 0) continue;

				const after = raw.slice(last);
				if (after) frag.append(document.createTextNode(after));
				tn.replaceWith(frag);
			}
		}
	}

	// Best-effort: hide the line break before the system line to avoid blank lines.
	const hiddenTokens = el.querySelectorAll(
		`span[${OUTLINER_SYSTEM_LINE_HIDDEN_MARKER}="${OUTLINER_SYSTEM_LINE_HIDDEN_KIND_TOKEN}"]`
	);
	for (const token of Array.from(hiddenTokens)) {
		if (!token.closest("li")) continue;
		hidePreviousBrChain(token as HTMLElement, 2);
	}
}

class OutlinerReadingModeHiderChild extends MarkdownRenderChild {
	private observer: MutationObserver | null = null;
	private readonly plugin: BlockLinkPlus;
	private lastHideSetting: boolean;

	constructor(containerEl: HTMLElement, plugin: BlockLinkPlus) {
		super(containerEl);
		this.plugin = plugin;
		this.lastHideSetting = plugin.settings.fileOutlinerHideSystemLine;
	}

	onload(): void {
		if (this.plugin.settings.fileOutlinerHideSystemLine) {
			hideSystemLineInReadingMode(this.containerEl);
		} else {
			unhideSystemLineInReadingMode(this.containerEl);
		}

		this.observer = new MutationObserver(() => {
			const nextHide = this.plugin.settings.fileOutlinerHideSystemLine;
			if (nextHide) {
				hideSystemLineInReadingMode(this.containerEl);
			} else if (this.lastHideSetting !== nextHide) {
				unhideSystemLineInReadingMode(this.containerEl);
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

export function fileOutlinerMarkdownPostProcessor(
	el: HTMLElement,
	ctx: MarkdownPostProcessorContext,
	plugin: BlockLinkPlus
) {
	// Skip outliner view's internal MarkdownRenderer renders; attaching observers per-block would be expensive.
	if (el.closest(".blp-file-outliner-view")) return;

	const file = plugin.app.vault.getAbstractFileByPath(ctx.sourcePath);
	if (!(file instanceof TFile)) return;

	if (plugin.settings.fileOutlinerHideSystemLine === false) return;

	const hasMarker =
		Boolean(
			el.querySelector(
				'.dataview.inline-field-key[data-dv-key="blp_sys"], .dataview.inline-field-key[data-dv-norm-key="blp_sys"]'
			)
		) || (el.textContent ?? "").includes("blp_sys::");

	if (!isFileOutlinerEnabledFile(plugin, file) && !hasMarker) return;

	// Dataview (and other processors) may render after us; observe and re-apply.
	if (typeof (ctx as any)?.addChild === "function" && !el.hasAttribute(OUTLINER_READING_MODE_HIDER_MARKER)) {
		el.setAttribute(OUTLINER_READING_MODE_HIDER_MARKER, "1");
		ctx.addChild(new OutlinerReadingModeHiderChild(el, plugin));
	}

	// Apply once eagerly (the child observer will keep it up-to-date for late renders).
	hideSystemLineInReadingMode(el);
}

