import { EditorState } from "@codemirror/state";
import { EditorView } from "@codemirror/view";
import { DetectClickOnBullet } from "../../../vendor/vslinko/obsidian-zoom/logic/DetectClickOnBullet";
import { DragAndDrop } from "../../../vendor/vslinko/obsidian-outliner/features/DragAndDrop";
import { VerticalLines } from "../../../vendor/vslinko/obsidian-outliner/features/VerticalLines";

function createEditorView() {
	const parent = document.createElement("div");
	document.body.appendChild(parent);
	const state = EditorState.create({ doc: "- item" });
	const view = new EditorView({ state, parent });
	return { view, parent };
}

describe("built-in-vslinko scope gating", () => {
	test("outliner drag-and-drop does not intercept clicks out of scope", () => {
		const { view, parent } = createEditorView();

		const dnd = new DragAndDrop({} as any, { dragAndDrop: true } as any, {} as any, {} as any, {} as any);

		const bulletEl = document.createElement("span");
		bulletEl.classList.add("cm-formatting-list");
		view.dom.appendChild(bulletEl);

		const preventDefault = jest.fn();
		const stopPropagation = jest.fn();
		const e: any = { target: bulletEl, x: 1, y: 1, preventDefault, stopPropagation };

		try {
			(dnd as any).handleMouseDown(e);
			expect(preventDefault).not.toHaveBeenCalled();
			expect(stopPropagation).not.toHaveBeenCalled();

			view.dom.classList.add("blp-vslinko-scope");
			(dnd as any).handleMouseDown(e);
			expect(preventDefault).toHaveBeenCalledTimes(1);
			expect(stopPropagation).toHaveBeenCalledTimes(1);
		} finally {
			view.destroy();
			parent.remove();
		}
	});

	test("zoom click-on-bullet does not trigger out of scope", () => {
		const clickOnBullet = { clickOnBullet: jest.fn() };
		const detector = new DetectClickOnBullet({ zoomOnClick: true } as any, clickOnBullet as any);

		const view: any = {
			dom: document.createElement("div"),
			posAtDOM: jest.fn(() => 42),
		};

		const bulletEl = document.createElement("span");
		bulletEl.classList.add("cm-formatting-list");

		const e: any = { target: bulletEl };

		(detector as any).detectClickOnBullet(e, view);
		expect(clickOnBullet.clickOnBullet).toHaveBeenCalledTimes(0);

		view.dom.classList.add("blp-vslinko-scope");
		(detector as any).detectClickOnBullet(e, view);
		expect(clickOnBullet.clickOnBullet).toHaveBeenCalledTimes(1);
		expect(clickOnBullet.clickOnBullet).toHaveBeenCalledWith(view, 42);
	});

	test("outliner vertical lines do not inject DOM out of scope", async () => {
		jest.useFakeTimers();

		const registered: any[] = [];
		const plugin: any = {
			registerEditorExtension: (ext: any) => registered.push(ext),
		};

		const feature = new VerticalLines(
			plugin,
			{ verticalLines: true, verticalLinesAction: "none", onChange: jest.fn(), removeCallback: jest.fn() } as any,
			{} as any,
			{} as any,
		);

		await feature.load();
		expect(registered).toHaveLength(1);

		const parent = document.createElement("div");
		document.body.appendChild(parent);
		const state = EditorState.create({ doc: "- item", extensions: [registered[0]] });
		const view = new EditorView({ state, parent });

		try {
			jest.runOnlyPendingTimers();
			expect(view.dom.querySelector(".outliner-plugin-list-lines-scroller")).toBeNull();
		} finally {
			view.destroy();
			parent.remove();
			await feature.unload();
			jest.useRealTimers();
		}
	});
});

