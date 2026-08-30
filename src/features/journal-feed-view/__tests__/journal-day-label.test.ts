import { getJournalDayLabel } from "../journal-day-label";

describe("journal-feed day labels", () => {
	it("keeps the configured absolute date while identifying today", () => {
		expect(getJournalDayLabel(Date.UTC(2026, 7, 30), "YYYY-MM-DD", Date.UTC(2026, 7, 30))).toEqual({
			absolute: "2026-08-30",
			relative: "Today",
		});
	});

	it("identifies yesterday without replacing the absolute date", () => {
		expect(getJournalDayLabel(Date.UTC(2026, 7, 29), "YYYY-MM-DD", Date.UTC(2026, 7, 30))).toEqual({
			absolute: "2026-08-29",
			relative: "Yesterday",
		});
	});
});
