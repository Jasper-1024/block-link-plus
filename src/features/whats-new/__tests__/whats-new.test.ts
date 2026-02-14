import { decideWhatsNewOnStartup, getChangelogUrl, shouldShowWhatsNew } from "../index";

describe("features/whats-new", () => {
	describe("shouldShowWhatsNew", () => {
		test("does not show on first install", () => {
			expect(shouldShowWhatsNew("", "2.0.0")).toBe(false);
		});

		test("shows when version changed", () => {
			expect(shouldShowWhatsNew("1.9.0", "2.0.0")).toBe(true);
		});

		test("does not show when version unchanged", () => {
			expect(shouldShowWhatsNew("2.0.0", "2.0.0")).toBe(false);
		});
	});

	describe("decideWhatsNewOnStartup", () => {
		test("first install: records version and does not show", () => {
			expect(
				decideWhatsNewOnStartup({
					currentVersion: "2.0.0",
					lastSeenVersion: "",
					hasExistingData: false,
				})
			).toEqual({ kind: "record", lastSeenVersion: "2.0.0" });
		});

		test("upgrade from older version: shows with previous version", () => {
			expect(
				decideWhatsNewOnStartup({
					currentVersion: "2.0.0",
					lastSeenVersion: "1.9.0",
					hasExistingData: true,
				})
			).toEqual({ kind: "show", lastSeenVersion: "2.0.0", previousVersion: "1.9.0" });
		});

		test("upgrade from legacy data without lastSeenVersion: shows with unknown previous", () => {
			expect(
				decideWhatsNewOnStartup({
					currentVersion: "2.0.0",
					lastSeenVersion: "",
					hasExistingData: true,
				})
			).toEqual({ kind: "show", lastSeenVersion: "2.0.0", previousVersion: "" });
		});

		test("already recorded: does nothing", () => {
			expect(
				decideWhatsNewOnStartup({
					currentVersion: "2.0.0",
					lastSeenVersion: "2.0.0",
					hasExistingData: true,
				})
			).toEqual({ kind: "none" });
		});
	});

	describe("getChangelogUrl", () => {
		test("returns language-specific changelog urls", () => {
			expect(getChangelogUrl("en")).toBe("https://block-link-plus.jasper1024.com/en/changelog/");
			expect(getChangelogUrl("zh")).toBe("https://block-link-plus.jasper1024.com/changelog/");
			expect(getChangelogUrl("zh-TW")).toBe("https://block-link-plus.jasper1024.com/zh-TW/changelog/");
		});
	});
});
