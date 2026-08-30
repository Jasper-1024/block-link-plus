import moment from "moment";

export type JournalDayLabel = {
	absolute: string;
	relative: "Today" | "Yesterday" | null;
};

/**
 * Keeps the configured date format as the primary label. Relative wording is
 * deliberately supplementary so a feed remains understandable while scrolling.
 */
export function getJournalDayLabel(ts: number, format: string, nowTs = Date.now()): JournalDayLabel {
	const day = moment(ts).startOf("day");
	const today = moment(nowTs).startOf("day");
	const dayDifference = day.diff(today, "days");

	return {
		absolute: day.isValid() ? day.format(format) : String(ts),
		relative: dayDifference === 0 ? "Today" : dayDifference === -1 ? "Yesterday" : null,
	};
}
