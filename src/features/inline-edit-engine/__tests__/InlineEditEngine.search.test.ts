import { EditorState } from "@codemirror/state";

import {
	collectInlineEditSearchMatches,
	locateManagedEmbedSourceRanges,
	type InlineEditSearchParticipant,
} from "../InlineEditSearchCoordinator";

function participant(
	id: string,
	text: string,
	visibleRange?: [number, number]
): InlineEditSearchParticipant {
	return {
		id,
		doc: EditorState.create({ doc: text }).doc,
		visibleRange,
	};
}

describe("InlineEditSearchCoordinator", () => {
	test("aggregates host and repeated embed occurrences within visible lines", () => {
		const blockText = [
			"hidden needle before the block",
			"visible needle in the block",
			"visible marker needle",
			"tail needle [blp_sys:: 1]",
			"hidden needle after the block",
		].join("\n");

		const matches = collectInlineEditSearchMatches("needle", [
			participant("host", "host needle"),
			participant("embed:block:first", blockText, [2, 4]),
			participant("embed:block:second", blockText, [2, 4]),
			participant("embed:heading", "# Heading needle\nheading body needle\nhidden needle", [1, 2]),
		]);

		expect(matches).toEqual([
			{ participantId: "host", from: 5, to: 11, line: 1 },
			{ participantId: "embed:block:first", from: 39, to: 45, line: 2 },
			{ participantId: "embed:block:first", from: 74, to: 80, line: 3 },
			{ participantId: "embed:block:second", from: 39, to: 45, line: 2 },
			{ participantId: "embed:block:second", from: 74, to: 80, line: 3 },
			{ participantId: "embed:heading", from: 10, to: 16, line: 1 },
			{ participantId: "embed:heading", from: 30, to: 36, line: 2 },
		]);
	});

	test("returns no matches for an empty query", () => {
		expect(collectInlineEditSearchMatches("", [participant("host", "needle")])).toEqual([]);
	});

	test("does not search the hidden source token of a managed embed", () => {
		const text = "before ![[Embedded source#^embedded-first]] after embedded";
		const tokenFrom = text.indexOf("![[");
		const matches = collectInlineEditSearchMatches("embedded", [
			{
				...participant("host", text),
				ignoredRanges: [[tokenFrom, tokenFrom + "![[Embedded source#^embedded-first]]".length]],
			},
			participant("embed:block", "embedded content", [1, 1]),
		]);

		expect(matches).toEqual([
			{ participantId: "host", from: text.lastIndexOf("embedded"), to: text.length, line: 1 },
			{ participantId: "embed:block", from: 0, to: 8, line: 1 },
		]);
	});

	test("maps managed widgets by occurrence without hiding visible same-target literals", () => {
		const text = [
			"![[Shared target]]",
			"```md",
			"![[Shared target]]",
			"```",
			"\\![[Shared target]]",
			"![[Shared target]]",
		].join("\n");
		const first = text.indexOf("![[Shared target]]");
		const last = text.lastIndexOf("![[Shared target]]");

		expect(locateManagedEmbedSourceRanges(text, [
			{ source: "Shared target", hostOffset: first },
			{ source: "Shared target", hostOffset: last + "![[Shared target]]".length },
		])).toEqual([
			[first, first + "![[Shared target]]".length],
			[last, last + "![[Shared target]]".length],
		]);
	});

	test("enumerates literal and regexp matches without overlap", () => {
		const range = participant("embed:range", "aaaa", [1, 1]);

		expect(collectInlineEditSearchMatches({ search: "aa", caseSensitive: true }, [range])).toEqual([
			{ participantId: "embed:range", from: 0, to: 2, line: 1 },
			{ participantId: "embed:range", from: 2, to: 4, line: 1 },
		]);

		expect(collectInlineEditSearchMatches({ search: "a.a", regexp: true, caseSensitive: true }, [range])).toEqual([
			{ participantId: "embed:range", from: 0, to: 3, line: 1 },
		]);
	});

	test("orders host and detached matches by their rendered host position", () => {
		const host = participant("host", "before needle\nbetween needle\nafter needle");
		const beforeEmbed = { ...participant("embed:before", "needle", [1, 1]), renderedOrder: 5 };
		const afterEmbed = { ...participant("embed:after", "needle", [1, 1]), renderedOrder: 30 };

		const matches = collectInlineEditSearchMatches("needle", [host, beforeEmbed, afterEmbed]);

		expect(matches.map((match) => match.participantId)).toEqual([
			"embed:before",
			"host",
			"host",
			"embed:after",
			"host",
		]);
	});
});
