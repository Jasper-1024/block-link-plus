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

/**
 * Ensure the first line has a task marker prefix (idempotent add; does not change `[x]` to `[ ]`).
 * - `foo` -> `[ ] foo`
 * - `[ ] foo` -> `[ ] foo`
 * - `[x] foo` -> `[x] foo`
 */
export function ensureTaskMarkerPrefix(firstLine: string): string {
	const line = String(firstLine ?? "");
	const parsed = parseTaskMarkerPrefix(line);
	if (parsed) return line;
	return `${TODO_PREFIX}${line}`;
}

/**
 * Ensure the first line of a block-text has a task marker prefix, preserving continuation lines verbatim.
 */
export function ensureTaskMarkerPrefixInBlockText(text: string): string {
	const doc = String(text ?? "");
	const nl = doc.indexOf("\n");
	const firstLineEnd = nl >= 0 ? nl : doc.length;
	const firstLine = doc.slice(0, firstLineEnd);
	return `${ensureTaskMarkerPrefix(firstLine)}${doc.slice(firstLineEnd)}`;
}

/**
 * Ensure the first line uses the todo marker prefix (`[ ] `), regardless of its current marker.
 * - `foo` -> `[ ] foo`
 * - `[x] foo` -> `[ ] foo`
 * - `[ ] foo` -> `[ ] foo`
 */
export function ensureTodoTaskMarkerPrefix(firstLine: string): string {
	const line = String(firstLine ?? "");
	const parsed = parseTaskMarkerPrefix(line);
	const rest = parsed ? parsed.rest : line;
	return `${TODO_PREFIX}${rest}`;
}

/**
 * Ensure the first line of a block-text uses the todo marker prefix (`[ ] `) while preserving
 * any continuation lines verbatim.
 */
export function ensureTodoTaskMarkerPrefixInBlockText(text: string): string {
	const doc = String(text ?? "");
	const nl = doc.indexOf("\n");
	const firstLineEnd = nl >= 0 ? nl : doc.length;
	const firstLine = doc.slice(0, firstLineEnd);
	return `${ensureTodoTaskMarkerPrefix(firstLine)}${doc.slice(firstLineEnd)}`;
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
