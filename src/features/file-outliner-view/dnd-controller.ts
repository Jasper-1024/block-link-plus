import type { OutlinerMoveWhere } from "./engine";

export type OutlinerDndDrop = {
	targetId: string;
	where: OutlinerMoveWhere;
};

type OutlinerDndPreStart = {
	sourceId: string;
	pointerId: number;
	startX: number;
	startY: number;
};

type OutlinerDndState = {
	sourceId: string;
	pointerId: number;
	drop: OutlinerDndDrop | null;
};

export type OutlinerDndHost = {
	isEnabled: () => boolean;
	hasOutlinerFile: () => boolean;
	getEditingId: () => string | null;
	exitEditMode: (id: string) => void;
	getContentEl: () => HTMLElement;
	ensureRoot: () => void;
	getRootEl: () => HTMLElement | null;
	getBlockEl: (id: string) => HTMLElement | null;
	isSelfOrDescendant: (rootId: string, id: string) => boolean;
	applyDrop: (sourceId: string, drop: OutlinerDndDrop) => void;
	debugLog: (scope: string, err: unknown) => void;
};

export class OutlinerDndController {
	private readonly host: OutlinerDndHost;

	private preStart: OutlinerDndPreStart | null = null;
	private state: OutlinerDndState | null = null;
	private indicatorEl: HTMLElement | null = null;
	private dropTargetId: string | null = null;
	private lastEndAt = 0;

	constructor(host: OutlinerDndHost) {
		this.host = host;
	}

	getLastEndAt(): number {
		return this.lastEndAt;
	}

	onSettingsChanged(): void {
		if (this.host.isEnabled()) return;
		this.preStart = null;
		if (this.state) this.stopDragging({ apply: false });
	}

	clear(): void {
		this.preStart = null;
		this.state = null;
		this.dropTargetId = null;
		this.lastEndAt = 0;

		try {
			document.body.classList.remove("blp-outliner-dragging");
		} catch (err) {
			this.host.debugLog("dnd/clear/bodyClass.remove", err);
		}

		try {
			this.indicatorEl?.remove();
		} catch (err) {
			this.host.debugLog("dnd/clear/indicator.remove", err);
		}
		this.indicatorEl = null;
	}

	onPointerDown(sourceId: string, evt: PointerEvent): void {
		if (evt.button !== 0) return;
		if (!this.host.hasOutlinerFile()) return;
		if (!this.host.isEnabled()) return;
		if (this.state) return;

		this.preStart = {
			sourceId,
			pointerId: evt.pointerId,
			startX: evt.clientX,
			startY: evt.clientY,
		};

		try {
			(evt.currentTarget as HTMLElement | null)?.setPointerCapture?.(evt.pointerId);
		} catch (err) {
			this.host.debugLog("dnd/pointerDown/setPointerCapture", err);
		}
	}

	onPointerMove(evt: PointerEvent): void {
		const pre = this.preStart;
		if (pre && evt.pointerId === pre.pointerId) {
			if (!this.host.isEnabled()) return;
			const dx = evt.clientX - pre.startX;
			const dy = evt.clientY - pre.startY;
			if (Math.hypot(dx, dy) >= 4) {
				this.startDragging(pre);
			}
		}

		const state = this.state;
		if (!state) return;
		if (evt.pointerId !== state.pointerId) return;

		if (!this.host.isEnabled()) {
			this.stopDragging({ apply: false });
			return;
		}

		evt.preventDefault();

		const drop = this.computeDropVariant(evt.clientX, evt.clientY, state.sourceId);
		state.drop = drop;
		this.renderDropIndicator(drop);
	}

	onPointerUp(evt: PointerEvent): void {
		const pre = this.preStart;
		if (pre && evt.pointerId === pre.pointerId) {
			this.preStart = null;
		}

		try {
			(evt.currentTarget as HTMLElement | null)?.releasePointerCapture?.(evt.pointerId);
		} catch (err) {
			this.host.debugLog("dnd/pointerUp/releasePointerCapture", err);
		}

		const state = this.state;
		if (!state) return;
		if (evt.pointerId !== state.pointerId) return;

		this.stopDragging({ apply: true });
	}

	onPointerCancel(evt: PointerEvent): void {
		const pre = this.preStart;
		if (pre && evt.pointerId === pre.pointerId) {
			this.preStart = null;
		}

		try {
			(evt.currentTarget as HTMLElement | null)?.releasePointerCapture?.(evt.pointerId);
		} catch (err) {
			this.host.debugLog("dnd/pointerCancel/releasePointerCapture", err);
		}

		const state = this.state;
		if (!state) return;
		if (evt.pointerId !== state.pointerId) return;

		this.stopDragging({ apply: false });
	}

	private startDragging(pre: OutlinerDndPreStart): void {
		this.preStart = null;
		if (!this.host.hasOutlinerFile()) return;
		if (!this.host.isEnabled()) return;

		// Ensure latest editor value is committed before we perform structural moves.
		const editingId = this.host.getEditingId();
		if (editingId) {
			try {
				this.host.exitEditMode(editingId);
			} catch (err) {
				this.host.debugLog("dnd/startDragging/exitEditMode", err);
			}
		}

		this.state = { sourceId: pre.sourceId, pointerId: pre.pointerId, drop: null };

		try {
			document.body.classList.add("blp-outliner-dragging");
		} catch (err) {
			this.host.debugLog("dnd/startDragging/bodyClass.add", err);
		}

		this.host.getBlockEl(pre.sourceId)?.classList.add("is-blp-outliner-dnd-source");
		this.ensureDropIndicator();
	}

