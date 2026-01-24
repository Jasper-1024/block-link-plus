import { Notice } from "obsidian";

export function isThirdPartyPluginEnabled(plugin: { app?: any }, pluginId: string): boolean {
	try {
		return Boolean((plugin.app as any)?.plugins?.enabledPlugins?.has?.(pluginId));
	} catch {
		return false;
	}
}

export function syncBuiltInEnabledSettingWithExternalConflict(options: {
	plugin: { app?: any; settings: Record<string, any>; saveSettings?: () => Promise<void> | void };
	externalPluginId: string;
	settingsFlagKey: string;
	showNotice: boolean;
	noticeText: string;
}): { externalEnabled: boolean; desiredEnabled: boolean; didAutoDisable: boolean } {
	const externalEnabled = isThirdPartyPluginEnabled(options.plugin, options.externalPluginId);
	const currentEnabled = Boolean(options.plugin.settings?.[options.settingsFlagKey]);

	if (externalEnabled && currentEnabled) {
		options.plugin.settings[options.settingsFlagKey] = false;
		try {
			void options.plugin.saveSettings?.();
		} catch {
			// best effort
		}

		if (options.showNotice) {
			new Notice(options.noticeText, 5000);
		}

		return { externalEnabled, desiredEnabled: false, didAutoDisable: true };
	}

	return { externalEnabled, desiredEnabled: currentEnabled && !externalEnabled, didAutoDisable: false };
}

