import { EditorState } from "@codemirror/state";

import {
	InlineEditSearchBridge,
	type InlineEditSearchRuntimeParticipant,
} from "../InlineEditSearchAdapter";

function createEditor(text: string) {
	const state = EditorState.create({ doc: text });
	const nativeCursor = {
		getIndexAndCount: jest.fn(() => [0, 0]),
		current: jest.fn(() => null),
		findPrevious: jest.fn(() => null),
		findNext: jest.fn(() => null),
		findAll: jest.fn(() => []),
		replace: jest.fn(),
		replaceAll: jest.fn(),
	};

	const editor: any = {
		cm: {
			state: {
				doc: state.doc,
				selection: state.selection,
			},
		},
		offsetToPos: (offset: number) => {
			const line = state.doc.lineAt(offset);
			return { line: line.number - 1, ch: offset - line.from };
		},
		searchCursor: jest.fn(() => nativeCursor),
		addHighlights: jest.fn(),
		removeHighlights: jest.fn(),
		scrollIntoView: jest.fn(),
		setSelection: jest.fn(),
		focus: jest.fn(),
	};

	return { editor, doc: state.doc, nativeCursor };
}

function runtimeParticipant(
	id: string,
	text: string,
	editor: any,
	visibleRange?: [number, number],
	renderedOrder?: number
): InlineEditSearchRuntimeParticipant {
	return { id, doc: EditorState.create({ doc: text }).doc, editor, visibleRange, renderedOrder };
}

