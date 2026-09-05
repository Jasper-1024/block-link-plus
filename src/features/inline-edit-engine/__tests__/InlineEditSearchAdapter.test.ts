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
			dispatch: jest.fn(),
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
		replaceRange: jest.fn(),
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
	test("isolates the Find panel from other callers of the same editor", () => {
		const host = createEditor("host needle");
		const embed = createEditor("embedded match");
		const nativeSearch = host.editor.searchCursor;
		const navigate = jest.fn();
		const bridge = new InlineEditSearchBridge({
			editor: host.editor,
			getParticipants: () => [
				runtimeParticipant("host", "host needle", host.editor),
				runtimeParticipant("embed:first", "embedded match", embed.editor, [1, 1]),
			],
			navigate,
		});
		expect(bridge.install()).toBe(true);
		const search = { editor: host.editor, cursor: null as any, hide: jest.fn() };
		expect(bridge.attachSearch(search)).toBe(true);
		search.cursor = search.editor.searchCursor("embedded");
		const match = search.cursor.findNext();
		expect(search.cursor.getIndexAndCount()).toEqual([1, 1]);
		expect(host.editor.searchCursor).toBe(nativeSearch);
		expect(host.editor.searchCursor("embedded")).toBe(host.nativeCursor);
		expect(host.editor.searchCursor("needle")).toBe(host.nativeCursor);
		search.editor.scrollIntoView(match, true);
		expect(navigate).toHaveBeenCalledWith(expect.objectContaining({ participantId: "embed:first" }));
		expect(search.cursor.getIndexAndCount()).toEqual([1, 1]);
		search.hide();
		expect(search.editor).toBe(host.editor);
		expect(host.editor.searchCursor).toBe(nativeSearch);
	});

	test("forwards panel methods to the real editor and follows later plugin wrappers", () => {
		const host = createEditor("host");
		const bridge = new InlineEditSearchBridge({ editor: host.editor, getParticipants: () => [], navigate: jest.fn() });
		expect(bridge.install()).toBe(true);
		const search = { editor: host.editor, hide: jest.fn() };
		expect(bridge.attachSearch(search)).toBe(true);
		const panelEditor = search.editor;
		const first = jest.fn(function (this: any) { return this; });
		host.editor.focus = first;
		expect(panelEditor.focus()).toBe(host.editor);
		const later = jest.fn(function (this: any) { return this; });
		host.editor.focus = later;
		expect(panelEditor.focus()).toBe(host.editor);
		expect(first).toHaveBeenCalledTimes(1);
		expect(later).toHaveBeenCalledTimes(1);
		bridge.dispose();
		expect(search.editor).toBe(host.editor);
		expect(panelEditor.searchCursor("host")).toBe(host.nativeCursor);
	});

	test("leaves native search intact when the panel editor cannot be replaced", () => {
		const host = createEditor("host");
		const nativeSearch = host.editor.searchCursor;
		const bridge = new InlineEditSearchBridge({ editor: host.editor, getParticipants: () => [], navigate: jest.fn() });
		expect(bridge.install()).toBe(true);
		const search = { editor: host.editor, hide: jest.fn() };
		const hide = search.hide;
		Object.defineProperty(search, "editor", { writable: false });
		expect(bridge.attachSearch(search)).toBe(false);
		expect(search.editor).toBe(host.editor);
		expect(search.hide).toBe(hide);
		bridge.dispose();
		expect(host.editor.searchCursor).toBe(nativeSearch);
	});

	test("does not overwrite a later panel editor replacement during disposal", () => {
		const host = createEditor("host");
		const bridge = new InlineEditSearchBridge({ editor: host.editor, getParticipants: () => [], navigate: jest.fn() });
		expect(bridge.install()).toBe(true);
		const search = { editor: host.editor, hide: jest.fn() };
		expect(bridge.attachSearch(search)).toBe(true);
		const replacement = createEditor("replacement").editor;
		search.editor = replacement;
		bridge.dispose();
		expect(search.editor).toBe(replacement);
	});

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

		const cursor = bridge.createSearchCursor("needle");
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

		// The bridge wraps shared editor methods, so an unrelated highlight must
		// not clear the active detached search highlight.
		host.editor.addHighlights(
			[{ from: { line: 0, ch: 0 }, to: { line: 0, ch: 1 } }],
			"unrelated-highlight"
		);
		expect(embed.editor.removeHighlights).not.toHaveBeenCalled();

		// Leaving the embed produces a host-only native range. Its previous
		// detached highlight must not remain selected beside the new host match.
		host.editor.addHighlights([hostMatch], "obsidian-search-match-highlight", true, true);
		expect(embed.editor.removeHighlights).toHaveBeenCalledWith("obsidian-search-match-highlight");

		bridge.dispose();
	});

	test("keeps aggregate replacement read-only across detached editors", () => {
		const host = createEditor("host needle");
		const embed = createEditor("embed needle");
		const bridge = new InlineEditSearchBridge({
			editor: host.editor,
			getParticipants: () => [
				runtimeParticipant("host", "host needle", host.editor),
				runtimeParticipant("embed:first", "embed needle", embed.editor, [1, 1]),
			],
			navigate: jest.fn(),
		});
		expect(bridge.install()).toBe(true);

		const cursor = bridge.createSearchCursor("needle");
		cursor.findNext();
		cursor.replace("host replacement", "test");
		expect(host.editor.replaceRange).toHaveBeenCalledTimes(1);

		cursor.findNext();
		cursor.replace("must not edit embed", "test");
		cursor.replaceAll("must not cross editors", "test");
		expect(host.editor.replaceRange).toHaveBeenCalledTimes(1);
		expect(embed.editor.replaceRange).not.toHaveBeenCalled();
		expect(host.nativeCursor.replaceAll).not.toHaveBeenCalled();

		bridge.dispose();
	});

	test("allows native replace-all when detached participants have no matches", () => {
		const host = createEditor("host needle");
		const embed = createEditor("no match here");
		const bridge = new InlineEditSearchBridge({
			editor: host.editor,
			getParticipants: () => [
				runtimeParticipant("host", "host needle", host.editor),
				runtimeParticipant("embed:first", "no match here", embed.editor, [1, 1]),
			],
			navigate: jest.fn(),
		});
		expect(bridge.install()).toBe(true);

		const cursor = bridge.createSearchCursor("needle");
		cursor.replaceAll("replacement", "test");
		expect(host.nativeCursor.replaceAll).toHaveBeenCalledWith("replacement", "test");
		bridge.dispose();
	});

	test("reuses an unchanged match snapshot across cursor operations", () => {
		const host = createEditor("host needle");
		const embed = createEditor("embed needle");
		const hostParticipant = runtimeParticipant("host", "host needle", host.editor);
		const embedParticipant = runtimeParticipant("embed:first", "embed needle", embed.editor, [1, 1]);
		const hostToString = jest.spyOn(hostParticipant.doc, "toString");
		const embedToString = jest.spyOn(embedParticipant.doc, "toString");
		const bridge = new InlineEditSearchBridge({
			editor: host.editor,
			getParticipants: () => [hostParticipant, embedParticipant],
			navigate: jest.fn(),
		});
		expect(bridge.install()).toBe(true);

		const cursor = bridge.createSearchCursor("needle");
		cursor.findNext();
		cursor.current();
		cursor.getIndexAndCount();
		cursor.findNext();
		cursor.findPrevious();
		cursor.findAll();

		expect(hostToString).toHaveBeenCalledTimes(1);
		expect(embedToString).toHaveBeenCalledTimes(1);
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
		expect(bridge.createSearchCursor("needle")).toBe(host.nativeCursor);

		bridge.dispose();
	});

	test("suppresses host selection restoration when the wrapped hide closes on an embed", () => {
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
		const cursor = bridge.createSearchCursor("needle");
		cursor.findNext();
		const search = { editor: host.editor,
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
		expect(host.editor.cm.dispatch).not.toHaveBeenCalled();
	});

	test("suppresses native escape selection and disposes when the search container detaches", async () => {
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
		const cursor = bridge.createSearchCursor("needle");
		const current = cursor.findNext();
		const searchContainer = document.createElement("div");
		document.body.appendChild(searchContainer);
		const search = { editor: host.editor, cursor, containerEl: searchContainer, isActive: true, hide: jest.fn() };
		expect(bridge.attachSearch(search)).toBe(true);

		// Obsidian's Escape scope can call a pre-bound hide handler, bypassing the
		// monkey-patched search.hide method but still using editor.setSelection.
		search.isActive = false;
		host.editor.setSelection((current as any).from, (current as any).to);
		expect(host.editor.setSelection).not.toHaveBeenCalled();

		searchContainer.remove();
		const observerCallback = (MutationObserver as unknown as jest.Mock).mock.calls.at(-1)?.[0];
		observerCallback?.([]);
		await new Promise((resolve) => window.setTimeout(resolve, 0));
		expect(bridge.createSearchCursor("needle")).toBe(host.nativeCursor);
	});

	test("allows host cursor placement while Find remains active on an embed result", () => {
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
		const cursor = bridge.createSearchCursor("needle");
		cursor.findNext();
		const search = { editor: host.editor, cursor, isActive: true, hide: jest.fn() };
		expect(bridge.attachSearch(search)).toBe(true);

		host.editor.setSelection({ line: 0, ch: 1 }, { line: 0, ch: 2 });
		expect(host.editor.setSelection).toHaveBeenCalledWith(
			{ line: 0, ch: 1 },
			{ line: 0, ch: 2 }
		);
		bridge.dispose();
	});

	test("rolls back a partially installed search observer", () => {
		const originalMutationObserver = global.MutationObserver;
		const disconnect = jest.fn();
		const observe = jest.fn()
			.mockImplementationOnce(() => undefined)
			.mockImplementationOnce(() => {
				throw new Error("observer attach failed");
			});
		(global as any).MutationObserver = jest.fn(() => ({ observe, disconnect }));

		try {
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
			const containerEl = document.createElement("div");
			document.body.appendChild(containerEl);
			const hide = jest.fn();
			const search = { editor: host.editor, containerEl, hide };

			expect(bridge.attachSearch(search)).toBe(false);
			expect(search.hide).toBe(hide);
			expect(search.editor).toBe(host.editor);
			expect(disconnect).toHaveBeenCalledTimes(1);
			bridge.dispose();
		} finally {
			global.MutationObserver = originalMutationObserver;
		}
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

		const cursor = bridge.createSearchCursor("needle");
		expect(cursor.findNext()).not.toBeNull();
		participants = [hostParticipant];

		expect(cursor.findNext()).toBeNull();
		expect(host.nativeCursor.findNext).toHaveBeenCalledTimes(1);

		bridge.dispose();
	});

	test("does not suppress native Escape selection after aggregation falls back", () => {
		const host = createEditor("host needle");
		const embed = createEditor("embed needle");
		const hostParticipant = runtimeParticipant("host", "host needle", host.editor);
		const embedParticipant = runtimeParticipant("embed:first", "embed needle", embed.editor, [1, 1]);
		let participants: InlineEditSearchRuntimeParticipant[] = [hostParticipant, embedParticipant];
		const bridge = new InlineEditSearchBridge({
			editor: host.editor,
			getParticipants: () => participants,
			navigate: jest.fn(),
		});
		expect(bridge.install()).toBe(true);

		const aggregateCursor = bridge.createSearchCursor("needle");
		aggregateCursor.findNext();
		aggregateCursor.findNext();
		participants = [hostParticipant];
		expect(bridge.createSearchCursor("needle")).toBe(host.nativeCursor);

		const search = { editor: host.editor, isActive: false, hide: jest.fn() };
		expect(bridge.attachSearch(search)).toBe(true);
		host.editor.setSelection({ line: 0, ch: 5 }, { line: 0, ch: 11 });
		expect(host.editor.setSelection).toHaveBeenCalledWith(
			{ line: 0, ch: 5 },
			{ line: 0, ch: 11 }
		);
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

		const cursor = bridge.createSearchCursor("needle");
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

		const search = { editor: host.editor,
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

		const cursor = bridge.createSearchCursor("needle");
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
		const search = { editor: host.editor,
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

		const cursor = bridge.createSearchCursor("needle");
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

	test("does not recreate an active aggregate cursor for a DOM-only refresh", () => {
		const host = createEditor("host needle");
		const embed = createEditor("embed needle");
		const participants = [
			runtimeParticipant("host", "host needle", host.editor),
			runtimeParticipant("embed:first", "embed needle", embed.editor, [1, 1]),
		];
		const search = { editor: host.editor,
			isActive: true,
			onSearchInput: jest.fn(),
			updateCount: jest.fn(),
			hide: jest.fn(),
		};
		const bridge = new InlineEditSearchBridge({
			editor: host.editor,
			getParticipants: () => participants,
			navigate: jest.fn(),
		});
		expect(bridge.install()).toBe(true);

		const cursor = bridge.createSearchCursor("needle");
		cursor.findNext();
		cursor.findNext();
		expect(cursor.getIndexAndCount()).toEqual([2, 2]);
		expect(bridge.attachSearch(search)).toBe(true);

		// `renderedOrder` comes from posAtDOM and changes as the editor scrolls;
		// it must not restart the current-note search cursor.
		participants[1].renderedOrder = 500;
		bridge.refreshActiveSearch();

		expect(search.onSearchInput).not.toHaveBeenCalled();
		expect(search.updateCount).not.toHaveBeenCalled();
		expect(cursor.getIndexAndCount()).toEqual([2, 2]);
		bridge.dispose();
	});

	test("keeps the current Find order stable when a rendered embed anchor shifts", () => {
		const host = createEditor("before em\nafter em");
		const embed = createEditor("em em em");
		const hostParticipant = runtimeParticipant("host", "before em\nafter em", host.editor);
		const embedParticipant = runtimeParticipant("embed:first", "em em em", embed.editor, [1, 1], 10);
		const bridge = new InlineEditSearchBridge({
			editor: host.editor,
			getParticipants: () => [hostParticipant, embedParticipant],
			navigate: jest.fn(),
		});
		expect(bridge.install()).toBe(true);

		const cursor = bridge.createSearchCursor("em");
		for (let index = 0; index < 5; index++) cursor.findNext();
		expect(cursor.getIndexAndCount()).toEqual([5, 5]);

		// Obsidian's posAtDOM anchor can change during a scroll without changing
		// either document. The existing current match must remain #5.
		embedParticipant.renderedOrder = 100;
		expect(cursor.getIndexAndCount()).toEqual([5, 5]);
		cursor.findPrevious();
		expect(cursor.getIndexAndCount()).toEqual([4, 5]);
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

		const cursor = bridge.createSearchCursor("needle");
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

		const cursor = bridge.createSearchCursor("needle");
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
