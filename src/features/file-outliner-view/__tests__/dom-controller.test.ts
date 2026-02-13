import { OutlinerDomController, type OutlinerDomDnd } from "../dom-controller";

describe("file-outliner-view/dom-controller", () => {
	test("creates block dom and wires core interactions", () => {
		const calls = {
			enter: 0,
			zoom: 0,
			toggleCollapsed: 0,
			openMenu: 0,
			insertAfter: 0,
		};

		const dnd: OutlinerDomDnd = {
			getLastEndAt: () => 0,
			onPointerDown: () => undefined,
			onPointerMove: () => undefined,
			onPointerUp: () => undefined,
			onPointerCancel: () => undefined,
		};

		let zoomEnabled = true;

		const dom = new OutlinerDomController({
			isZoomEnabled: () => zoomEnabled,
			getBlockTextLength: () => 5,
			enterEditMode: () => {
				calls.enter += 1;
			},
			zoomInto: () => {
				calls.zoom += 1;
			},
			toggleCollapsed: () => {
				calls.toggleCollapsed += 1;
			},
			openBulletMenu: () => {
				calls.openMenu += 1;
			},
			insertAfterBlock: () => {
				calls.insertAfter += 1;
			},
			getDnd: () => dnd,
		});

		const el = dom.ensureBlockElement("abc");
		document.body.appendChild(el);

		const foldToggle = el.querySelector(".blp-outliner-fold-toggle") as HTMLButtonElement;
		expect(foldToggle).toBeTruthy();
		foldToggle.dispatchEvent(new MouseEvent("click", { bubbles: true, cancelable: true }));
		expect(calls.toggleCollapsed).toBe(1);

		const insertHint = el.querySelector(".blp-outliner-insert-hint") as HTMLElement;
		expect(insertHint).toBeTruthy();
		insertHint.dispatchEvent(new MouseEvent("click", { bubbles: true, cancelable: true }));
		expect(calls.insertAfter).toBe(1);

		const bulletContainer = el.querySelector(".bullet-container") as HTMLElement;
		expect(bulletContainer).toBeTruthy();
		bulletContainer.dispatchEvent(new MouseEvent("click", { bubbles: true, cancelable: true }));
		expect(calls.zoom).toBe(1);
		expect(calls.enter).toBe(0);

		zoomEnabled = false;
		bulletContainer.dispatchEvent(new MouseEvent("click", { bubbles: true, cancelable: true }));
		expect(calls.enter).toBe(1);

		bulletContainer.dispatchEvent(new MouseEvent("contextmenu", { bubbles: true, cancelable: true }));
		expect(calls.openMenu).toBe(1);

		const display = el.querySelector(".blp-file-outliner-display") as HTMLElement;
		expect(display).toBeTruthy();
		display.dispatchEvent(new MouseEvent("click", { bubbles: true, cancelable: true }));
		expect(calls.enter).toBe(2);

		expect(dom.getDisplayEl("abc")).toBeTruthy();
		expect(dom.getBlockContentEl("abc")).toBeTruthy();
		expect(dom.getChildrenEl("abc")).toBeTruthy();
	});
});

