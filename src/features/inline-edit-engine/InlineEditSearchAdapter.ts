import type { Text } from "@codemirror/state";
import { around } from "monkey-around";

import {
	collectInlineEditSearchMatches,
	type InlineEditSearchInput,
	type InlineEditSearchMatch,
	type InlineEditSearchParticipant,
} from "./InlineEditSearchCoordinator";

export interface InlineEditSearchEditor {
	cm?: {
		state?: {
			doc?: Text;
			selection?: { main?: { from: number; to: number } };
		};
		dispatch?: (...args: unknown[]) => unknown;
	};
	offsetToPos?: (offset: number) => unknown;
	searchCursor: (query: InlineEditSearchInput, ...args: unknown[]) => InlineEditNativeSearchCursor;
	addHighlights: (ranges: unknown[], className: string, ...args: unknown[]) => unknown;
	removeHighlights: (className?: string) => unknown;
	scrollIntoView: (range: unknown, center?: boolean) => unknown;
	setSelection: (from: unknown, to?: unknown) => unknown;
	focus?: () => unknown;
	setCursor?: (position: unknown) => unknown;
	replaceRange?: (replacement: string, from: unknown, to: unknown, origin?: string) => unknown;
	transaction?: (transaction: unknown, origin?: string) => unknown;
}

export interface InlineEditSearchRuntimeParticipant extends InlineEditSearchParticipant {
	editor: InlineEditSearchEditor;
}

export interface InlineEditNativeSearchCursor {
	getIndexAndCount: () => [number, number];
	current: () => unknown;
	findPrevious: () => unknown;
	findNext: () => unknown;
	findAll: () => unknown[];
	replace: (replacement: string, origin?: string) => unknown;
	replaceAll: (replacement: string, origin?: string) => unknown;
}

export interface InlineEditSearchBridgeOptions {
	editor: InlineEditSearchEditor;
	getParticipants: () => readonly InlineEditSearchRuntimeParticipant[];
	navigate: (match: InlineEditSearchMatch) => boolean | void;
	onDispose?: () => void;
}

type InlineEditSearchRange = {
	from: unknown;
	to: unknown;
};

type SearchRangeMetadata = InlineEditSearchMatch;

const SEARCH_RANGE_METADATA = "__blpInlineEditSearchMatch";
const OUTLINER_SYSTEM_LINE = /\[blp_sys::\s*1\]/;

function getMetadata(value: unknown): SearchRangeMetadata | null {
	if (!value || typeof value !== "object") return null;

	const metadata = (value as Record<string, unknown>)[SEARCH_RANGE_METADATA];
	if (!metadata || typeof metadata !== "object") return null;
	if (
		typeof (metadata as SearchRangeMetadata).participantId !== "string" ||
		typeof (metadata as SearchRangeMetadata).from !== "number" ||
		typeof (metadata as SearchRangeMetadata).to !== "number" ||
		typeof (metadata as SearchRangeMetadata).line !== "number"
	) {
		return null;
	}

	return metadata as SearchRangeMetadata;
}

function setMetadata(range: InlineEditSearchRange, metadata: SearchRangeMetadata): void {
	try {
		Object.defineProperty(range, SEARCH_RANGE_METADATA, {
			configurable: true,
			enumerable: false,
			value: metadata,
			writable: false,
		});
	} catch {
		// A native range should still work if a host object refuses extensions.
	}
}

function isSameMatch(a: InlineEditSearchMatch | null, b: InlineEditSearchMatch): boolean {
	return Boolean(
		a &&
		a.participantId === b.participantId &&
		a.from === b.from &&
		a.to === b.to &&
		a.line === b.line
	);
}

function isCurrentVisibleMatch(
	participant: InlineEditSearchRuntimeParticipant,
	match: InlineEditSearchMatch,
	query: InlineEditSearchInput | null
): boolean {
	if (query === null) return false;

	try {
		const firstLine = participant.doc.lineAt(match.from).number;
		const lastLine = participant.doc.lineAt(Math.max(match.from, match.to - 1)).number;
		if (firstLine !== match.line) return false;

		if (participant.visibleRange) {
			const start = Math.min(participant.visibleRange[0], participant.visibleRange[1]);
			const end = Math.max(participant.visibleRange[0], participant.visibleRange[1]);
			if (firstLine < start || lastLine > end) return false;
		}

		if (participant.id !== "host") {
			for (let lineNumber = firstLine; lineNumber <= lastLine; lineNumber++) {
				if (OUTLINER_SYSTEM_LINE.test(participant.doc.line(lineNumber).text)) return false;
			}
		}

		return collectInlineEditSearchMatches(query, [participant]).some((candidate) =>
			isSameMatch(candidate, match)
		);
	} catch {
		return false;
	}
}

