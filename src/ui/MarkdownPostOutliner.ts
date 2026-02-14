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

	const hideTextNode = (tn: Text): HTMLElement => {
		const span = document.createElement("span");
		span.style.display = "none";
		span.setAttribute(OUTLINER_SYSTEM_LINE_HIDDEN_MARKER, OUTLINER_SYSTEM_LINE_HIDDEN_KIND_TOKEN);
		span.textContent = tn.nodeValue ?? "";
		tn.replaceWith(span);
		return span;
	};

	const hideChildNode = (n: ChildNode): HTMLElement | null => {
		if (n.nodeType === Node.TEXT_NODE) {
			const text = n.nodeValue ?? "";
			if (!text.trim()) return null;
			return hideTextNode(n as Text);
		}

		if (n.nodeType !== Node.ELEMENT_NODE) return null;
		const el = n as HTMLElement;
		hidePreviousBrChain(el, 2);
		el.style.display = "none";
		// Preserve existing token markers (created by step 0), so tests/debugging can still
		// observe which tokens were hidden.
		if (!el.hasAttribute(OUTLINER_SYSTEM_LINE_HIDDEN_MARKER)) {
			el.setAttribute(OUTLINER_SYSTEM_LINE_HIDDEN_MARKER, OUTLINER_SYSTEM_LINE_HIDDEN_KIND_ELEMENT);
		}
		return el;
	};

	// 0) Outliner v2: hide the entire tail line when the `[blp_sys:: 1]` marker is present.
	const markerWalker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT);
	const markerTextNodes: Text[] = [];
	let markerNode: Text | null = markerWalker.nextNode() as Text | null;
	while (markerNode) {
		markerTextNodes.push(markerNode);
		markerNode = markerWalker.nextNode() as Text | null;
	}

	for (const textNode of markerTextNodes) {
		// Also hide system tail tokens when the embed preview doesn't render as a <li>
		// (e.g. block reference previews in embeds). Still avoid touching code blocks.
		if (!textNode.parentElement) continue;
		if (textNode.parentElement.closest("pre, code")) continue;

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
	// Outliner v2 system tail lines: hide the whole "system segment" when the protocol marker is present.
	//
	// Primary marker: `blp_sys=1`
	// Fallback marker: `blp_ver=2` (Dataview can omit `blp_sys` in some embed renders, leaving raw `blp_sys1` text).
	const allInlineFieldKeys = Array.from(el.querySelectorAll<HTMLElement>(".dataview.inline-field-key"));
	const getDvKeyName = (keyEl: HTMLElement): string => {
		const dvKey = keyEl.getAttribute("data-dv-key") ?? keyEl.getAttribute("data-dv-norm-key") ?? "";
		return (dvKey || (keyEl.textContent ?? "")).trim().toLowerCase();
	};

	const sysMarkerKeys = allInlineFieldKeys.filter((keyEl) => getDvKeyName(keyEl) === "blp_sys");
	const verMarkerKeys =
		sysMarkerKeys.length > 0 ? [] : allInlineFieldKeys.filter((keyEl) => getDvKeyName(keyEl) === "blp_ver");
	const markerKeysToUse = sysMarkerKeys.length > 0 ? sysMarkerKeys : verMarkerKeys;

	for (const keyEl of Array.from(markerKeysToUse)) {
		const fieldEl = keyEl.closest(".dataview.inline-field") as HTMLElement | null;
		if (!fieldEl) continue;

		const valueEl = fieldEl.querySelector(".dataview.inline-field-value") as HTMLElement | null;
		const valueText = (valueEl?.textContent ?? "").trim();
		const keyName = getDvKeyName(keyEl);
		if (keyName === "blp_sys" && valueText !== "1") continue;
		if (keyName === "blp_ver" && valueText !== "2") continue;

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

			// Dataview can omit `blp_sys` as a structured inline-field in embeds. Once the system
			// segment is identified via markers, hide any remaining raw `blp_` tokens too.
			const sysTokenWalker = document.createTreeWalker(li, NodeFilter.SHOW_TEXT);
			const sysTokenTextNodes: Text[] = [];
			let st: Text | null = sysTokenWalker.nextNode() as Text | null;
			while (st) {
				sysTokenTextNodes.push(st);
				st = sysTokenWalker.nextNode() as Text | null;
			}

			for (const tn of sysTokenTextNodes) {
				if (tn.parentElement?.closest("pre, code")) continue;
				const raw = tn.nodeValue ?? "";
				if (!/blp_sys|blp_ver/i.test(raw)) continue;
				hideTextNode(tn);
			}
		}
	}

	// 2) Fallback: Dataview (or other renderers) may omit the `blp_sys` key element but still leave a
	// `blp_sys` token as raw text (e.g. "blp_sys1"). In that case, hide the whole "system line"
	// segment bounded by <br> siblings.
	//
	// This is intentionally conservative: require a preceding <br> to avoid hiding inline mentions
	// inside the main block content.
	const sysTextWalker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT);
	const sysTextNodes: Text[] = [];
	let sysNode: Text | null = sysTextWalker.nextNode() as Text | null;
	while (sysNode) {
		sysTextNodes.push(sysNode);
		sysNode = sysTextWalker.nextNode() as Text | null;
	}

	for (const tn of sysTextNodes) {
		const raw = (tn.nodeValue ?? "").toLowerCase();
		if (!raw.includes("blp_sys")) continue;
		if (tn.parentElement?.closest("pre, code")) continue;

		const li = tn.parentElement?.closest("li") as HTMLElement | null;
		const root = li ?? tn.parentElement;
		if (!root) continue;
		const rootText = (root.textContent ?? "").toLowerCase();
		if (!rootText.includes("blp_ver")) continue;

		// Find the direct child of `root` that contains this text node.
		let direct: ChildNode = tn;
		while (direct.parentElement && direct.parentElement !== root) {
			direct = direct.parentElement;
		}
		if (direct.parentNode !== root) continue;

		// Find a "line break" boundary before the system tail segment.
		// In some embed previews, markdown uses a literal `\\n` in a text node (no <br> tags).
		let boundary: ChildNode | null = direct.previousSibling;
		while (boundary) {
			if (boundary.nodeType === Node.ELEMENT_NODE && (boundary as Element).tagName === "BR") break;
			if (boundary.nodeType === Node.TEXT_NODE && (boundary.nodeValue ?? "").includes("\n")) break;
			boundary = boundary.previousSibling;
		}
		if (!boundary) continue;

		if (boundary.nodeType === Node.ELEMENT_NODE && (boundary as Element).tagName === "BR") {
			// Hide the boundary <br> itself to avoid leaving an empty line.
			try {
				(boundary as HTMLElement).style.display = "none";
				(boundary as HTMLElement).setAttribute(OUTLINER_SYSTEM_LINE_HIDDEN_MARKER, OUTLINER_SYSTEM_LINE_HIDDEN_KIND_ELEMENT);
			} catch {
				// ignore
			}
		} else if (boundary.nodeType === Node.TEXT_NODE) {
			// Remove the trailing newline so the hidden system line doesn't leave a blank gap.
			const value = boundary.nodeValue ?? "";
			const idx = value.lastIndexOf("\n");
			if (idx !== -1) {
				boundary.nodeValue = value.slice(0, idx).replace(/[ \t]+$/, "");
			}
		}

		// Hide everything between the boundary and the next content boundary (or nested list).
		let cursor: ChildNode | null = boundary.nextSibling;
		while (cursor) {
			if (cursor.nodeType === Node.ELEMENT_NODE) {
				const tag = (cursor as Element).tagName;
				if (tag === "UL" || tag === "OL") break;
				if (tag === "BR") break;
			} else if (cursor.nodeType === Node.TEXT_NODE && (cursor.nodeValue ?? "").includes("\n")) {
				break;
			}

			const next = cursor.nextSibling;
			hideChildNode(cursor);
			cursor = next;
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
	private applyTimer: number | null = null;

	constructor(containerEl: HTMLElement, plugin: BlockLinkPlus) {
		super(containerEl);
		this.plugin = plugin;
		this.lastHideSetting = plugin.settings.fileOutlinerHideSystemLine;
	}

	private withObserverSuspended(fn: () => void): void {
		if (!this.observer) {
			fn();
			return;
		}

		// `hideSystemLineInReadingMode()` can replace text nodes with hidden spans, which triggers
		// `childList` mutations. Without suspending the observer, we can enter an infinite loop:
		// mutation -> hide -> mutation -> hide -> ...
		try {
			this.observer.disconnect();
		} catch {
			// ignore
		}

		try {
			fn();
		} finally {
			try {
				this.observer.observe(this.containerEl, { childList: true, subtree: true });
			} catch {
				// ignore
			}
		}
	}

	private scheduleApply(): void {
		if (this.applyTimer != null) return;

		this.applyTimer = window.setTimeout(() => {
			this.applyTimer = null;
			if (!this.observer) return;
			if (!this.containerEl?.isConnected) return;

			const nextHide = this.plugin.settings.fileOutlinerHideSystemLine;
			this.withObserverSuspended(() => {
				if (nextHide) {
					hideSystemLineInReadingMode(this.containerEl);
				} else {
					unhideSystemLineInReadingMode(this.containerEl);
				}
			});
			this.lastHideSetting = nextHide;
		}, 0);
	}

	onload(): void {
		this.observer = new MutationObserver(() => {
			const nextHide = this.plugin.settings.fileOutlinerHideSystemLine;
			// Re-apply after late renderers (e.g. Dataview) mutate the DOM. Debounce so we don't
			// thrash on large/rapid render updates.
			if (nextHide) {
				this.scheduleApply();
				return;
			}

			// If the user just toggled hide off, wait for the next DOM mutation and unhide once.
			if (this.lastHideSetting !== nextHide) {
				this.scheduleApply();
			}
		});

		// Initial pass: apply once before we start observing.
		this.withObserverSuspended(() => {
			if (this.plugin.settings.fileOutlinerHideSystemLine) {
				hideSystemLineInReadingMode(this.containerEl);
			} else {
				unhideSystemLineInReadingMode(this.containerEl);
			}
		});
	}

	onunload(): void {
		if (this.applyTimer != null) {
			window.clearTimeout(this.applyTimer);
			this.applyTimer = null;
		}
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
				'.dataview.inline-field-key[data-dv-key="blp_sys"], .dataview.inline-field-key[data-dv-norm-key="blp_sys"], .dataview.inline-field-key[data-dv-key="blp_ver"], .dataview.inline-field-key[data-dv-norm-key="blp_ver"]'
			)
		) || /blp_sys|blp_ver/i.test(el.textContent ?? "");

	if (!isFileOutlinerEnabledFile(plugin, file) && !hasMarker) return;

	// Dataview (and other processors) may render after us; observe and re-apply.
	if (typeof (ctx as any)?.addChild === "function" && !el.hasAttribute(OUTLINER_READING_MODE_HIDER_MARKER)) {
		el.setAttribute(OUTLINER_READING_MODE_HIDER_MARKER, "1");
		ctx.addChild(new OutlinerReadingModeHiderChild(el, plugin));
	}

	// Apply once eagerly (the child observer will keep it up-to-date for late renders).
	hideSystemLineInReadingMode(el);
}
