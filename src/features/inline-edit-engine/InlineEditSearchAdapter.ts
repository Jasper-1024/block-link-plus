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

type InlineEditSearchAggregate = {
	fingerprint: string;
	participants: readonly InlineEditSearchRuntimeParticipant[];
	matches: InlineEditSearchMatch[];
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
		bridge.clearEmbedHighlights(className);
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
	private searchEditorUninstaller: (() => void) | null = null;
	private searchContainerObserver: MutationObserver | null = null;
	private attachedSearch: unknown = null;
	private readonly embedHighlights: Array<{ editor: InlineEditSearchEditor; className: string }> = [];
	private readonly participantDispatchUninstallers = new Map<object, () => void>();
	private readonly participantDocumentIds = new WeakMap<object, number>();
	private readonly participantEditorIds = new WeakMap<object, number>();
	private nextParticipantDocumentId = 1;
	private nextParticipantEditorId = 1;
	private suppressHostSelection = false;
	private activeQuery: InlineEditSearchInput | null = null;
	private activeParticipantFingerprint: string | null = null;
	private currentParticipantId: string | null = null;
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
		if (search.editor !== this.options.editor) return false;

		try {
			this.searchUninstaller?.();
		} catch {
			// ignore
		}
		this.searchUninstaller = null;
		this.restoreSearchEditor();
		this.disconnectSearchContainerObserver();

		try {
			const editor = this.options.editor;
			const searchCursor = (query: InlineEditSearchInput, ...args: unknown[]) => this.createSearchCursor(query, ...args);
			// Only this panel receives cross-editor cursors. The real editor's
			// searchCursor remains untouched for every other plugin/caller.
			const boundMethods = new Map<PropertyKey, { original: Function; bound: Function }>();
			const panelEditor = new Proxy(editor, {
				get(target, key) {
					if (key === "searchCursor") return searchCursor;
					const value = Reflect.get(target, key, target);
					if (typeof value !== "function") return value;
					let entry = boundMethods.get(key);
					if (!entry || entry.original !== value) {
						entry = { original: value, bound: value.bind(target) };
						boundMethods.set(key, entry);
					}
					return entry.bound;
				},
				set: (target, key, value) => Reflect.set(target, key, value, target),
			});
			this.searchEditorUninstaller = () => {
				if (search.editor === panelEditor) search.editor = editor;
			};
			search.editor = panelEditor;
			if (search.editor !== panelEditor) throw new Error("Search editor is not replaceable");
			this.searchUninstaller = around(search as any, {
				hide: (old: any) => createSearchHideWrapper(this, old),
			});
			this.attachedSearch = search;
			this.observeSearchContainer(search);
			return true;
		} catch {
			try {
				this.searchUninstaller?.();
			} catch {
				// ignore a partially installed private search wrapper
			}
			this.searchUninstaller = null;
			this.restoreSearchEditor();
			this.disconnectSearchContainerObserver();
			this.attachedSearch = null;
			return false;
		}
	}

	dispose(): void {
		if (this.disposed) return;
		this.disposed = true;
		this.suppressHostSelection = false;
		this.currentParticipantId = null;
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
		this.restoreSearchEditor();
		this.searchContainerObserver?.disconnect();
		this.searchContainerObserver = null;
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

	private restoreSearchEditor(): void {
		try {
			this.searchEditorUninstaller?.();
		} catch {
			// A third party may freeze/replace the panel while it is being torn
			// down. Always finish disposing our remaining wrappers and observers.
		} finally {
			this.searchEditorUninstaller = null;
		}
	}

	/** Create the cursor owned by the attached Find panel, never by host callers. */
	createSearchCursor(query: InlineEditSearchInput, ...args: unknown[]): InlineEditNativeSearchCursor {
		const editor = this.options.editor;
		return createSearchCursorWrapper(this, editor.searchCursor).call(editor, query, ...args);
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
		if (this.disposed) return;
		this.currentParticipantId = null;
		this.activeQuery = query;
		this.activeParticipantFingerprint = this.getParticipantFingerprint(this.getParticipants());
	}

	/** @internal Called when a cursor is not aggregating or the bridge is disposed. */
	clearActiveQuery(): void {
		this.currentParticipantId = null;
		this.activeQuery = null;
		this.activeParticipantFingerprint = null;
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
		if (this.suppressHostSelection) return true;
		try {
			const search = this.attachedSearch as { isActive?: boolean } | null;
			return search?.isActive === false && this.currentParticipantId !== null && this.currentParticipantId !== "host";
		} catch {
			return false;
		}
	}

	setCurrentParticipant(participantId: string | null): void {
		this.currentParticipantId = participantId;
	}

	private observeSearchContainer(search: any): void {
		const container = search?.containerEl;
		const parent = container?.parentElement;
		if (!(container instanceof HTMLElement) || !(parent instanceof HTMLElement)) return;

		this.searchContainerObserver?.disconnect();
		this.searchContainerObserver = new MutationObserver(() => {
			if (!container.isConnected || search.isActive === false) this.dispose();
		});
		this.searchContainerObserver.observe(parent, { childList: true, subtree: true });
		this.searchContainerObserver.observe(container, { attributes: true });
	}

	private disconnectSearchContainerObserver(): void {
		this.searchContainerObserver?.disconnect();
		this.searchContainerObserver = null;
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
		const participantFingerprint = this.getParticipantFingerprint(this.getParticipants());
		// Live Preview observers also run for selection, scrolling, and DOM-only
		// changes. Re-running native onSearchInput for those events recreates the
		// aggregate cursor at its first match, so Next/Previous appears stuck.
		// Rebuild only when a participant's document, visible range, or rendered
		// membership actually changes. `renderedOrder` intentionally stays out of
		// this fingerprint: Obsidian's posAtDOM anchor may shift while scrolling
		// even though the document and participant order are unchanged.
		if (
			this.activeQuery !== null &&
			participantFingerprint === this.activeParticipantFingerprint
		) {
			return;
		}
		this.activeParticipantFingerprint = participantFingerprint;

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

	private getParticipantFingerprint(
		participants: readonly InlineEditSearchRuntimeParticipant[]
	): string {
		return participants
			.map((participant) => {
				const doc = participant.doc as unknown as object;
				let documentId = this.participantDocumentIds.get(doc);
				if (documentId === undefined) {
					documentId = this.nextParticipantDocumentId++;
					this.participantDocumentIds.set(doc, documentId);
				}
				const visibleRange = participant.visibleRange?.join(":") ?? "";
				const editor = participant.editor as unknown as object;
				let editorId = this.participantEditorIds.get(editor);
				if (editorId === undefined) {
					editorId = this.nextParticipantEditorId++;
					this.participantEditorIds.set(editor, editorId);
				}
				const ignoredRanges = participant.ignoredRanges
					?.map(([from, to]) => `${from}:${to}`)
					.join(",") ?? "";
				return `${participant.id}|${documentId}|${editorId}|${visibleRange}|${ignoredRanges}`;
			})
			.join(";");
	}

	getAggregateMatches(
		query: InlineEditSearchInput,
		cached?: InlineEditSearchAggregate | null
	): InlineEditSearchAggregate | null {
		if (this.disposed) return null;
		const participants = this.getParticipants();
		if (!participants.some((participant) => participant.id !== "host")) return null;
		const fingerprint = this.getParticipantFingerprint(participants);
		if (cached?.fingerprint === fingerprint) return cached;

		try {
			return {
				fingerprint,
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
		const aggregateRanges = Array.isArray(ranges)
			? ranges.filter((range) => getMetadata(range) !== null)
			: [];
		if (aggregateRanges.length === 0) {
			if (Array.isArray(ranges) && ranges.length === 0) this.clearEmbedHighlights(className);
			return old.call(editor, ranges, className, ...args);
		}

		// Native search emits a host-only aggregate range when navigation leaves
		// an embed. Clear only this search class; unrelated highlight users share
		// the same general editor methods while Find is open.
		this.clearEmbedHighlights(className);
		if (!aggregateRanges.some((range) => getMetadata(range)?.participantId !== "host")) {
			return old.call(editor, ranges, className, ...args);
		}

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
	clearEmbedHighlights(className?: string): void {
		const highlights = className === undefined
			? this.embedHighlights.splice(0)
			: this.embedHighlights.filter((highlight) => highlight.className === className);
		if (className !== undefined) {
			for (let index = this.embedHighlights.length - 1; index >= 0; index--) {
				if (this.embedHighlights[index].className === className) this.embedHighlights.splice(index, 1);
			}
		}
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
	private readonly initialMatchOrder = new Map<string, number>();
	private aggregateCache: InlineEditSearchAggregate | null = null;
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
		const initialAggregate = this.bridge.getAggregateMatches(this.query);
		this.aggregateCache = initialAggregate;
		for (const [index, match] of initialAggregate?.matches.entries() ?? []) {
			this.initialMatchOrder.set(this.matchKey(match), index);
		}
	}

	getIndexAndCount(): [number, number] {
		const aggregate = this.getAggregateMatches();
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
		const aggregate = this.getAggregateMatches();
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
		const aggregate = this.getAggregateMatches();
		if (!aggregate) return this.nativeCursor?.findPrevious?.() ?? null;
		if (aggregate.matches.length === 0) {
			this.clearCurrent();
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
		const aggregate = this.getAggregateMatches();
		if (!aggregate) return this.nativeCursor?.findNext?.() ?? null;
		if (aggregate.matches.length === 0) {
			this.clearCurrent();
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
		const aggregate = this.getAggregateMatches();
		if (!aggregate) return this.nativeCursor?.findAll?.() ?? [];

		return aggregate.matches
			.map((match) => this.bridge.rangeForMatch(match, aggregate.participants))
			.filter((range): range is InlineEditSearchRange => range !== null);
	}

	replace(replacement: string, origin?: string): unknown {
		const aggregate = this.getAggregateMatches();
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
			this.clearCurrent();
			return null;
		}

		this.currentMatch = match;
		this.currentRange = range;
		this.bridge.setCurrentParticipant(match.participantId);
		return range;
	}

	private clearCurrent(): void {
		this.currentMatch = null;
		this.currentRange = null;
		this.bridge.setCurrentParticipant(null);
	}

	private getAggregateMatches(): InlineEditSearchAggregate | null {
		const aggregate = this.bridge.getAggregateMatches(this.query, this.aggregateCache);
		if (!aggregate) {
			this.aggregateCache = null;
			this.clearCurrent();
			return null;
		}
		if (aggregate === this.aggregateCache) return aggregate;

		// posAtDOM may report different offsets as Live Preview scrolls or
		// virtualizes DOM nodes. Keep the initial match order for this Find
		// session so the same match never changes from (for example) 5/7 to 2/7.
		const matches = [...aggregate.matches].sort((left, right) => {
			const leftOrder = this.initialMatchOrder.get(this.matchKey(left));
			const rightOrder = this.initialMatchOrder.get(this.matchKey(right));
			if (leftOrder === undefined && rightOrder === undefined) return 0;
			if (leftOrder === undefined) return 1;
			if (rightOrder === undefined) return -1;
			return leftOrder - rightOrder;
		});
		this.aggregateCache = { ...aggregate, matches };
		return this.aggregateCache;
	}

	private matchKey(match: InlineEditSearchMatch): string {
		return `${match.participantId}|${match.from}|${match.to}|${match.line}`;
	}
}