	private stopDragging(opts: { apply: boolean }): void {
		const state = this.state;
		this.state = null;
		this.preStart = null;

		if (!state) return;

		this.lastEndAt = Date.now();

		try {
			document.body.classList.remove("blp-outliner-dragging");
		} catch (err) {
			this.host.debugLog("dnd/stopDragging/bodyClass.remove", err);
		}

		this.host.getBlockEl(state.sourceId)?.classList.remove("is-blp-outliner-dnd-source");
		if (this.dropTargetId) {
			this.host.getBlockEl(this.dropTargetId)?.classList.remove("is-blp-outliner-dnd-target");
		}
		this.dropTargetId = null;
		this.renderDropIndicator(null);

		const drop = state.drop;
		if (!opts.apply || !drop || !this.host.hasOutlinerFile()) return;
		this.host.applyDrop(state.sourceId, drop);
	}

	private computeDropVariant(x: number, y: number, sourceId: string): OutlinerDndDrop | null {
		const hit = document.elementFromPoint(x, y) as HTMLElement | null;
		if (!hit) return null;

		const contentEl = this.host.getContentEl();
		if (!contentEl.contains(hit)) return null;

		const blockEl = hit.closest(".ls-block") as HTMLElement | null;
		if (!blockEl) return null;

		const targetId = blockEl.dataset.blpOutlinerId;
		if (!targetId) return null;
		if (this.host.isSelfOrDescendant(sourceId, targetId)) return null;

		const rowEl = blockEl.querySelector(":scope > .block-main-container") as HTMLElement | null;
		const rowRect = rowEl?.getBoundingClientRect() ?? blockEl.getBoundingClientRect();

		const contentWrap = blockEl.querySelector(
			":scope > .block-main-container > .block-content-wrapper"
		) as HTMLElement | null;
		const contentRect = contentWrap?.getBoundingClientRect() ?? rowRect;

		const childrenContainer = blockEl.querySelector(":scope > .block-children-container") as HTMLElement | null;
		const childrenOffsetPx = childrenContainer
			? Number.parseFloat(getComputedStyle(childrenContainer).marginLeft) || 0
			: 0;

		const baseWhere: OutlinerMoveWhere = y < rowRect.top + rowRect.height / 2 ? "before" : "after";

		let where: OutlinerMoveWhere = baseWhere;
		if (baseWhere === "after" && childrenOffsetPx > 0) {
			// Similar to Logseq: dragging horizontally (toward the content) indents as a child.
			const insideThreshold = Math.max(12, Math.min(24, childrenOffsetPx * 0.6));
			if (x > contentRect.left + insideThreshold) where = "inside";
		}

		return { targetId, where };
	}

	private ensureDropIndicator(): void {
		if (this.indicatorEl && this.host.getRootEl()?.contains(this.indicatorEl)) return;
		this.host.ensureRoot();
		const root = this.host.getRootEl();
		if (!root) return;

		const el = document.createElement("div");
		el.className = "blp-outliner-dnd-indicator";
		el.style.display = "none";
		root.appendChild(el);
		this.indicatorEl = el;
	}

	private renderDropIndicator(drop: OutlinerDndDrop | null): void {
		const indicator = this.indicatorEl;
		const root = this.host.getRootEl();
		if (!indicator || !root) return;

		// Clear previous target highlight.
		if (!drop && this.dropTargetId) {
			this.host.getBlockEl(this.dropTargetId)?.classList.remove("is-blp-outliner-dnd-target");
			this.dropTargetId = null;
		}

		if (!drop) {
			indicator.style.display = "none";
			return;
		}

		const targetEl = this.host.getBlockEl(drop.targetId);
		if (!targetEl) {
			indicator.style.display = "none";
			return;
		}

		if (this.dropTargetId !== drop.targetId) {
			if (this.dropTargetId) {
				this.host.getBlockEl(this.dropTargetId)?.classList.remove("is-blp-outliner-dnd-target");
			}
			this.dropTargetId = drop.targetId;
			targetEl.classList.add("is-blp-outliner-dnd-target");
		}

		const rootRect = root.getBoundingClientRect();
		const targetRect = targetEl.getBoundingClientRect();

		const contentWrap = targetEl.querySelector(
			":scope > .block-main-container > .block-content-wrapper"
		) as HTMLElement | null;
		const contentRect = contentWrap?.getBoundingClientRect() ?? targetRect;

		const childrenContainer = targetEl.querySelector(":scope > .block-children-container") as HTMLElement | null;
		const childrenOffsetPx = childrenContainer
			? Number.parseFloat(getComputedStyle(childrenContainer).marginLeft) || 0
			: 0;

		const lineLeft = drop.where === "inside" ? contentRect.left + childrenOffsetPx : contentRect.left;
		const lineTop = drop.where === "before" ? targetRect.top : targetRect.bottom;

		const left = Math.max(0, lineLeft - rootRect.left);
		const top = Math.max(0, lineTop - rootRect.top);
		const width = Math.max(16, rootRect.right - lineLeft - 12);

		indicator.style.display = "";
		indicator.style.left = `${Math.round(left)}px`;
		indicator.style.top = `${Math.round(top)}px`;
		indicator.style.width = `${Math.round(width)}px`;
	}
}

