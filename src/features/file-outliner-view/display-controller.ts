import { Component, MarkdownRenderer } from "obsidian";

import i18n from "shared/i18n";
import type BlockLinkPlus from "../../main";
import { fileOutlinerMarkdownPostProcessor } from "../../ui/MarkdownPostOutliner";
import { sanitizeOutlinerBlockMarkdownForDisplay } from "./block-markdown";
import { DisplayRenderScheduler } from "./display-render-scheduler";
import { normalizeInternalMarkdownEmbeds } from "./embed-dom";
import type { OutlinerBlock } from "./protocol";
import { getTaskMarkerFromBlockText } from "./task-marker";

export type OutlinerDisplayHost = {
	app: any;
	plugin: BlockLinkPlus;
	contentEl: HTMLElement;

	getSourcePath: () => string;
	getEditingId: () => string | null;
	getBlock: (id: string) => OutlinerBlock | null;
	getDisplayEl: (id: string) => HTMLElement | null;
	getRowElEntries: () => Iterable<[string, HTMLElement]>;

	addChildComponent: () => Component;
	removeChildComponent: (component: Component) => void;

	toggleTaskStatusForBlock: (id: string) => void;

	debugLog: (scope: string, err: unknown) => void;
	tryOrLog: (scope: string, fn: () => void) => void;
};

export class OutlinerDisplayController {
	private readonly host: OutlinerDisplayHost;

	private readonly scheduler = new DisplayRenderScheduler();
	private readonly renderSeqById = new Map<string, number>();
	private readonly componentById = new Map<string, Component>();

	private displayRenderDrainTimer: number | null = null;
	private visibleRefreshTimer: number | null = null;

	private readonly visibleBufferPx = 500;

	constructor(host: OutlinerDisplayHost) {
		this.host = host;
	}

	public reset(): void {
		this.scheduler.reset();
		this.renderSeqById.clear();

		if (this.displayRenderDrainTimer) {
			window.clearTimeout(this.displayRenderDrainTimer);
			this.displayRenderDrainTimer = null;
		}
		if (this.visibleRefreshTimer) {
			window.clearTimeout(this.visibleRefreshTimer);
			this.visibleRefreshTimer = null;
		}

		for (const component of this.componentById.values()) {
			this.host.tryOrLog("display/reset/removeChild", () => this.host.removeChildComponent(component));
		}
		this.componentById.clear();
	}

	public removeBlock(id: string): void {
		this.scheduler.remove(id);
		this.renderSeqById.delete(id);
		const prev = this.componentById.get(id);
		if (prev) {
			this.host.tryOrLog("display/removeBlock/removeChild", () => this.host.removeChildComponent(prev));
			this.componentById.delete(id);
		}
	}

	public markNeedsRender(id: string): void {
		this.scheduler.markNeedsRender(id);
	}

	public markRendered(id: string): void {
		this.scheduler.markRendered(id);
	}

	public ensurePlaceholderAndScheduleFirstRender(id: string): void {
		if (this.host.getEditingId() === id) return;
		const display = this.host.getDisplayEl(id);
		if (!display) return;
		if (display.childNodes.length !== 0) return;

		this.renderBlockPlaceholder(id);
		this.scheduler.markNeedsRender(id);
	}

	public scheduleVisibleBlockRefresh(): void {
		if (this.visibleRefreshTimer) return;
		this.visibleRefreshTimer = window.setTimeout(() => {
			this.visibleRefreshTimer = null;
			try {
				this.refreshVisibleBlocksFromDom();
			} catch (err) {
				this.host.debugLog("display/scheduleVisibleBlockRefresh/refreshVisibleBlocksFromDom", err);
			}
			this.scheduleDisplayRenderDrain();
		}, 0);
	}

	public refreshVisibleBlocksFromDom(): void {
		const rootRect = this.host.contentEl.getBoundingClientRect();
		const top = rootRect.top - this.visibleBufferPx;
		const bottom = rootRect.bottom + this.visibleBufferPx;

		for (const [id, rowEl] of this.host.getRowElEntries()) {
			let visible = false;
			try {
				// If the row is not in the layout tree (e.g., collapsed subtree), treat it as non-visible.
				if (rowEl.getClientRects().length > 0) {
					const r = rowEl.getBoundingClientRect();
					visible = r.bottom >= top && r.top <= bottom;
				}
			} catch (err) {
				this.host.debugLog("display/refreshVisibleBlocksFromDom/rowRect", err);
			}
			this.scheduler.setVisible(id, visible);
		}
	}

	public scheduleDisplayRenderDrain(): void {
		if (this.displayRenderDrainTimer) return;
		this.displayRenderDrainTimer = window.setTimeout(() => {
			this.displayRenderDrainTimer = null;
			this.drainDisplayRenderQueue();
		}, 0);
	}

	public drainDisplayRenderQueue(): void {
		const budget = 12;
		const ids = this.scheduler.takeNextBatch(budget);
		for (const id of ids) {
			// Do not render the actively edited block.
			if (id === this.host.getEditingId()) continue;
			try {
				this.renderBlockDisplay(id);
			} catch (err) {
				// Keep draining so one bad block can't stall all subsequent renders.
				this.host.debugLog("display/drain/renderBlockDisplay", err);
				this.scheduler.markRendered(id);
			}
		}

		if (this.scheduler.hasPendingWork()) {
			this.scheduleDisplayRenderDrain();
		}
	}

