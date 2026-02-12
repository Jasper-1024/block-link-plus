export type OutlinerTaskMarker = "todo" | "done";

export type ParsedOutlinerTaskMarker = {
	marker: OutlinerTaskMarker;
	rest: string;
};

const TODO_PREFIX = "[ ] ";
const DONE_PREFIX_LOWER = "[x] ";
const DONE_PREFIX_UPPER = "[X] ";

export function parseTaskMarkerPrefix(firstLine: string): ParsedOutlinerTaskMarker | null {
	const line = String(firstLine ?? "");

	if (line.startsWith(TODO_PREFIX)) return { marker: "todo", rest: line.slice(TODO_PREFIX.length) };
	if (line.startsWith(DONE_PREFIX_LOWER)) return { marker: "done", rest: line.slice(DONE_PREFIX_LOWER.length) };
	if (line.startsWith(DONE_PREFIX_UPPER)) return { marker: "done", rest: line.slice(DONE_PREFIX_UPPER.length) };

	return null;
}

export function stripTaskMarkerPrefix(firstLine: string): string {
	const parsed = parseTaskMarkerPrefix(firstLine);
	return parsed ? parsed.rest : String(firstLine ?? "");
}

/**
 * Toggle task *status* marker on the first line.
 * - `[ ] foo` -> `[x] foo`
 * - `[x] foo` -> `[ ] foo`
 * - `foo` -> `[ ] foo`
 */
export function toggleTaskStatusMarkerPrefix(firstLine: string): string {
	const line = String(firstLine ?? "");
	const parsed = parseTaskMarkerPrefix(line);

	if (!parsed) return `${TODO_PREFIX}${line}`;
	if (parsed.marker === "todo") return `${DONE_PREFIX_LOWER}${parsed.rest}`;
	return `${TODO_PREFIX}${parsed.rest}`;
}

/**
 * Toggle between task vs normal block marker on the first line.
 * - `foo` -> `[ ] foo`
 * - `[ ] foo` -> `foo`
 * - `[x] foo` -> `foo`
 */
export function toggleTaskMarkerPrefix(firstLine: string): string {
	const line = String(firstLine ?? "");
	const parsed = parseTaskMarkerPrefix(line);
	if (!parsed) return `${TODO_PREFIX}${line}`;
	return parsed.rest;
}

export type OutlinerTaskMarkerFromBlockText = {
	marker: OutlinerTaskMarker;
	checked: boolean;
	renderText: string;
};

/**
 * Extract a task marker from the first line of a block's text, and return a render-text that
 * removes the marker prefix (while preserving remaining lines verbatim).
 */
export function getTaskMarkerFromBlockText(text: string): OutlinerTaskMarkerFromBlockText | null {
	const doc = String(text ?? "");
	const nl = doc.indexOf("\n");
	const firstLineEnd = nl >= 0 ? nl : doc.length;

	const firstLine = doc.slice(0, firstLineEnd);
	const parsed = parseTaskMarkerPrefix(firstLine);
	if (!parsed) return null;

	const renderText = `${parsed.rest}${doc.slice(firstLineEnd)}`;
	const checked = parsed.marker === "done";
	return { marker: parsed.marker, checked, renderText };
}

