export type OutlinerDomDnd = {
	getLastEndAt: () => number;
	onPointerDown: (id: string, evt: PointerEvent) => void;
	onPointerMove: (evt: PointerEvent) => void;
	onPointerUp: (evt: PointerEvent) => void;
	onPointerCancel: (evt: PointerEvent) => void;
};

export type OutlinerDomHost = {
	isZoomEnabled: () => boolean;
	getBlockTextLength: (id: string) => number;
	enterEditMode: (id: string, opts: { cursorStart: number; cursorEnd: number; scroll: boolean }) => void;
	zoomInto: (id: string) => void;
	toggleCollapsed: (id: string) => void;
	openBulletMenu: (id: string, evt: MouseEvent) => void;
	insertAfterBlock: (id: string) => void;
	getDnd: () => OutlinerDomDnd;
	debugLog?: (scope: string, err: unknown) => void;
};

export class OutlinerDomController {
	private readonly host: OutlinerDomHost;

	private readonly blockElById = new Map<string, HTMLElement>();
	private readonly blockRowElById = new Map<string, HTMLElement>();
	private readonly blockContentElById = new Map<string, HTMLElement>();
	private readonly childrenContainerElById = new Map<string, HTMLElement>();
	private readonly childrenElById = new Map<string, HTMLElement>();
	private readonly displayElById = new Map<string, HTMLElement>();

	constructor(host: OutlinerDomHost) {
		this.host = host;
	}

	public clearBlocks(): void {
		for (const el of this.blockElById.values()) el.remove();
		this.blockElById.clear();
		this.blockRowElById.clear();
		this.blockContentElById.clear();
		this.childrenContainerElById.clear();
		this.childrenElById.clear();
		this.displayElById.clear();
	}

	public getBlockElEntries(): IterableIterator<[string, HTMLElement]> {
		return this.blockElById.entries();
	}

	public getRowElEntries(): IterableIterator<[string, HTMLElement]> {
		return this.blockRowElById.entries();
	}

	public getBlockEl(id: string): HTMLElement | null {
		return this.blockElById.get(id) ?? null;
	}

	public getBlockContentEl(id: string): HTMLElement | null {
		return this.blockContentElById.get(id) ?? null;
	}

	public getChildrenContainerEl(id: string): HTMLElement | null {
		return this.childrenContainerElById.get(id) ?? null;
	}

	public getChildrenEl(id: string): HTMLElement | null {
		return this.childrenElById.get(id) ?? null;
	}

	public getDisplayEl(id: string): HTMLElement | null {
		return this.displayElById.get(id) ?? null;
	}

	public removeBlock(id: string): void {
		const el = this.blockElById.get(id);
		if (el) el.remove();
		this.blockElById.delete(id);
		this.blockRowElById.delete(id);
		this.blockContentElById.delete(id);
		this.childrenContainerElById.delete(id);
		this.childrenElById.delete(id);
		this.displayElById.delete(id);
	}

