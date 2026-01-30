import { Parser } from "../../services/Parser";
import { VerticalLinesPluginValue } from "../VerticalLines";

function createParser() {
	// Parser only needs `settings.keepCursorWithinContent` and a logger with `bind()`.
	return new Parser({ bind: () => () => {} } as any, { keepCursorWithinContent: "bullet-and-checkbox" } as any);
}

describe("vendored obsidian-outliner VerticalLines: syncLineXOffset zoom min-level anchor", () => {
	test("anchors x-offset to the shallowest visible bullet level (prevents drift under zoom)", () => {
		jest.useFakeTimers();

		const parser = createParser();
		const viewDom = document.createElement("div");
		const view: any = { dom: viewDom };

		const pluginValue = new VerticalLinesPluginValue({} as any, {} as any, parser as any, view as any);

		// Stub DOM containers expected by syncLineXOffset().
		const container = document.createElement("div");
		(container as any).getBoundingClientRect = () => ({
			left: 0,
			top: 0,
			right: 0,
			bottom: 0,
			width: 0,
			height: 0,
		});
		(pluginValue as any).contentContainer = container;

		// Two rendered vertical stripes: the outer-most one is misaligned (x=32 instead of x=23).
		const stripeOuter = document.createElement("div");
		stripeOuter.style.display = "block";
		(stripeOuter as any).getBoundingClientRect = () => ({
			left: 30, // stripeX = left + 2 = 32
			top: 0,
			right: 35,
			bottom: 100,
			width: 5,
			height: 100,
		});

		const stripeInner = document.createElement("div");
		stripeInner.style.display = "block";
		(stripeInner as any).getBoundingClientRect = () => ({
			left: 39, // stripeX = 41
			top: 0,
			right: 44,
			bottom: 100,
			width: 5,
			height: 100,
		});

		(pluginValue as any).lineElements = [stripeOuter, stripeInner];

		// Visible bullet lines for a zoomed subtree: shallowest level is 2.
		const makeBulletLine = (level: number, bulletCenterX: number, extraClass = "") => {
			const line = document.createElement("div");
			line.className = `${extraClass} HyperMD-list-line HyperMD-list-line-${level} cm-line`;

			const formatting = document.createElement("span");
			formatting.className = "cm-formatting-list-ul";
			const bullet = document.createElement("span");
			bullet.className = "list-bullet";
			(bullet as any).getBoundingClientRect = () => ({
				left: bulletCenterX - 3,
				top: 0,
				right: bulletCenterX + 3,
				bottom: 10,
				width: 6,
				height: 10,
			});

			formatting.appendChild(bullet);
			line.appendChild(formatting);
			return line;
		};

		const dest = makeBulletLine(2, 23);
		const srcChild = makeBulletLine(3, 32, "cm-active");
		viewDom.appendChild(dest);
		viewDom.appendChild(srcChild);

		// Start with an offset that currently aligns stripes to the active (level-3) bullet.
		viewDom.style.setProperty("--blp-outliner-line-x-offset", "25px");

		const originalGetComputedStyle = window.getComputedStyle;
		(window as any).getComputedStyle = (_el: any, pseudo?: string) => {
			if (pseudo) return { width: "0", left: "0" } as any;
			return originalGetComputedStyle(_el);
		};

		try {
			(pluginValue as any).syncLineXOffset();

			const next = parseFloat(viewDom.style.getPropertyValue("--blp-outliner-line-x-offset"));
			// dx = 23 - 32 = -9, so 25 + (-9) = 16
			expect(next).toBeCloseTo(16, 6);
		} finally {
			(window as any).getComputedStyle = originalGetComputedStyle;
			pluginValue.destroy();
			jest.runOnlyPendingTimers();
			jest.useRealTimers();
		}
	});
});