function normalizeNativeSearchQuery(
	query: InlineEditSearchInput,
	args: readonly unknown[]
): InlineEditSearchInput {
	if (typeof query !== "string") return query;

	return {
		search: query,
		caseSensitive: args[0] === true,
		wholeWord: args[1] === true,
		regexp: args[2] === true,
	};
}

function createSearchCursorWrapper(
	bridge: InlineEditSearchBridge,
	old: any
): (this: InlineEditSearchEditor, query: InlineEditSearchInput, ...args: unknown[]) => InlineEditNativeSearchCursor {
	return function (
		this: InlineEditSearchEditor,
		query: InlineEditSearchInput,
		...args: unknown[]
	) {
		const nativeCursor = old.call(this, query, ...args);
		const aggregateQuery = normalizeNativeSearchQuery(query, args);

		if (
			(typeof aggregateQuery !== "string" && !(aggregateQuery instanceof RegExp) &&
				typeof aggregateQuery !== "object") ||
			!bridge.canAggregate()
		) {
			bridge.clearActiveQuery();
			return nativeCursor;
		}

		bridge.setActiveQuery(aggregateQuery);
		return new AggregatedInlineSearchCursor(bridge, aggregateQuery, nativeCursor, this);
	};
}

function createAddHighlightsWrapper(
	bridge: InlineEditSearchBridge,
	old: any
): (this: InlineEditSearchEditor, ranges: unknown[], className: string, ...args: unknown[]) => unknown {
	return function (
		this: InlineEditSearchEditor,
		ranges: unknown[],
		className: string,
		...args: unknown[]
	) {
		return bridge.handleAddHighlights(this, old, ranges, className, args);
	};
}

function createRemoveHighlightsWrapper(
	bridge: InlineEditSearchBridge,
	old: any
): (this: InlineEditSearchEditor, className?: string) => unknown {
	return function (this: InlineEditSearchEditor, className?: string) {
		bridge.clearEmbedHighlights();
		return old.call(this, className);
	};
}

function createScrollIntoViewWrapper(
	bridge: InlineEditSearchBridge,
	old: any
): (this: InlineEditSearchEditor, range: unknown, center?: boolean) => unknown {
	return function (this: InlineEditSearchEditor, range: unknown, center?: boolean) {
		const metadata = getMetadata(range);
		if (range === null || range === undefined) return;
		if (metadata && metadata.participantId !== "host") {
			// A detached editor can disappear after the cursor returns a range but
			// before the search panel scrolls it. Never pass that stale range to the
			// host editor or attempt to focus a removed participant.
			if (!bridge.isLiveAggregateMatch(metadata)) return;
			if (bridge.navigateMatch(metadata)) return;
			return;
		}

		return old.call(this, range, center);
	};
}

function createSetSelectionWrapper(
	bridge: InlineEditSearchBridge,
	old: any
): (this: InlineEditSearchEditor, from: unknown, to?: unknown) => unknown {
	return function (this: InlineEditSearchEditor, from: unknown, to?: unknown) {
		if (bridge.isHostSelectionSuppressed()) return;
		return old.call(this, from, to);
	};
}

function createSearchHideWrapper(
	bridge: InlineEditSearchBridge,
	old: any
): (this: any, ...args: unknown[]) => unknown {
	return function (this: any, ...args: unknown[]) {
		const metadata = getMetadata(this.cursor?.current?.());
		const isEmbedMatch = Boolean(metadata && metadata.participantId !== "host");
		if (metadata && isEmbedMatch) {
			// Validate the cached range before hiding. We suppress host selection
			// restoration for both live and stale embed ranges so a detached or newly
			// hidden line can never be applied to the host editor.
			bridge.isLiveAggregateMatch(metadata);
		}
		bridge.setHostSelectionSuppressed(
			isEmbedMatch
		);
		try {
			return old.apply(this, args);
		} finally {
			bridge.setHostSelectionSuppressed(false);
			bridge.dispose();
		}
	};
}

