import { SearchComponent, setIcon } from "obsidian";
import i18n from "shared/i18n";

type SearchMatch = { id: string; from: number; to: number; range: Range };
type SearchHost = {
	container: HTMLElement;
	getBlockIds: () => string[];
	getDisplay: (id: string) => HTMLElement | null;
	getRow: (id: string) => HTMLElement | null;
	prepareBlock: (id: string) => Promise<void>;
	reveal: (id: string) => void;
	close: () => void;
};

function literalPattern(query: string): RegExp {
	return new RegExp(query.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "giu");
}

/** One rendered-text model supplies counts AND exact ranges, including embeds. */
function renderedMatches(id: string, display: HTMLElement, query: string): SearchMatch[] {
	const doc = display.ownerDocument;
	const win = doc.defaultView!;
	const nodes: { node: Node; from: number; to: number }[] = [];
	let text = "";
	let previousBoundary: Element | null = null;
	const walker = doc.createTreeWalker(display, NodeFilter.SHOW_TEXT | NodeFilter.SHOW_ELEMENT, {
		acceptNode: node => {
			if (node.nodeType === Node.ELEMENT_NODE && (node as Element).tagName !== "BR") return NodeFilter.FILTER_SKIP;
			let parent = node.parentElement;
			while (parent && parent !== display) {
				if (parent.matches("script, style, button, input, .blp-outliner-block-warning") ||
					parent.hidden || parent.getAttribute("aria-hidden") === "true" ||
					win.getComputedStyle(parent).display === "none") return NodeFilter.FILTER_REJECT;
				parent = parent.parentElement;
			}
			return NodeFilter.FILTER_ACCEPT;
		},
	});
	while (walker.nextNode()) {
		const node = walker.currentNode;
		if (node.nodeType === Node.ELEMENT_NODE) { text += "\n"; continue; }
		const boundary = node.parentElement?.closest("p, li, pre, td, th, blockquote, h1, h2, h3, h4, h5, h6") ?? null;
		if (text && boundary !== previousBoundary) text += "\n";
		previousBoundary = boundary;
		const from = text.length;
		text += node.textContent ?? "";
		nodes.push({ node, from, to: text.length });
	}
	const result: SearchMatch[] = [];
	for (const match of text.matchAll(literalPattern(query))) {
		const from = match.index!, to = from + match[0].length;
		const first = nodes.find(n => n.from <= from && n.to > from);
		const last = nodes.find(n => n.from < to && n.to >= to);
		if (!first || !last) continue;
		const range = doc.createRange();
		range.setStart(first.node, from - first.from);
		range.setEnd(last.node, to - last.from);
		result.push({ id, from, to, range });
	}
	return result;
}

let searchSerial = 0;

/** View-local find UI. CSS Highlights never replace rendered DOM or enter an editor. */
export class OutlinerPageSearch {
	readonly el: HTMLElement;
	private readonly input: HTMLInputElement;
	private readonly count: HTMLElement;
	private readonly previous: HTMLButtonElement;
	private readonly next: HTMLButtonElement;
	private readonly style: HTMLStyleElement;
	private readonly observer: MutationObserver;
	private readonly allName = `blp-find-${Date.now()}-${++searchSerial}`;
	private readonly activeName = `${this.allName}-active`;
	private matches: SearchMatch[] = [];
	private index = -1;
	private query = "";
	private frame: number | null = null;
	private activeRow: HTMLElement | null = null;
	private preparing = true;
	private disposed = false;

