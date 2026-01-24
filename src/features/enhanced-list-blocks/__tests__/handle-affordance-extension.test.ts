import { EditorSelection, EditorState } from "@codemirror/state";
import { EditorView } from "@codemirror/view";
import { App, editorInfoField, editorLivePreviewField } from "obsidian";
import { createEnhancedListHandleAffordanceExtension } from "../handle-affordance-extension";

type ViewOptions = {
	enabled: boolean;
	livePreview: boolean;
	handleEnabled: boolean;
};

function createView(options: ViewOptions) {
	const app = new App();
	const file = (app.vault as any)._addFile("test.md", "- item");

	const plugin = {
		app,
		settings: {
			enhancedListEnabledFolders: [],
			enhancedListEnabledFiles: options.enabled ? [file.path] : [],
			enhancedListHandleAffordance: options.handleEnabled,
		},
	} as any;

	const parent = document.createElement("div");
	document.body.appendChild(parent);

	const handleExtension = createEnhancedListHandleAffordanceExtension(plugin, {
		infoField: editorInfoField,
		livePreviewField: editorLivePreviewField,
	});
	const state = EditorState.create({
		doc: "- item",
		extensions: [
			editorInfoField.init(() => ({ app, file, hoverPopover: null } as any)),
			editorLivePreviewField.init(() => options.livePreview),
			handleExtension,
		],
	});

	const view = new EditorView({ state, parent });
	view.dispatch({ selection: EditorSelection.cursor(1) });
	return { view, parent };
}

describe("enhanced-list-blocks/handle-affordance-extension", () => {
	test("adds handle class for enabled files in Live Preview", () => {
		const { view, parent } = createView({
			enabled: true,
			livePreview: true,
			handleEnabled: true,
		});

		try {
			expect(view.dom.classList.contains("blp-enhanced-list-handle")).toBe(true);
		} finally {
			view.destroy();
			parent.remove();
		}
	});

	test("skips when Live Preview is off", () => {
		const { view, parent } = createView({
			enabled: true,
			livePreview: false,
			handleEnabled: true,
		});

		try {
			expect(view.dom.classList.contains("blp-enhanced-list-handle")).toBe(false);
		} finally {
			view.destroy();
			parent.remove();
		}
	});

	test("skips when file is not enabled", () => {
		const { view, parent } = createView({
			enabled: false,
			livePreview: true,
			handleEnabled: true,
		});

		try {
			expect(view.dom.classList.contains("blp-enhanced-list-handle")).toBe(false);
		} finally {
			view.destroy();
			parent.remove();
		}
	});

	test("skips when handle setting is disabled", () => {
		const { view, parent } = createView({
			enabled: true,
			livePreview: true,
			handleEnabled: false,
		});

		try {
			expect(view.dom.classList.contains("blp-enhanced-list-handle")).toBe(false);
		} finally {
			view.destroy();
			parent.remove();
		}
	});
});