export class InlineEditSearchBridge {
	private readonly options: InlineEditSearchBridgeOptions;
	private editorUninstaller: (() => void) | null = null;
	private searchUninstaller: (() => void) | null = null;
	private attachedSearch: unknown = null;
	private readonly embedHighlights: Array<{ editor: InlineEditSearchEditor; className: string }> = [];
	private readonly participantDispatchUninstallers = new Map<object, () => void>();
	private suppressHostSelection = false;
	private activeQuery: InlineEditSearchInput | null = null;
	private disposed = false;

	constructor(options: InlineEditSearchBridgeOptions) {
		this.options = options;
	}

	install(): boolean {
		if (this.disposed || this.editorUninstaller) return Boolean(this.editorUninstaller);

		const editor = this.options.editor;
		if (
			typeof editor.searchCursor !== "function" ||
			typeof editor.addHighlights !== "function" ||
			typeof editor.removeHighlights !== "function" ||
			typeof editor.scrollIntoView !== "function" ||
			typeof editor.setSelection !== "function"
		) {
			return false;
		}

		try {
			this.editorUninstaller = around(editor as any, {
				searchCursor: (old: any) => createSearchCursorWrapper(this, old),
				addHighlights: (old: any) => createAddHighlightsWrapper(this, old),
				removeHighlights: (old: any) => createRemoveHighlightsWrapper(this, old),
				scrollIntoView: (old: any) => createScrollIntoViewWrapper(this, old),
				setSelection: (old: any) => createSetSelectionWrapper(this, old),
			});

			return true;
		} catch {
			try {
				this.editorUninstaller?.();
			} catch {
				// ignore
			}
			this.editorUninstaller = null;
			return false;
		}
	}

	attachSearch(search: any): boolean {
		if (this.disposed || !this.editorUninstaller || !search || typeof search.hide !== "function") return false;
		if (this.attachedSearch === search) return true;

		try {
			this.searchUninstaller?.();
		} catch {
			// ignore
		}
		this.searchUninstaller = null;

		try {
			this.searchUninstaller = around(search as any, {
				hide: (old: any) => createSearchHideWrapper(this, old),
			});
			this.attachedSearch = search;
			return true;
		} catch {
			this.searchUninstaller = null;
			this.attachedSearch = null;
			return false;
		}
	}

	dispose(): void {
		if (this.disposed) return;
		this.disposed = true;
		this.clearActiveQuery();
		this.clearEmbedHighlights();

		for (const uninstall of this.participantDispatchUninstallers.values()) {
			try {
				uninstall();
			} catch {
				// ignore
			}
		}
		this.participantDispatchUninstallers.clear();

		try {
			this.searchUninstaller?.();
		} catch {
			// ignore
		}
		this.searchUninstaller = null;
		this.attachedSearch = null;

		try {
			this.editorUninstaller?.();
		} catch {
			// ignore
		}
		this.editorUninstaller = null;
		try {
			this.options.onDispose?.();
		} catch {
			// ignore cleanup callbacks
		}
	}

	canAggregate(): boolean {
		if (this.disposed) return false;
		try {
			return this.getParticipants().some((participant) => participant.id !== "host");
		} catch {
			return false;
		}
	}

	isLiveAggregateMatch(match: InlineEditSearchMatch): boolean {
		if (this.disposed) return false;
		const participant = this.getParticipants().find((candidate) => candidate.id === match.participantId);
		if (!participant || match.from < 0 || match.to <= match.from || match.to > participant.doc.length) return false;

		return isCurrentVisibleMatch(participant, match, this.activeQuery);
	}

	/** @internal Called by the native-method wrapper for the active cursor. */
	setActiveQuery(query: InlineEditSearchInput): void {
		if (!this.disposed) this.activeQuery = query;
	}

	/** @internal Called when a cursor is not aggregating or the bridge is disposed. */
	clearActiveQuery(): void {
		this.activeQuery = null;
	}

	navigateMatch(match: InlineEditSearchMatch): boolean {
		try {
			return this.options.navigate(match) !== false;
		} catch {
			return false;
		}
	}

	setHostSelectionSuppressed(value: boolean): void {
		this.suppressHostSelection = value;
	}

	isHostSelectionSuppressed(): boolean {
		return this.suppressHostSelection;
	}

