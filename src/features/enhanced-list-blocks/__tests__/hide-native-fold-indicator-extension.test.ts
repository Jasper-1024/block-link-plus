import { EditorSelection, EditorState } from "@codemirror/state";
import { EditorView } from "@codemirror/view";
import { App, editorInfoField, editorLivePreviewField } from "obsidian";
import {
	BLP_HIDE_NATIVE_FOLD_INDICATOR_CLASS,
	createEnhancedListHideNativeFoldIndicatorExtension,
} from "../hide-native-fold-indicator-extension";

type ViewOptions = {
	enabled: boolean;
	livePreview: boolean;
	hideEnabled: boolean;
};

function createView(options: ViewOptions) {
	const app = new App();
	const file = (app.vault as any)._addFile("test.md", "- item");

	const plugin = {
		app,
		settings: {
			enhancedListEnabledFolders: [],
			enhancedListEnabledFiles: options.enabled ? [file.path] : [],
			enhancedListHideNativeFoldIndicator: options.hideEnabled,
		},
	} as any;

	const parent = document.createElement("div");
	document.body.appendChild(parent);

	const ext = createEnhancedListHideNativeFoldIndicatorExtension(plugin, {
		infoField: editorInfoField,
		livePreviewField: editorLivePreviewField,
	});
	const state = EditorState.create({
		doc: "- item",
		extensions: [
			editorInfoField.init(() => ({ app, file, hoverPopover: null } as any)),
			editorLivePreviewField.init(() => options.livePreview),
			ext,
		],
	});

	const view = new EditorView({ state, parent });
	view.dispatch({ selection: EditorSelection.cursor(1) });
	return { view, parent };
}

describe("enhanced-list-blocks/hide-native-fold-indicator-extension", () => {
	test("adds class for enabled files in Live Preview", () => {
		const { view, parent } = createView({ enabled: true, livePreview: true, hideEnabled: true });

		try {
			expect(view.dom.classList.contains(BLP_HIDE_NATIVE_FOLD_INDICATOR_CLASS)).toBe(true);
		} finally {
			view.destroy();
			parent.remove();
		}
	});

	test("skips when Live Preview is off", () => {
		const { view, parent } = createView({ enabled: true, livePreview: false, hideEnabled: true });

		try {
			expect(view.dom.classList.contains(BLP_HIDE_NATIVE_FOLD_INDICATOR_CLASS)).toBe(false);
		} finally {
			view.destroy();
			parent.remove();
		}
	});

	test("skips when file is not enabled", () => {
		const { view, parent } = createView({ enabled: false, livePreview: true, hideEnabled: true });

		try {
			expect(view.dom.classList.contains(BLP_HIDE_NATIVE_FOLD_INDICATOR_CLASS)).toBe(false);
		} finally {
			view.destroy();
			parent.remove();
		}
	});

	test("skips when setting is disabled", () => {
		const { view, parent } = createView({ enabled: true, livePreview: true, hideEnabled: false });

		try {
			expect(view.dom.classList.contains(BLP_HIDE_NATIVE_FOLD_INDICATOR_CLASS)).toBe(false);
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
				enhancedListHideNativeFoldIndicator: true,
			},
		} as any;

		const info: any = { app, file: fileA, hoverPopover: null };

		const parent = document.createElement("div");
		document.body.appendChild(parent);

		const ext = createEnhancedListHideNativeFoldIndicatorExtension(plugin, {
			infoField: editorInfoField,
			livePreviewField: editorLivePreviewField,
		});
		const state = EditorState.create({
			doc: "- item",
			extensions: [
				editorInfoField.init(() => info),
				editorLivePreviewField.init(() => true),
				ext,
			],
		});

		const view = new EditorView({ state, parent });
		view.dispatch({ selection: EditorSelection.cursor(1) });

		try {
			expect(view.dom.classList.contains(BLP_HIDE_NATIVE_FOLD_INDICATOR_CLASS)).toBe(false);

			info.file = fileB;
			view.dispatch({ selection: EditorSelection.cursor(2) });

			expect(view.dom.classList.contains(BLP_HIDE_NATIVE_FOLD_INDICATOR_CLASS)).toBe(true);
		} finally {
			view.destroy();
			parent.remove();
		}
	});
});

