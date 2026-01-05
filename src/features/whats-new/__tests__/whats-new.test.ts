import { getChangelogUrl, shouldShowWhatsNew } from "../index";

describe("features/whats-new", () => {
	describe("shouldShowWhatsNew", () => {
		test("does not show on first install", () => {
			expect(shouldShowWhatsNew("", "1.8.0")).toBe(false);
		});

		test("shows when version changed", () => {
			expect(shouldShowWhatsNew("1.7.6", "1.8.0")).toBe(true);
		});

		test("does not show when version unchanged", () => {
			expect(shouldShowWhatsNew("1.8.0", "1.8.0")).toBe(false);
		});
	});

	describe("getChangelogUrl", () => {
		test("returns language-specific changelog urls", () => {
			expect(getChangelogUrl("en")).toBe("https://obsidian-block-link-plus.jasper1024.com/en/changelog/");
			expect(getChangelogUrl("zh")).toBe("https://obsidian-block-link-plus.jasper1024.com/changelog/");
			expect(getChangelogUrl("zh-TW")).toBe("https://obsidian-block-link-plus.jasper1024.com/zh-TW/changelog/");
		});
	});
});