	getParticipants(): readonly InlineEditSearchRuntimeParticipant[] {
		let participants: InlineEditSearchRuntimeParticipant[] = [];
		try {
			participants = this.options
				.getParticipants()
				.filter((participant) => Boolean(participant?.id && participant?.doc && participant?.editor));
		} catch {
			participants = [];
		}

		this.syncParticipantDispatchObservers(participants);
		return participants;
	}

	private syncParticipantDispatchObservers(
		participants: readonly InlineEditSearchRuntimeParticipant[]
	): void {
		const activeCodeMirrors = new Set<object>();

		for (const participant of participants) {
			if (participant.id === "host") continue;
			const cm = participant.editor.cm;
			if (!cm || typeof cm !== "object" || typeof cm.dispatch !== "function") continue;
			activeCodeMirrors.add(cm);
			if (this.participantDispatchUninstallers.has(cm)) continue;

			try {
				const handleDocumentChange = () => this.handleParticipantDocumentChange();
				const uninstall = around(cm as any, {
					dispatch: (old: any) => {
						return function (this: any, ...args: unknown[]) {
							const beforeDoc = cm.state?.doc;
							const result = old.apply(this, args);
							if (beforeDoc !== cm.state?.doc) handleDocumentChange();
							return result;
						};
					},
				});
				this.participantDispatchUninstallers.set(cm, uninstall);
			} catch {
				// A detached editor that refuses wrapping must not break native search.
			}
		}

		for (const [cm, uninstall] of this.participantDispatchUninstallers) {
			if (activeCodeMirrors.has(cm)) continue;
			try {
				uninstall();
			} catch {
				// ignore editors already being torn down
			}
			this.participantDispatchUninstallers.delete(cm);
		}
	}

	private handleParticipantDocumentChange(): void {
		this.refreshActiveSearch();
	}

	refreshActiveSearch(): void {
		if (this.disposed || !this.attachedSearch) return;

		this.clearEmbedHighlights();
		const search = this.attachedSearch as {
			isActive?: boolean;
			onSearchInput?: () => unknown;
			requestUpdateCount?: () => unknown;
			updateCount?: () => unknown;
		};
		if (search.isActive === false) return;

		try {
			if (typeof search.onSearchInput === "function") search.onSearchInput.call(search);
		} catch {
			// Fall through to the smaller count-only refresh when the native
			// search shape changes or its input handler is unavailable.
		}

		try {
			// Native onSearchInput debounces requestUpdateCount. Update immediately
			// as well so participant removal cannot leave the visible count behind
			// while the debounced callback is waiting to run.
			if (typeof search.updateCount === "function") {
				search.updateCount.call(search);
			} else if (typeof search.requestUpdateCount === "function") {
				search.requestUpdateCount.call(search);
			}
		} catch {
			// Search refresh is best effort; stale ranges remain query-validated.
		}
	}

	getAggregateMatches(query: InlineEditSearchInput): {
		participants: readonly InlineEditSearchRuntimeParticipant[];
		matches: InlineEditSearchMatch[];
	} | null {
		if (this.disposed) return null;
		const participants = this.getParticipants();
		if (!participants.some((participant) => participant.id !== "host")) return null;

		try {
			return {
				participants,
				matches: collectInlineEditSearchMatches(query, participants),
			};
		} catch {
			return null;
		}
	}

	rangeForMatch(
		match: InlineEditSearchMatch,
		participants: readonly InlineEditSearchRuntimeParticipant[]
	): InlineEditSearchRange | null {
		const participant = participants.find((candidate) => candidate.id === match.participantId);
		if (!participant) return null;

		const from = this.positionForOffset(participant, match.from);
		const to = this.positionForOffset(participant, match.to);
		if (from === null || to === null) return null;

		const range: InlineEditSearchRange = { from, to };
		setMetadata(range, match);
		return range;
	}

	isAggregateRange(range: unknown): boolean {
		return getMetadata(range) !== null;
	}

	private positionForOffset(
		participant: InlineEditSearchRuntimeParticipant,
		offset: number
	): unknown | null {
		const doc = participant.doc;
		const clamped = Math.min(Math.max(0, offset), doc.length);
		try {
			if (typeof participant.editor.offsetToPos === "function") {
				return participant.editor.offsetToPos(clamped);
			}
		} catch {
			// Fall back to the CodeMirror document line model.
		}

		try {
			const line = doc.lineAt(clamped);
			return { line: line.number - 1, ch: clamped - line.from };
		} catch {
			return null;
		}
	}

