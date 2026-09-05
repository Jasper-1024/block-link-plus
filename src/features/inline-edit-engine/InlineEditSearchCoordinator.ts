import type { Text } from "@codemirror/state";

export type InlineEditSearchLineRange = readonly [number, number];

export interface InlineEditSearchParticipant {
	id: string;
	doc: Text;
	visibleRange?: InlineEditSearchLineRange;
	/** Source ranges hidden by BLP-managed Live Preview widgets. */
	ignoredRanges?: ReadonlyArray<readonly [number, number]>;
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

export interface InlineEditManagedEmbedSourceAnchor {
	source: string;
	hostOffset: number;
}

export type InlineEditSearchInput = string | RegExp | InlineEditSearchQuery;

const OUTLINER_SYSTEM_LINE = /\[blp_sys::\s*1\]/;

/**
 * Resolve only the concrete source tokens represented by mounted Live Preview
 * widgets. Matching by target alone would also hide visible code examples or a
 * native embed occurrence that happens to reference the same target.
 */
export function locateManagedEmbedSourceRanges(
	hostText: string,
	anchors: readonly InlineEditManagedEmbedSourceAnchor[]
): Array<[number, number]> {
	const tokens: Array<{ from: number; to: number; source: string }> = [];
	const embedToken = /!\[\[([^\]\n]+)\]\]/g;
	for (let match = embedToken.exec(hostText); match; match = embedToken.exec(hostText)) {
		tokens.push({
			from: match.index,
			to: match.index + match[0].length,
			source: match[1].split("|")[0].trim(),
		});
	}

	const claimed = new Set<number>();
	const ranges: Array<[number, number]> = [];
	for (const anchor of anchors) {
		let bestIndex = -1;
		let bestDistance = Number.POSITIVE_INFINITY;
		for (let index = 0; index < tokens.length; index++) {
			if (claimed.has(index)) continue;
			const token = tokens[index];
			if (token.source !== anchor.source.trim()) continue;
			// posAtDOM normally resolves to the opening `!`, but Obsidian can
			// report either token boundary while a widget is being reconciled.
			if (anchor.hostOffset < token.from - 1 || anchor.hostOffset > token.to + 1) continue;
			const distance = Math.min(
				Math.abs(anchor.hostOffset - token.from),
				Math.abs(anchor.hostOffset - token.to)
			);
			if (distance < bestDistance) {
				bestIndex = index;
				bestDistance = distance;
			}
		}
		if (bestIndex === -1) continue;
		claimed.add(bestIndex);
		const token = tokens[bestIndex];
		ranges.push([token.from, token.to]);
	}

	return ranges.sort((left, right) => left[0] - right[0]);
}

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

function isIgnoredMatch(participant: InlineEditSearchParticipant, from: number, to: number): boolean {
	return participant.ignoredRanges?.some(([rangeFrom, rangeTo]) => from < rangeTo && to > rangeFrom) ?? false;
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
			if (isIgnoredMatch(participant, match.from, match.to)) continue;
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