	public ensureBlockElement(id: string): HTMLElement {
		const existing = this.blockElById.get(id);
		if (existing) return existing;

		const blockEl = document.createElement("div");
		blockEl.className = "ls-block";
		blockEl.dataset.blpOutlinerId = id;

		const main = document.createElement("div");
		main.className = "block-main-container items-baseline";
		blockEl.appendChild(main);
		this.blockRowElById.set(id, main);

		const controlWrap = document.createElement("div");
		controlWrap.className = "block-control-wrap items-center";
		main.appendChild(controlWrap);

		const foldToggle = document.createElement("button");
		foldToggle.type = "button";
		foldToggle.className = "blp-outliner-fold-toggle";
		foldToggle.addEventListener("click", (evt) => {
			evt.preventDefault();
			evt.stopPropagation();
			this.host.toggleCollapsed(id);
		});
		controlWrap.appendChild(foldToggle);

		const bulletContainer = document.createElement("span");
		bulletContainer.className = "bullet-container";
		controlWrap.appendChild(bulletContainer);

		const bullet = document.createElement("span");
		bullet.className = "bullet";
		bulletContainer.appendChild(bullet);

		const contentWrap = document.createElement("div");
		contentWrap.className = "block-content-wrapper";
		main.appendChild(contentWrap);

		const content = document.createElement("div");
		content.className = "block-content";
		contentWrap.appendChild(content);
		this.blockContentElById.set(id, content);

		const display = document.createElement("div");
		display.className = "blp-file-outliner-display";
		content.appendChild(display);
		this.displayElById.set(id, display);

		const onActivate = (evt: MouseEvent) => {
			// Let normal navigation/controls work (links, buttons, checkboxes, etc).
			const target = evt.target as HTMLElement | null;
			if (target?.closest("a, button, input, textarea")) return;
			// Embedded blocks (InlineEditEngine, native embeds) must remain interactive.
			if (target?.closest(".internal-embed, .markdown-embed, .markdown-embed-link")) return;
			const end = this.host.getBlockTextLength(id);
			this.host.enterEditMode(id, { cursorStart: end, cursorEnd: end, scroll: true });
		};

		display.addEventListener("click", onActivate);
		bulletContainer.addEventListener("click", (evt) => {
			evt.preventDefault();
			evt.stopPropagation();

			let lastEndAt = 0;
			try {
				lastEndAt = this.host.getDnd().getLastEndAt();
			} catch (err) {
				this.host.debugLog?.("dom/ensureBlockElement/getLastEndAt", err);
			}

			// Suppress click actions immediately after a drag gesture.
			if (Date.now() - lastEndAt < 250) return;

			if (this.host.isZoomEnabled() === false) {
				onActivate(evt);
				return;
			}
			this.host.zoomInto(id);
		});

		bulletContainer.addEventListener("pointerdown", (evt) => {
			try {
				this.host.getDnd().onPointerDown(id, evt);
			} catch (err) {
				this.host.debugLog?.("dom/ensureBlockElement/dnd/pointerdown", err);
			}
		});
		bulletContainer.addEventListener("pointermove", (evt) => {
			try {
				this.host.getDnd().onPointerMove(evt);
			} catch (err) {
				this.host.debugLog?.("dom/ensureBlockElement/dnd/pointermove", err);
			}
		});
		bulletContainer.addEventListener("pointerup", (evt) => {
			try {
				this.host.getDnd().onPointerUp(evt);
			} catch (err) {
				this.host.debugLog?.("dom/ensureBlockElement/dnd/pointerup", err);
			}
		});
		bulletContainer.addEventListener("pointercancel", (evt) => {
			try {
				this.host.getDnd().onPointerCancel(evt);
			} catch (err) {
				this.host.debugLog?.("dom/ensureBlockElement/dnd/pointercancel", err);
			}
		});
		bulletContainer.addEventListener("contextmenu", (evt) => {
			evt.preventDefault();
			evt.stopPropagation();
			this.host.openBulletMenu(id, evt);
		});

		const childrenContainer = document.createElement("div");
		childrenContainer.className = "block-children-container flex";
		blockEl.appendChild(childrenContainer);
		this.childrenContainerElById.set(id, childrenContainer);

		const leftBorder = document.createElement("div");
		leftBorder.className = "block-children-left-border";
		childrenContainer.appendChild(leftBorder);

		const children = document.createElement("div");
		children.className = "block-children w-full";
		childrenContainer.appendChild(children);
		this.childrenElById.set(id, children);

		const insertHint = document.createElement("div");
		insertHint.className = "blp-outliner-insert-hint";
		insertHint.addEventListener("click", (evt) => {
			evt.preventDefault();
			evt.stopPropagation();
			this.host.insertAfterBlock(id);
		});

		const insertIcon = document.createElement("div");
		insertIcon.className = "blp-outliner-insert-icon";
		insertIcon.textContent = "+";
		insertHint.appendChild(insertIcon);

		blockEl.appendChild(insertHint);

		this.blockElById.set(id, blockEl);
		return blockEl;
	}
}