	/** @internal Called by the native-method wrapper installed below. */
	handleAddHighlights(
		editor: InlineEditSearchEditor,
		old: (...args: unknown[]) => unknown,
		ranges: unknown[],
		className: string,
		args: unknown[]
	): unknown {
		if (!Array.isArray(ranges) || !ranges.some((range) => {
			const metadata = getMetadata(range);
			return Boolean(metadata && metadata.participantId !== "host");
		})) {
			return old.call(editor, ranges, className, ...args);
		}

		this.clearEmbedHighlights();
		const hostRanges = ranges.filter((range) => {
			const metadata = getMetadata(range);
			return !metadata || metadata.participantId === "host";
		});
		const result = old.call(editor, hostRanges, className, ...args);
		const participants = this.getParticipants();
		const byParticipant = new Map<string, { participant: InlineEditSearchRuntimeParticipant; ranges: unknown[] }>();

		for (const range of ranges) {
			const metadata = getMetadata(range);
			if (!metadata || metadata.participantId === "host") continue;

			const participant = participants.find((candidate) => candidate.id === metadata.participantId);
			if (!participant) continue;
			const current = byParticipant.get(metadata.participantId) ?? { participant, ranges: [] };
			current.ranges.push({ from: (range as InlineEditSearchRange).from, to: (range as InlineEditSearchRange).to });
			byParticipant.set(metadata.participantId, current);
		}

		for (const { participant, ranges: participantRanges } of byParticipant.values()) {
			try {
				participant.editor.addHighlights(participantRanges, className, ...args);
				this.embedHighlights.push({ editor: participant.editor, className });
			} catch {
				// Highlighting an unavailable detached editor must not break native search.
			}
		}

		return result;
	}

	/** @internal Called by the native-method wrapper and lifecycle cleanup. */
	clearEmbedHighlights(): void {
		const highlights = this.embedHighlights.splice(0);
		for (const { editor, className } of highlights) {
			try {
				editor.removeHighlights(className);
			} catch {
				// ignore detached editors during lifecycle cleanup
			}
		}
	}
}

class AggregatedInlineSearchCursor implements InlineEditNativeSearchCursor {
	private readonly bridge: InlineEditSearchBridge;
	private readonly query: InlineEditSearchInput;
	private readonly nativeCursor: InlineEditNativeSearchCursor | null;
	private readonly editor: InlineEditSearchEditor;
	private readonly initialFrom: number;
	private readonly initialTo: number;
	private currentMatch: InlineEditSearchMatch | null = null;
	private currentRange: InlineEditSearchRange | null = null;

	constructor(
		bridge: InlineEditSearchBridge,
		query: InlineEditSearchInput,
		nativeCursor: InlineEditNativeSearchCursor | null,
		editor: InlineEditSearchEditor
	) {
		this.bridge = bridge;
		this.query = query;
		this.nativeCursor = nativeCursor;
		this.editor = editor;
		this.initialFrom = editor.cm?.state?.selection?.main?.from ?? 0;
		this.initialTo = editor.cm?.state?.selection?.main?.to ?? this.initialFrom;
	}

	getIndexAndCount(): [number, number] {
		const aggregate = this.bridge.getAggregateMatches(this.query);
		if (!aggregate) return this.nativeCursor?.getIndexAndCount?.() ?? [0, 0];
		if (!this.currentMatch) return [0, 0];

		const index = aggregate.matches.findIndex((match) => isSameMatch(this.currentMatch, match));
		if (index === -1) {
			this.clearCurrent();
			return this.nativeCursor?.getIndexAndCount?.() ?? [0, 0];
		}
		return [index + 1, aggregate.matches.length];
	}

	current(): unknown {
		const aggregate = this.bridge.getAggregateMatches(this.query);
		if (!aggregate) {
			this.clearCurrent();
			return this.nativeCursor?.current?.() ?? null;
		}
		if (!this.currentMatch) return this.nativeCursor?.current?.() ?? null;
		if (!aggregate.matches.some((match) => isSameMatch(this.currentMatch, match))) {
			this.clearCurrent();
			return this.nativeCursor?.current?.() ?? null;
		}
		return this.currentRange;
	}

