import { EditorSelection, EditorState } from "@codemirror/state";
import { EditorView } from "@codemirror/view";
import { App, editorInfoField, editorLivePreviewField } from "obsidian";
import { createBuiltInVslinkoScopeExtension } from "../scope-extension";

type ViewOptions = {
	builtInEnabled: boolean;
	scopeToEnhancedList: boolean;
	enhancedListEnabled: boolean;
	livePreview: boolean;
};

function createView(options: ViewOptions) {
	const app = new App();
	const file = (app.vault as any)._addFile("test.md", "- item");

	const plugin = {
		app,
		settings: {
			// Enhanced List scope
			enhancedListEnabledFolders: [],
			enhancedListEnabledFiles: options.enhancedListEnabled ? [file.path] : [],

			// Built-in modules
			builtInObsidianOutlinerEnabled: options.builtInEnabled,
			builtInObsidianZoomEnabled: false,

			// New scoping toggle
			builtInVslinkoScopeToEnhancedList: options.scopeToEnhancedList,
		},
	} as any;

	const parent = document.createElement("div");
	document.body.appendChild(parent);

	const scopeExtension = createBuiltInVslinkoScopeExtension(plugin);
	const state = EditorState.create({
		doc: "- item",
		extensions: [
			editorInfoField.init(() => ({ app, file } as any)),
			editorLivePreviewField.init(() => options.livePreview),
			scopeExtension,
		],
	});

	const view = new EditorView({ state, parent });
	// Trigger an update cycle to avoid relying on CM mount ordering details.
	view.dispatch({ selection: EditorSelection.cursor(1) });
	return { view, parent };
}

describe("built-in-vslinko/scope-extension", () => {
	test("adds scope class globally when scoping is disabled (default)", () => {
		const { view, parent } = createView({
			builtInEnabled: true,
			scopeToEnhancedList: false,
			enhancedListEnabled: false,
			livePreview: false,
		});

		try {
			expect(view.dom.classList.contains("blp-vslinko-scope")).toBe(true);
		} finally {
			view.destroy();
			parent.remove();
		}
	});

	test("adds scope class only for Enhanced List enabled files in Live Preview when scoping is enabled", () => {
		const { view, parent } = createView({
			builtInEnabled: true,
			scopeToEnhancedList: true,
			enhancedListEnabled: true,
			livePreview: true,
		});

		try {
			expect(view.dom.classList.contains("blp-vslinko-scope")).toBe(true);
		} finally {
			view.destroy();
			parent.remove();
		}
	});

	test("does not add scope class when file is not Enhanced List enabled in scoped mode", () => {
		const { view, parent } = createView({
			builtInEnabled: true,
			scopeToEnhancedList: true,
			enhancedListEnabled: false,
			livePreview: true,
		});

		try {
			expect(view.dom.classList.contains("blp-vslinko-scope")).toBe(false);
		} finally {
			view.destroy();
			parent.remove();
		}
	});

	test("does not add scope class when Live Preview is off in scoped mode", () => {
		const { view, parent } = createView({
			builtInEnabled: true,
			scopeToEnhancedList: true,
			enhancedListEnabled: true,
			livePreview: false,
		});

		try {
			expect(view.dom.classList.contains("blp-vslinko-scope")).toBe(false);
		} finally {
			view.destroy();
			parent.remove();
		}
	});

	test("does not add scope class when built-in modules are disabled", () => {
		const { view, parent } = createView({
			builtInEnabled: false,
			scopeToEnhancedList: false,
			enhancedListEnabled: false,
			livePreview: true,
		});

		try {
			expect(view.dom.classList.contains("blp-vslinko-scope")).toBe(false);
		} finally {
			view.destroy();
			parent.remove();
		}
	});

	test("refreshes when editor info is mutated in-place (file switch)", () => {
		const app = new App();
		const fileA = (app.vault as any)._addFile("a.md", "- a");
		const fileB = (app.vault as any)._addFile("b.md", "- b");

		const plugin = {
			app,
			settings: {
				enhancedListEnabledFolders: [],
				enhancedListEnabledFiles: [fileB.path],

				builtInObsidianOutlinerEnabled: true,
				builtInObsidianZoomEnabled: false,
				builtInVslinkoScopeToEnhancedList: true,
			},
		} as any;

		const info: any = { app, file: fileA };

		const parent = document.createElement("div");
		document.body.appendChild(parent);

		const scopeExtension = createBuiltInVslinkoScopeExtension(plugin);
		const state = EditorState.create({
			doc: "- item",
			extensions: [
				editorInfoField.init(() => info),
				editorLivePreviewField.init(() => true),
				scopeExtension,
			],
		});

		const view = new EditorView({ state, parent });
		view.dispatch({ selection: EditorSelection.cursor(1) });

		try {
			expect(view.dom.classList.contains("blp-vslinko-scope")).toBe(false);

			info.file = fileB;
			view.dispatch({ selection: EditorSelection.cursor(2) });

			expect(view.dom.classList.contains("blp-vslinko-scope")).toBe(true);
		} finally {
			view.destroy();
			parent.remove();
		}
	});
});