describe("InlineEditSearchBridge", () => {
	test("keeps native panel cursor shape while aggregating embed navigation and highlights", () => {
		const host = createEditor("host needle");
		const embed = createEditor("hidden needle\nvisible needle");
		const navigate = jest.fn();
		const participants = [
			runtimeParticipant("host", "host needle", host.editor),
			runtimeParticipant("embed:first", "hidden needle\nvisible needle", embed.editor, [2, 2]),
		];
		const bridge = new InlineEditSearchBridge({
			editor: host.editor,
			getParticipants: () => participants,
			navigate,
		});

		expect(bridge.install()).toBe(true);

		const cursor = host.editor.searchCursor("needle");
		const hostMatch = cursor.findNext();
		const embedMatch = cursor.findNext();

		expect(cursor.getIndexAndCount()).toEqual([2, 2]);
		expect(hostMatch).toEqual({
			from: { line: 0, ch: 5 },
			to: { line: 0, ch: 11 },
		});
		expect(embedMatch).toEqual({
			from: { line: 1, ch: 8 },
			to: { line: 1, ch: 14 },
		});

		host.editor.addHighlights([hostMatch, embedMatch], "obsidian-search-match-highlight", true, true);
		host.editor.scrollIntoView(embedMatch, true);

		expect(host.editor.addHighlights).toHaveBeenCalledWith(
			[hostMatch],
			"obsidian-search-match-highlight",
			true,
			true
		);
		expect(embed.editor.addHighlights).toHaveBeenCalledWith(
			[
				{
					from: { line: 1, ch: 8 },
					to: { line: 1, ch: 14 },
				},
			],
			"obsidian-search-match-highlight",
			true,
			true
		);
		expect(navigate).toHaveBeenCalledWith({
			participantId: "embed:first",
			from: 22,
			to: 28,
			line: 2,
		});

		bridge.dispose();
	});

	test("falls back to the original native cursor when there are no managed embeds", () => {
		const host = createEditor("host needle");
		const bridge = new InlineEditSearchBridge({
			editor: host.editor,
			getParticipants: () => [runtimeParticipant("host", "host needle", host.editor)],
			navigate: jest.fn(),
		});

		expect(bridge.install()).toBe(true);
		expect(host.editor.searchCursor("needle")).toBe(host.nativeCursor);

		bridge.dispose();
	});

	test("suppresses host selection restoration when the current match belongs to an embed", () => {
		const host = createEditor("host");
		const embed = createEditor("needle");
		const bridge = new InlineEditSearchBridge({
			editor: host.editor,
			getParticipants: () => [
				runtimeParticipant("host", "host", host.editor),
				runtimeParticipant("embed:first", "needle", embed.editor, [1, 1]),
			],
			navigate: jest.fn(),
		});
		expect(bridge.install()).toBe(true);

		const cursor = host.editor.searchCursor("needle");
		cursor.findNext();
		const search = {
			cursor,
			searchInputEl: { isActiveElement: () => true },
			replaceInputEl: { isActiveElement: () => false },
			hide: jest.fn(function (this: any) {
				const current = this.cursor?.current?.();
				if (current) host.editor.setSelection(current.from, current.to);
				this.cursor = null;
			}),
		};

		expect(bridge.attachSearch(search)).toBe(true);
		search.hide();

		expect(host.editor.setSelection).not.toHaveBeenCalled();
	});

	test("falls back to the native cursor when a managed participant disappears", () => {
		const host = createEditor("host");
		const embed = createEditor("needle");
		const hostParticipant = runtimeParticipant("host", "host", host.editor);
		const embedParticipant = runtimeParticipant("embed:first", "needle", embed.editor, [1, 1]);
		let participants: InlineEditSearchRuntimeParticipant[] = [hostParticipant, embedParticipant];
		const bridge = new InlineEditSearchBridge({
			editor: host.editor,
			getParticipants: () => participants,
			navigate: jest.fn(),
		});
		expect(bridge.install()).toBe(true);

		const cursor = host.editor.searchCursor("needle");
		expect(cursor.findNext()).not.toBeNull();
		participants = [hostParticipant];

		expect(cursor.findNext()).toBeNull();
		expect(host.nativeCursor.findNext).toHaveBeenCalledTimes(1);

		bridge.dispose();
	});

	test("invalidates a stale current range when one participant is removed", () => {
		const host = createEditor("host");
		const firstEmbed = createEditor("needle");
		const secondEmbed = createEditor("needle");
		const hostParticipant = runtimeParticipant("host", "host", host.editor);
		const firstParticipant = runtimeParticipant("embed:first", "needle", firstEmbed.editor, [1, 1]);
		const secondParticipant = runtimeParticipant("embed:second", "needle", secondEmbed.editor, [1, 1]);
		let participants: InlineEditSearchRuntimeParticipant[] = [
			hostParticipant,
			firstParticipant,
			secondParticipant,
		];
		const navigate = jest.fn();
		const bridge = new InlineEditSearchBridge({
			editor: host.editor,
			getParticipants: () => participants,
			navigate,
		});
		expect(bridge.install()).toBe(true);

		const cursor = host.editor.searchCursor("needle");
		const staleRange = cursor.findNext() as any;
		expect(cursor.getIndexAndCount()).toEqual([1, 2]);
		participants = [hostParticipant, secondParticipant];

		host.editor.scrollIntoView(staleRange, true);
		expect(host.editor.scrollIntoView).not.toHaveBeenCalled();
		expect(navigate).not.toHaveBeenCalled();
		expect(cursor.current()).toBeNull();
		expect(cursor.getIndexAndCount()).toEqual([0, 0]);
		host.editor.scrollIntoView(cursor.current(), true);
		expect(navigate).not.toHaveBeenCalled();

		const next = cursor.findNext();
		host.editor.scrollIntoView(next, true);
		expect(cursor.getIndexAndCount()).toEqual([1, 1]);
		expect(navigate).toHaveBeenCalledWith({
			participantId: "embed:second",
			from: 0,
			to: 6,
			line: 1,
		});

		const previous = cursor.findPrevious();
		host.editor.scrollIntoView(previous, true);
		expect(cursor.getIndexAndCount()).toEqual([1, 1]);
		expect(navigate).toHaveBeenCalledTimes(2);

		const search = {
			cursor: { current: () => staleRange },
			hide: jest.fn(function (this: any) {
				if (staleRange) host.editor.setSelection(staleRange.from, staleRange.to);
			}),
		};
		expect(bridge.attachSearch(search)).toBe(true);
		search.hide();
		expect(host.editor.setSelection).not.toHaveBeenCalled();
		bridge.dispose();
	});

	test("does not navigate a cached match after its visible range hides the line", () => {
		const host = createEditor("host");
		const embed = createEditor("visible needle\nhidden needle");
		const hostParticipant = runtimeParticipant("host", "host", host.editor);
		const embedParticipant = runtimeParticipant("embed:range", "visible needle\nhidden needle", embed.editor, [1, 1]);
		const navigate = jest.fn();
		const participants = [hostParticipant, embedParticipant];
		const bridge = new InlineEditSearchBridge({
			editor: host.editor,
			getParticipants: () => participants,
			navigate,
		});
		expect(bridge.install()).toBe(true);

		const cursor = host.editor.searchCursor("needle");
		const staleRange = cursor.findNext() as any;
		embedParticipant.visibleRange = [2, 2];

		host.editor.scrollIntoView(staleRange, true);

		expect(navigate).not.toHaveBeenCalled();
		expect(host.editor.scrollIntoView).not.toHaveBeenCalled();
		bridge.dispose();
	});

	test("refreshes the native search and rejects cached matches after a participant document changes", () => {
		const host = createEditor("host");
		const embed = createEditor("needle");
		const hostParticipant = runtimeParticipant("host", "host", host.editor);
		let embedDoc = embed.editor.cm.state.doc;
		const embedParticipant = {
			...runtimeParticipant("embed:changed", "needle", embed.editor, [1, 1]),
			doc: embedDoc,
		};
		embed.editor.cm.dispatch = jest.fn(function (this: any) {
			this.state = { ...this.state, doc: embedDoc };
		});
		const navigate = jest.fn();
		const search = {
			isActive: true,
			countEl: { textContent: "1 / 1" },
			onSearchInput: jest.fn(),
			updateCount: jest.fn(function (this: any) {
				this.countEl.textContent = "0 / 0";
			}),
			requestUpdateCount: jest.fn(),
			hide: jest.fn(),
		};
		const bridge = new InlineEditSearchBridge({
			editor: host.editor,
			getParticipants: () => [
				hostParticipant,
				{ ...embedParticipant, doc: embedDoc },
			],
			navigate,
		});
		expect(bridge.install()).toBe(true);

		const cursor = host.editor.searchCursor("needle");
		const staleRange = cursor.findNext() as any;
		expect(cursor.getIndexAndCount()).toEqual([1, 1]);
		expect(bridge.attachSearch(search)).toBe(true);

		const nextState = EditorState.create({ doc: "xxxxxx" });
		embedDoc = nextState.doc;
		embed.editor.cm.dispatch();

		expect(search.onSearchInput).toHaveBeenCalledTimes(1);
		expect(search.updateCount).toHaveBeenCalledTimes(1);
		expect(search.countEl.textContent).toBe("0 / 0");
		host.editor.scrollIntoView(staleRange, true);
		expect(navigate).not.toHaveBeenCalled();
		expect(cursor.findAll()).toEqual([]);

		bridge.dispose();
	});

	test("fails open for a cursor retained across bridge disposal", () => {
		const host = createEditor("host");
		const embed = createEditor("needle");
		const hostParticipant = runtimeParticipant("host", "host", host.editor);
		const embedParticipant = runtimeParticipant("embed:first", "needle", embed.editor, [1, 1]);
		const bridge = new InlineEditSearchBridge({
			editor: host.editor,
			getParticipants: () => [hostParticipant, embedParticipant],
			navigate: jest.fn(),
		});
		expect(bridge.install()).toBe(true);

		const cursor = host.editor.searchCursor("needle");
		expect(cursor.findNext()).not.toBeNull();
		bridge.dispose();

		expect(cursor.findNext()).toBeNull();
		expect(cursor.current()).toBeNull();
		expect(cursor.getIndexAndCount()).toEqual([0, 0]);
		expect(host.nativeCursor.findNext).toHaveBeenCalledTimes(1);
		expect(host.nativeCursor.current).toHaveBeenCalledTimes(1);
		expect(host.nativeCursor.getIndexAndCount).toHaveBeenCalledTimes(1);
	});

	test("traverses mixed host and embed matches in rendered order", () => {
		const host = createEditor("before needle\nbetween needle\nafter needle");
		const beforeEmbed = createEditor("needle");
		const afterEmbed = createEditor("needle");
		const navigate = jest.fn();
		const bridge = new InlineEditSearchBridge({
			editor: host.editor,
			getParticipants: () => [
				runtimeParticipant("host", "before needle\nbetween needle\nafter needle", host.editor),
				runtimeParticipant("embed:before", "needle", beforeEmbed.editor, [1, 1], 5),
				runtimeParticipant("embed:after", "needle", afterEmbed.editor, [1, 1], 30),
			],
			navigate,
		});
		expect(bridge.install()).toBe(true);

		const cursor = host.editor.searchCursor("needle");
		const first = cursor.findNext();
		host.editor.scrollIntoView(first, true);
		expect(cursor.getIndexAndCount()).toEqual([1, 5]);

		const second = cursor.findNext();
		host.editor.scrollIntoView(second, true);
		expect(cursor.getIndexAndCount()).toEqual([2, 5]);

		const third = cursor.findNext();
		host.editor.scrollIntoView(third, true);
		expect(cursor.getIndexAndCount()).toEqual([3, 5]);

		const fourth = cursor.findNext();
		host.editor.scrollIntoView(fourth, true);
		expect(cursor.getIndexAndCount()).toEqual([4, 5]);

		const fifth = cursor.findNext();
		host.editor.scrollIntoView(fifth, true);
		expect(cursor.getIndexAndCount()).toEqual([5, 5]);
		expect(navigate.mock.calls.map(([match]) => match.participantId)).toEqual([
			"embed:before",
			"embed:after",
		]);

		const previous = cursor.findPrevious();
		host.editor.scrollIntoView(previous, true);
		expect(cursor.getIndexAndCount()).toEqual([4, 5]);
		expect(navigate.mock.calls.at(-1)?.[0].participantId).toBe("embed:after");

		bridge.dispose();
	});
});
