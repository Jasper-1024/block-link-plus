import { EditorState } from "@codemirror/state";
import { EditorView } from "@codemirror/view";
import { App, editorInfoField, editorLivePreviewField } from "obsidian";
import { createEnhancedListHandleActionsExtension } from "../handle-actions-extension";

type ViewOptions = {
	enabled: boolean;
	livePreview: boolean;
	actionsEnabled: boolean;
	clickAction?: "toggle-folding" | "menu" | "none";
};

function createView(options: ViewOptions) {
	const app = new App();
	const file = (app.vault as any)._addFile("test.md", "- item");

	const plugin = {
		app,
		settings: {
			enhancedListEnabledFolders: [],
			enhancedListEnabledFiles: options.enabled ? [file.path] : [],
			enhancedListHandleActions: options.actionsEnabled,
			enhancedListHandleClickAction: options.clickAction ?? "toggle-folding",
		},
	} as any;

	const toggled: number[] = [];
	const menus: number[] = [];

	const parent = document.createElement("div");
	document.body.appendChild(parent);

	const handleExtension = createEnhancedListHandleActionsExtension(plugin, {
		infoField: editorInfoField,
		livePreviewField: editorLivePreviewField,
		resolveHandleLine: (_view, event) => {
			const target = event.target as HTMLElement | null;
			if (!target?.classList?.contains("cm-formatting-list-ul")) return null;
			return 0;
		},
		onToggleFold: (_view, line) => {
			toggled.push(line);
		},
		onShowMenu: (_view, line) => {
			menus.push(line);
		},
	});

	const state = EditorState.create({
		doc: "- item",
		extensions: [
			editorInfoField.init(() => ({ app, file, editor: { setCursor: jest.fn() } } as any)),
			editorLivePreviewField.init(() => options.livePreview),
			handleExtension,
		],
	});

	const view = new EditorView({ state, parent });
	const handleEl = document.createElement("span");
	handleEl.className = "cm-formatting-list-ul";
	(view as any).contentDOM?.appendChild(handleEl);

	return { view, parent, handleEl, toggled, menus };
}

describe("enhanced-list-blocks/handle-actions-extension", () => {
	test("clicking the handle triggers toggle when enabled", () => {
		const { view, parent, handleEl, toggled } = createView({
			enabled: true,
			livePreview: true,
			actionsEnabled: true,
			clickAction: "toggle-folding",
		});

		try {
			handleEl.dispatchEvent(new MouseEvent("click", { bubbles: true, cancelable: true }));
			expect(toggled).toEqual([0]);
		} finally {
			view.destroy();
			parent.remove();
		}
	});

	test("right-clicking the handle triggers menu when enabled", () => {
		const { view, parent, handleEl, menus } = createView({
			enabled: true,
			livePreview: true,
			actionsEnabled: true,
		});

		try {
			handleEl.dispatchEvent(new MouseEvent("contextmenu", { bubbles: true, cancelable: true }));
			expect(menus).toEqual([0]);
		} finally {
			view.destroy();
			parent.remove();
		}
	});

	test("clicking the handle opens menu when click action is menu", () => {
		const { view, parent, handleEl, toggled, menus } = createView({
			enabled: true,
			livePreview: true,
			actionsEnabled: true,
			clickAction: "menu",
		});

		try {
			handleEl.dispatchEvent(new MouseEvent("click", { bubbles: true, cancelable: true }));
			expect(toggled).toEqual([]);
			expect(menus).toEqual([0]);
		} finally {
			view.destroy();
			parent.remove();
		}
	});

	test("clicking the handle does nothing when click action is none (but right-click still works)", () => {
		const { view, parent, handleEl, toggled, menus } = createView({
			enabled: true,
			livePreview: true,
			actionsEnabled: true,
			clickAction: "none",
		});

		try {
			handleEl.dispatchEvent(new MouseEvent("click", { bubbles: true, cancelable: true }));
			handleEl.dispatchEvent(new MouseEvent("contextmenu", { bubbles: true, cancelable: true }));
			expect(toggled).toEqual([]);
			expect(menus).toEqual([0]);
		} finally {
			view.destroy();
			parent.remove();
		}
	});

	test("skips when Live Preview is off", () => {
		const { view, parent, handleEl, toggled, menus } = createView({
			enabled: true,
			livePreview: false,
			actionsEnabled: true,
		});

		try {
			handleEl.dispatchEvent(new MouseEvent("click", { bubbles: true, cancelable: true }));
			handleEl.dispatchEvent(new MouseEvent("contextmenu", { bubbles: true, cancelable: true }));
			expect(toggled).toEqual([]);
			expect(menus).toEqual([]);
		} finally {
			view.destroy();
			parent.remove();
		}
	});

	test("skips when file is not enabled", () => {
		const { view, parent, handleEl, toggled, menus } = createView({
			enabled: false,
			livePreview: true,
			actionsEnabled: true,
		});

		try {
			handleEl.dispatchEvent(new MouseEvent("click", { bubbles: true, cancelable: true }));
			handleEl.dispatchEvent(new MouseEvent("contextmenu", { bubbles: true, cancelable: true }));
			expect(toggled).toEqual([]);
			expect(menus).toEqual([]);
		} finally {
			view.destroy();
			parent.remove();
		}
	});

	test("skips when handle actions setting is disabled", () => {
		const { view, parent, handleEl, toggled, menus } = createView({
			enabled: true,
			livePreview: true,
			actionsEnabled: false,
		});

		try {
			handleEl.dispatchEvent(new MouseEvent("click", { bubbles: true, cancelable: true }));
			handleEl.dispatchEvent(new MouseEvent("contextmenu", { bubbles: true, cancelable: true }));
			expect(toggled).toEqual([]);
			expect(menus).toEqual([]);
		} finally {
			view.destroy();
			parent.remove();
		}
	});
});
