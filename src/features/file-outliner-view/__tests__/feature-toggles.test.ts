import i18n from "shared/i18n";
import { notifyFileOutlinerViewsSettingsChanged } from "features/file-outliner-view";

import { DEFAULT_SETTINGS } from "../../../types";

describe("file outliner view feature toggles", () => {
	test("defaults preserve current behavior", () => {
		expect(DEFAULT_SETTINGS.fileOutlinerDragAndDropEnabled).toBe(true);
		expect(DEFAULT_SETTINGS.fileOutlinerZoomEnabled).toBe(true);
		expect(DEFAULT_SETTINGS.fileOutlinerActiveHighlightEnabled).toBe(true);
	});

	test("i18n provides toggle strings for en/zh/zh-TW", () => {
		const langs = ["en", "zh", "zh-TW"] as const;

		for (const lang of langs) {
			const ui = (i18n as any).all?.[lang]?.settings?.fileOutliner;
			expect(ui).toBeTruthy();

			for (const key of ["dragAndDrop", "zoom", "activeHighlight"] as const) {
				expect(typeof ui[key]?.name).toBe("string");
				expect(String(ui[key]?.name)).not.toBe("");
				expect(typeof ui[key]?.desc).toBe("string");
				expect(String(ui[key]?.desc)).not.toBe("");
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