	constructor(private readonly host: SearchHost) {
		const labels = i18n.settings.fileOutliner.search;
		const doc = host.container.ownerDocument;
		this.el = doc.createElement("div");
		this.el.className = "blp-outliner-page-search";
		this.el.setAttribute("role", "search");
		this.el.setAttribute("aria-busy", "true");
		host.container.prepend(this.el);
		const search = new SearchComponent(this.el);
		search.setPlaceholder(labels.placeholder).onChange(value => {
			this.query = value;
			this.reindex(false);
		});
		this.input = search.inputEl;
		this.input.setAttribute("aria-label", labels.placeholder);
		this.count = this.el.createSpan({ cls: "blp-outliner-search-count", text: "…" });
		this.count.setAttribute("role", "status");
		this.count.setAttribute("aria-live", "polite");
		const button = (label: string, icon: string, action: () => void) => {
			const el = this.el.createEl("button", { cls: "clickable-icon", attr: { "aria-label": label, title: label, type: "button" } });
			setIcon(el, icon);
			el.addEventListener("click", action);
			return el;
		};
		this.previous = button(labels.previous, "arrow-up", () => this.move(-1));
		this.next = button(labels.next, "arrow-down", () => this.move(1));
		button(labels.close, "x", host.close);
		this.previous.disabled = this.next.disabled = true;
		this.el.addEventListener("keydown", event => {
			if (event.isComposing) return;
			if (event.key === "Escape") { event.preventDefault(); event.stopPropagation(); host.close(); }
			else if (event.key === "Enter") { event.preventDefault(); event.stopPropagation(); this.move(event.shiftKey ? -1 : 1); }
		});
		this.style = doc.createElement("style");
		this.style.textContent = `::highlight(${this.allName}) { background-color: var(--text-highlight-bg); }
			::highlight(${this.activeName}) { background-color: var(--interactive-accent); color: var(--text-on-accent); }`;
		doc.head.appendChild(this.style);
		this.observer = new MutationObserver(records => {
			if (this.preparing || this.frame !== null || !records.some(record => !this.el.contains(record.target))) return;
			this.frame = requestAnimationFrame(() => { this.frame = null; this.reindex(true); });
		});
		this.observer.observe(host.container, { childList: true, subtree: true, characterData: true });
		void this.prepare();
	}

	private async prepare(): Promise<void> {
		try {
			const ids = this.host.getBlockIds();
			// On-demand, batched preparation includes offscreen/folded embeds.
			// Never rerender a block while moving between search results.
			for (let i = 0; i < ids.length && !this.disposed; i += 8) {
				await Promise.all(ids.slice(i, i + 8).map(id => this.host.prepareBlock(id)));
				await new Promise(resolve => setTimeout(resolve, 0));
			}
		} finally {
			if (!this.disposed) {
				this.preparing = false;
				this.el.setAttribute("aria-busy", "false");
				this.reindex(false);
			}
		}
	}

	focus(): void { this.input.focus({ preventScroll: true }); this.input.select(); }

	private reindex(preserve: boolean): void {
		if (this.disposed || this.preparing) return;
		const previous = preserve ? this.matches[this.index] : null;
		this.matches = [];
		if (this.query) for (const id of this.host.getBlockIds()) {
			const display = this.host.getDisplay(id);
			if (display) this.matches.push(...renderedMatches(id, display, this.query));
		}
		const previousIndex = previous ? this.matches.findIndex(m => m.id === previous.id && m.from === previous.from && m.to === previous.to) : -1;
		this.index = previousIndex >= 0 ? previousIndex : this.matches.length ? 0 : -1;
		this.previous.disabled = this.next.disabled = !this.matches.length;
		this.selectCurrent(!preserve);
	}

	private move(direction: number): void {
		if (!this.matches.length) return;
		this.index = (this.index + direction + this.matches.length) % this.matches.length;
		this.selectCurrent(true);
		this.input.focus({ preventScroll: true });
	}

	private selectCurrent(reveal: boolean): void {
		this.count.textContent = `${this.index + 1} / ${this.matches.length}`;
		this.activeRow?.classList.remove("is-blp-search-active");
		this.activeRow = null;
		const match = this.matches[this.index];
		if (match) {
			if (reveal) this.host.reveal(match.id);
			this.activeRow = this.host.getRow(match.id);
			this.activeRow?.classList.add("is-blp-search-active");
		}
		const win = this.el.ownerDocument.defaultView as any;
		const registry = win?.CSS?.highlights;
		if (registry && win.Highlight) {
			registry.set(this.allName, new win.Highlight(...this.matches.map(m => m.range)));
			registry.set(this.activeName, new win.Highlight(...(match ? [match.range] : [])));
		}
		if (match && reveal) {
			const rect = match.range.getBoundingClientRect();
			const host = this.host.container.getBoundingClientRect();
			const top = Math.max(host.top, this.el.getBoundingClientRect().bottom);
			if (rect.top < top) this.host.container.scrollTop += rect.top - top;
			else if (rect.bottom > host.bottom) this.host.container.scrollTop += rect.bottom - host.bottom;
		}
	}

	destroy(): void {
		this.disposed = true;
		this.observer.disconnect();
		if (this.frame !== null) cancelAnimationFrame(this.frame);
		const registry = (this.el.ownerDocument.defaultView as any)?.CSS?.highlights;
		registry?.delete(this.allName);
		registry?.delete(this.activeName);
		this.activeRow?.classList.remove("is-blp-search-active");
		this.style.remove();
		this.el.remove();
	}
}
