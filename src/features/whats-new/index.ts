export type ObsidianLanguage = "en" | "zh" | "zh-TW";

export function shouldShowWhatsNew(lastSeenVersion: string, currentVersion: string): boolean {
	if (!lastSeenVersion) return false;
	return lastSeenVersion !== currentVersion;
}

export function getChangelogUrl(lang: ObsidianLanguage): string {
	const baseUrl = "https://obsidian-block-link-plus.jasper1024.com";
	if (lang === "en") return `${baseUrl}/en/changelog/`;
	if (lang === "zh-TW") return `${baseUrl}/zh-TW/changelog/`;
	return `${baseUrl}/changelog/`;
}