	public renderBlockPlaceholder(id: string): void {
		const b = this.host.getBlock(id);
		const display = this.host.getDisplayEl(id);
		if (!b || !display) return;
		if (this.host.getEditingId() === id) return;

		const task = getTaskMarkerFromBlockText(b.text ?? "");
		const text = task ? task.renderText : String(b.text ?? "");

		const p = document.createElement("p");
		p.textContent = text;

		if (!task) {
			display.replaceChildren(p);
			return;
		}

		const row = document.createElement("div");
		row.className = "blp-outliner-task-row";

		const checkbox = document.createElement("input");
		checkbox.type = "checkbox";
		checkbox.className = "blp-outliner-task-checkbox";
		checkbox.checked = task.checked;
		checkbox.addEventListener("click", (evt) => {
			evt.stopPropagation();
			this.host.toggleTaskStatusForBlock(id);
		});
		row.appendChild(checkbox);

		const content = document.createElement("div");
		content.className = "blp-outliner-task-content";
		content.appendChild(p);
		row.appendChild(content);

		display.replaceChildren(row);
	}

	public renderBlockDisplay(id: string): void {
		const b = this.host.getBlock(id);
		if (!b) return;
		if (!this.host.getDisplayEl(id)) return;

		const seq = (this.renderSeqById.get(id) ?? 0) + 1;
		this.renderSeqById.set(id, seq);

		const task = getTaskMarkerFromBlockText(b.text ?? "");
		const renderText = task ? task.renderText : (b.text ?? "");
		const md = sanitizeOutlinerBlockMarkdownForDisplay(renderText);
		const sourcePath = this.host.getSourcePath();
		const tmp = document.createElement("div");
		tmp.classList.add("markdown-rendered");
		const component = this.host.addChildComponent();

		void MarkdownRenderer.render(this.host.app, md.sanitized, tmp, sourcePath, component)
			.then(() => {
				// If another render happened since we started, discard this one.
				if (this.renderSeqById.get(id) !== seq) {
					this.host.tryOrLog("display/renderBlockDisplay/discard/removeChild(component)", () =>
						this.host.removeChildComponent(component)
					);
					return;
				}

				const display = this.host.getDisplayEl(id);
				if (!display) {
					this.host.tryOrLog("display/renderBlockDisplay/noDisplay/removeChild(component)", () =>
						this.host.removeChildComponent(component)
					);
					this.renderSeqById.delete(id);
					return;
				}

				// Avoid preview-only affordances inside the v2 outliner UI.
				this.host.tryOrLog("display/renderBlockDisplay/removeCopyCodeButtons", () => {
					tmp.querySelectorAll("button.copy-code-button").forEach((btn) => btn.remove());
				});

				// MarkdownRenderer embeds inside this view can miss `.markdown-embed-content`, which breaks
				// reading-range (`^id-id`) rendering and other post-processing that expects native embed DOM.
				this.host.tryOrLog("display/renderBlockDisplay/normalizeInternalMarkdownEmbeds", () =>
					normalizeInternalMarkdownEmbeds(tmp)
				);

				// Hide outliner v2 system tail lines inside embeds rendered by MarkdownRenderer.
				// Call the post-processor before insertion so it doesn't early-return for `.blp-file-outliner-view`.
				if (this.host.plugin.settings.fileOutlinerHideSystemLine !== false) {
					this.host.tryOrLog("display/renderBlockDisplay/hideSystemLines", () => {
						const hasMarker =
							Boolean(
								tmp.querySelector(
									'.dataview.inline-field-key[data-dv-key="blp_sys"], .dataview.inline-field-key[data-dv-norm-key="blp_sys"]'
								)
							) || (tmp.textContent ?? "").includes("blp_sys::");
						if (hasMarker) {
							fileOutlinerMarkdownPostProcessor(tmp, { sourcePath } as any, this.host.plugin);
						}
					});
				}

				const prev = this.componentById.get(id);

				if (md.issues.length > 0) {
					this.host.tryOrLog("display/renderBlockDisplay/issuesBanner", () => {
						const banner = document.createElement("div");
						banner.className = "blp-outliner-block-warning";

						const icon = document.createElement("span");
						icon.className = "blp-outliner-block-warning-icon";
						icon.textContent = "!";
						banner.appendChild(icon);

						const text = document.createElement("span");
						text.className = "blp-outliner-block-warning-text";
						text.textContent = String(
							(i18n.notices as any)?.fileOutlinerUnsupportedBlockMarkdown ??
								"Block contains list/heading syntax. Rendered as plain text to preserve outliner structure."
						);
						banner.appendChild(text);

						tmp.prepend(banner);
					});
				}

				if (task) {
					const row = document.createElement("div");
					row.className = "blp-outliner-task-row";

					const checkbox = document.createElement("input");
					checkbox.type = "checkbox";
					checkbox.className = "blp-outliner-task-checkbox";
					checkbox.checked = task.checked;
					checkbox.addEventListener("click", (evt) => {
						evt.stopPropagation();
						this.host.toggleTaskStatusForBlock(id);
					});
					row.appendChild(checkbox);

					const content = document.createElement("div");
					content.className = "blp-outliner-task-content";
					content.appendChild(tmp);
					row.appendChild(content);

					display.replaceChildren(row);
				} else {
					display.replaceChildren(tmp);
				}
				this.componentById.set(id, component);
				this.scheduler.markRendered(id);

				if (prev) {
					this.host.tryOrLog("display/renderBlockDisplay/removeChild(prev)", () => this.host.removeChildComponent(prev));
				}
			})
			.catch((err) => {
				this.host.debugLog("display/renderBlockDisplay/markdownRenderer", err);
				this.host.tryOrLog("display/renderBlockDisplay/catch/removeChild(component)", () =>
					this.host.removeChildComponent(component)
				);
			});
	}
}

