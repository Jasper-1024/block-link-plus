import i18n from "shared/i18n";
import { notifyFileOutlinerViewsSettingsChanged } from "features/file-outliner-view";

import { DEFAULT_SETTINGS } from "../../../types";

describe("file outliner view feature toggles", () => {
	test("defaults preserve current behavior", () => {
		expect(DEFAULT_SETTINGS.fileOutlinerDragAndDropEnabled).toBe(true);
		expect(DEFAULT_SETTINGS.fileOutlinerZoomEnabled).toBe(true);
		expect(DEFAULT_SETTINGS.fileOutlinerEmphasisLineEnabled).toBe(true);
		expect(DEFAULT_SETTINGS.fileOutlinerDebugLogging).toBe(false);
		expect(DEFAULT_SETTINGS.fileOutlinerEditorContextMenuEnabled).toBe(true);
		expect(DEFAULT_SETTINGS.fileOutlinerEditorContextMenuAllowedPlugins).toEqual([]);
	});

	test("i18n provides toggle strings for en/zh/zh-TW", () => {
		const langs = ["en", "zh", "zh-TW"] as const;

		for (const lang of langs) {
			const ui = (i18n as any).all?.[lang]?.settings?.fileOutliner;
			expect(ui).toBeTruthy();

			for (const key of ["dragAndDrop", "zoom", "emphasisLine", "debug"] as const) {
				expect(typeof ui[key]?.name).toBe("string");
				expect(String(ui[key]?.name)).not.toBe("");
				expect(typeof ui[key]?.desc).toBe("string");
				expect(String(ui[key]?.desc)).not.toBe("");
			}

			for (const key of ["enabled", "allowedPlugins"] as const) {
				expect(typeof ui.editorContextMenu?.[key]?.name).toBe("string");
				expect(String(ui.editorContextMenu?.[key]?.name)).not.toBe("");
				expect(typeof ui.editorContextMenu?.[key]?.desc).toBe("string");
				expect(String(ui.editorContextMenu?.[key]?.desc)).not.toBe("");
			}

			expect(typeof ui.tasksHelp?.name).toBe("string");
			expect(String(ui.tasksHelp?.name)).not.toBe("");
			expect(typeof ui.tasksHelp?.desc).toBe("string");
			expect(String(ui.tasksHelp?.desc)).not.toBe("");

			for (const key of ["toggleTaskStatus", "toggleTaskMarker"] as const) {
				expect(typeof ui.commands?.[key]).toBe("string");
				expect(String(ui.commands?.[key])).not.toBe("");
			}

			for (const key of [
				"copyBlockReference",
				"copyBlockEmbed",
				"copyBlockUrl",
				"convertToTask",
				"convertToNormalBlock",
				"copy",
				"cut",
				"paste",
				"pasteAsText",
				"delete",
				"collapse",
				"expand",
			] as const) {
				expect(typeof ui.contextMenu?.[key]).toBe("string");
				expect(String(ui.contextMenu?.[key])).not.toBe("");
			}
		}
	});

	test("notifier calls open outliner leaves", () => {
		const viewWithHook = { onFileOutlinerSettingsChanged: jest.fn() };
		const viewWithoutHook = {};

		const plugin: any = {
			app: {
				workspace: {
					getLeavesOfType: jest.fn(() => [{ view: viewWithHook }, { view: viewWithoutHook }]),
				},
			},
		};

		notifyFileOutlinerViewsSettingsChanged(plugin);

		expect(plugin.app.workspace.getLeavesOfType).toHaveBeenCalled();
		expect(viewWithHook.onFileOutlinerSettingsChanged).toHaveBeenCalledTimes(1);
	});
});