	findPrevious(): unknown {
		const aggregate = this.bridge.getAggregateMatches(this.query);
		if (!aggregate) return this.nativeCursor?.findPrevious?.() ?? null;
		if (aggregate.matches.length === 0) {
			this.currentMatch = null;
			this.currentRange = null;
			return null;
		}

		let index = -1;
		if (this.currentMatch) {
			const currentIndex = aggregate.matches.findIndex((match) => isSameMatch(this.currentMatch, match));
			index = currentIndex === -1 ? aggregate.matches.length - 1 : currentIndex - 1;
			if (currentIndex === -1) this.clearCurrent();
		} else {
			const hasRenderedOrder = aggregate.participants.some(
				(participant) => participant.id !== "host" && Number.isFinite(participant.renderedOrder)
			);
			for (let i = 0; i < aggregate.matches.length; i++) {
				const match = aggregate.matches[i];
				const participant = aggregate.participants.find(
					(candidate) => candidate.id === match.participantId
				);
				const renderedPosition = match.participantId === "host"
					? match.from
					: participant?.renderedOrder;
				if (
					(hasRenderedOrder && Number.isFinite(renderedPosition) && (renderedPosition as number) < this.initialFrom) ||
					(!hasRenderedOrder && match.participantId === "host" && match.from < this.initialFrom)
				) {
					index = i;
				}
			}
			if (index === -1) index = aggregate.matches.length - 1;
		}

		return this.setCurrent(aggregate.matches[(index + aggregate.matches.length) % aggregate.matches.length], aggregate.participants);
	}

	findNext(): unknown {
		const aggregate = this.bridge.getAggregateMatches(this.query);
		if (!aggregate) return this.nativeCursor?.findNext?.() ?? null;
		if (aggregate.matches.length === 0) {
			this.currentMatch = null;
			this.currentRange = null;
			return null;
		}

		let index = -1;
		if (this.currentMatch) {
			const currentIndex = aggregate.matches.findIndex((match) => isSameMatch(this.currentMatch, match));
			index = currentIndex === -1 ? 0 : currentIndex + 1;
			if (currentIndex === -1) this.clearCurrent();
		} else {
			const hasRenderedOrder = aggregate.participants.some(
				(participant) => participant.id !== "host" && Number.isFinite(participant.renderedOrder)
			);
			index = aggregate.matches.findIndex((match) => {
				const participant = aggregate.participants.find(
					(candidate) => candidate.id === match.participantId
				);
				const renderedPosition = match.participantId === "host"
					? match.from
					: participant?.renderedOrder;
				return hasRenderedOrder && Number.isFinite(renderedPosition)
					? (renderedPosition as number) >= this.initialTo
					: !hasRenderedOrder && match.participantId === "host" && match.from >= this.initialTo;
			});
			if (index === -1) index = 0;
		}

		return this.setCurrent(aggregate.matches[index % aggregate.matches.length], aggregate.participants);
	}

	findAll(): unknown[] {
		const aggregate = this.bridge.getAggregateMatches(this.query);
		if (!aggregate) return this.nativeCursor?.findAll?.() ?? [];

		return aggregate.matches
			.map((match) => this.bridge.rangeForMatch(match, aggregate.participants))
			.filter((range): range is InlineEditSearchRange => range !== null);
	}

	replace(replacement: string, origin?: string): unknown {
		const aggregate = this.bridge.getAggregateMatches(this.query);
		if (!aggregate) return this.nativeCursor?.replace?.(replacement, origin);
		if (!this.currentMatch || this.currentMatch.participantId !== "host") return;

		const range = this.bridge.rangeForMatch(this.currentMatch, aggregate.participants);
		if (!range || typeof this.editor.replaceRange !== "function") return;
		return this.editor.replaceRange(replacement, range.from, range.to, origin);
	}

	replaceAll(replacement: string, origin?: string): unknown {
		const aggregate = this.bridge.getAggregateMatches(this.query);
		if (!aggregate) return this.nativeCursor?.replaceAll?.(replacement, origin);
		if (aggregate.matches.some((match) => match.participantId !== "host")) return;
		return this.nativeCursor?.replaceAll?.(replacement, origin);
	}

	private setCurrent(
		match: InlineEditSearchMatch,
		participants: readonly InlineEditSearchRuntimeParticipant[]
	): unknown {
		const range = this.bridge.rangeForMatch(match, participants);
		if (!range) {
			this.currentMatch = null;
			this.currentRange = null;
			return null;
		}

		this.currentMatch = match;
		this.currentRange = range;
		return range;
	}

	private clearCurrent(): void {
		this.currentMatch = null;
		this.currentRange = null;
	}
}
