export type ObsidianLanguage = "en" | "zh" | "zh-TW";

export function shouldShowWhatsNew(lastSeenVersion: string, currentVersion: string): boolean {
	if (!lastSeenVersion) return false;
	return lastSeenVersion !== currentVersion;
}

export type WhatsNewStartupDecision =
	| { kind: "none" }
	| { kind: "record"; lastSeenVersion: string }
	| { kind: "show"; lastSeenVersion: string; previousVersion: string };

export function decideWhatsNewOnStartup(params: {
	currentVersion: string;
	lastSeenVersion: string;
	hasExistingData: boolean;
}): WhatsNewStartupDecision {
	const lastSeenVersion = params.lastSeenVersion ?? "";

	if (!lastSeenVersion) {
		// First install: no previous saved data.
		if (!params.hasExistingData) {
			return { kind: "record", lastSeenVersion: params.currentVersion };
		}

		// Upgrade from a version that didn't track lastSeenVersion yet.
		return { kind: "show", lastSeenVersion: params.currentVersion, previousVersion: "" };
	}

	if (lastSeenVersion === params.currentVersion) return { kind: "none" };

	return {
		kind: "show",
		lastSeenVersion: params.currentVersion,
		previousVersion: lastSeenVersion,
	};
}

export function getChangelogUrl(lang: ObsidianLanguage): string {
	const baseUrl = "https://block-link-plus.jasper1024.com";
	if (lang === "en") return `${baseUrl}/en/changelog/`;
	if (lang === "zh-TW") return `${baseUrl}/zh-TW/changelog/`;
	return `${baseUrl}/changelog/`;
}
