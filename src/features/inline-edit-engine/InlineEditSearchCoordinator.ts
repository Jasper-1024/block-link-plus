import type { Text } from "@codemirror/state";

export type InlineEditSearchLineRange = readonly [number, number];

export interface InlineEditSearchParticipant {
	id: string;
	doc: Text;
	visibleRange?: InlineEditSearchLineRange;
	/**
	 * Host-document offset at which a detached participant is rendered.
	 *
	 * The host participant itself has no anchor; its match offset is its
	 * rendered position. When anchors are present, matches are ordered as one
	 * rendered document rather than as one complete document per participant.
	 */
	renderedOrder?: number;
}

export interface InlineEditSearchQuery {
	search: string;
	caseSensitive?: boolean;
	regexp?: boolean;
	wholeWord?: boolean;
	regexpFlags?: string;
}

export interface InlineEditSearchMatch {
	participantId: string;
	from: number;
	to: number;
	line: number;
}

export type InlineEditSearchInput = string | RegExp | InlineEditSearchQuery;

const OUTLINER_SYSTEM_LINE = /\[blp_sys::\s*1\]/;

function normalizeQuery(query: InlineEditSearchInput): InlineEditSearchQuery {
	if (typeof query === "string") return { search: query };
	if (query instanceof RegExp) {
		return {
			search: query.source,
			caseSensitive: !query.ignoreCase,
			regexp: true,
			regexpFlags: query.flags,
		};
	}
	return query;
}

function getVisibleRange(
	participant: InlineEditSearchParticipant
): [number, number] {
	const lastLine = participant.doc.lines;
	const requested = participant.visibleRange;
	if (!requested) return [1, lastLine];

	const start = Math.min(Math.max(1, requested[0]), lastLine);
	const end = Math.min(Math.max(1, requested[1]), lastLine);
	return start <= end ? [start, end] : [end, start];
}

function isWholeWordBoundary(text: string, from: number, to: number): boolean {
	const isWord = (character: string | undefined): boolean =>
		character !== undefined && /[A-Za-z0-9_]/.test(character);

	return !isWord(text[from - 1]) && !isWord(text[to]);
}

function collectLiteralMatches(
	text: string,
	query: InlineEditSearchQuery
): Array<{ from: number; to: number }> {
	const needle = query.search;
	const foldedNeedle = query.caseSensitive ? needle : needle.toLowerCase();
	const matches: Array<{ from: number; to: number }> = [];

	for (let matchFrom = 0; matchFrom <= text.length - needle.length;) {
		const candidate = text.slice(matchFrom, matchFrom + needle.length);
		const equal = query.caseSensitive ? candidate === needle : candidate.toLowerCase() === foldedNeedle;
		if (equal) {
			const matchTo = matchFrom + needle.length;
			if (!query.wholeWord || isWholeWordBoundary(text, matchFrom, matchTo)) {
				matches.push({ from: matchFrom, to: matchTo });
			}
			// The native current-note cursor advances past a found match. This
			// keeps aggregate counts and navigation aligned with it instead of
			// exposing overlapping ranges from every possible start offset.
			matchFrom = matchTo;
			continue;
		}
		matchFrom += 1;
	}

	return matches;
}

function collectRegexpMatches(
	text: string,
	query: InlineEditSearchQuery
): Array<{ from: number; to: number }> {
	let expression: RegExp;
	try {
		let flags = (query.regexpFlags ?? "").replace(/[gy]/g, "");
		if (!query.caseSensitive && !flags.includes("i")) flags += "i";
		if (!flags.includes("g")) flags += "g";
		expression = new RegExp(query.search, flags);
	} catch {
		return [];
	}

	const matches: Array<{ from: number; to: number }> = [];
	let searchFrom = 0;
	while (searchFrom <= text.length) {
		expression.lastIndex = searchFrom;
		const match = expression.exec(text);
		if (!match || match.index === undefined) break;

		const from = match.index;
		const to = from + match[0].length;
		if (to > from && (!query.wholeWord || isWholeWordBoundary(text, from, to))) {
			matches.push({ from, to });
		}

		// Keep the next search after the current match. A zero-width match is
		// ignored above, but still needs a one-code-unit advance to terminate.
		searchFrom = to > from ? to : from + 1;
	}

	return matches;
}

function isVisibleMatch(
	participant: InlineEditSearchParticipant,
	range: [number, number],
	from: number,
	to: number
): boolean {
	const firstLine = participant.doc.lineAt(from).number;
	const lastLine = participant.doc.lineAt(Math.max(from, to - 1)).number;

	for (let lineNumber = firstLine; lineNumber <= lastLine; lineNumber++) {
		if (
			lineNumber < range[0] ||
			lineNumber > range[1] ||
			(participant.id !== "host" && OUTLINER_SYSTEM_LINE.test(participant.doc.line(lineNumber).text))
		) {
			return false;
		}
	}

	return true;
}

/**
 * Collect current-note search matches without mutating any CodeMirror document.
 * Each participant represents one visible occurrence of a BLP-managed embed;
 * its id is deliberately preserved so repeated references are not deduplicated.
 */
export function collectInlineEditSearchMatches(
	queryInput: InlineEditSearchInput,
	participants: readonly InlineEditSearchParticipant[]
): InlineEditSearchMatch[] {
	const query = normalizeQuery(queryInput);
	if (!query.search) return [];

	const matches: InlineEditSearchMatch[] = [];
	for (const participant of participants) {
		const text = participant.doc.toString();
		const ranges = query.regexp
			? collectRegexpMatches(text, query)
			: collectLiteralMatches(text, query);
		const visibleRange = getVisibleRange(participant);

		for (const match of ranges) {
			if (!isVisibleMatch(participant, visibleRange, match.from, match.to)) continue;

			matches.push({
				participantId: participant.id,
				from: match.from,
				to: match.to,
				line: participant.doc.lineAt(match.from).number,
			});
		}
	}

	const hasRenderedOrder = participants.some(
		(participant) => participant.id !== "host" && Number.isFinite(participant.renderedOrder)
	);
	if (!hasRenderedOrder) return matches;

	const participantById = new Map(participants.map((participant) => [participant.id, participant]));
	const originalOrder = new Map(matches.map((match, index) => [match, index]));
	const renderedKey = (match: InlineEditSearchMatch): [number, number, number] => {
		const participant = participantById.get(match.participantId);
		if (match.participantId === "host") return [match.from, 0, match.from];

		const anchor = Number.isFinite(participant?.renderedOrder)
			? (participant?.renderedOrder as number)
			: Number.POSITIVE_INFINITY;
		return [anchor, 1, match.from];
	};

	return matches.sort((left, right) => {
		const leftKey = renderedKey(left);
		const rightKey = renderedKey(right);
		for (let i = 0; i < leftKey.length; i++) {
			if (leftKey[i] !== rightKey[i]) return leftKey[i] - rightKey[i];
		}
		return (originalOrder.get(left) ?? 0) - (originalOrder.get(right) ?? 0);
	});
}
