import { MarkdownView } from "obsidian";
import { InlineEditEngine } from "../InlineEditEngine";

function createView(initialShown = true) {
	let shown = initialShown;

	const containerEl = document.createElement("div") as HTMLElement & { isShown?: () => boolean };
	const rootEl = document.createElement("div");
	rootEl.className = "markdown-source-view is-live-preview";
	const embedEl = document.createElement("div");
	embedEl.className = "internal-embed markdown-embed inline-embed is-loaded";
	rootEl.appendChild(embedEl);
	containerEl.appendChild(rootEl);
	document.body.appendChild(containerEl);
	containerEl.isShown = jest.fn(() => shown);

	const view = new (MarkdownView as any)(
		{ cm: { state: { field: jest.fn(() => true) } } },
		{ path: "host.md" }
	) as MarkdownView;
	(view as any).containerEl = containerEl;

	return {
		view,
		rootEl,
		embedEl,
		setShown(next: boolean) {
			shown = next;
		},
	};
}

function createPlugin(view: MarkdownView) {
	return {
		settings: {
			inlineEditEnabled: true,
			inlineEditFile: false,
			inlineEditHeading: true,
			inlineEditBlock: true,
		},
		app: {
			workspace: {
				getLeavesOfType: jest.fn(() => [{ view }]),
			},
			metadataCache: {
				getFirstLinkpathDest: jest.fn(),
			},
		},
	} as any;
}

afterEach(() => {
	document.body.replaceChildren();
	jest.restoreAllMocks();
});

describe("InlineEditEngine Live Preview observer lifecycle", () => {
	test("requeues existing embeds only when an observed view returns from hidden to shown", () => {
		const { view, embedEl, setShown } = createView(true);
		const engine = new InlineEditEngine(createPlugin(view));
		jest.spyOn((engine as any).leaves, "isNestedWithinEmbed").mockReturnValue(false);
		const scheduleObserverEntry = jest.fn();
		(engine as any).scheduleObserverEntry = scheduleObserverEntry;

		(engine as any).refreshLivePreviewObservers(false);
		const entry = (engine as any).livePreviewObservers.get(view);
		expect(entry.lastShown).toBe(true);
		expect(entry.pendingEmbeds.has(embedEl)).toBe(true);
		expect(scheduleObserverEntry).toHaveBeenCalledTimes(1);

		entry.pendingEmbeds.clear();
		scheduleObserverEntry.mockClear();

		(engine as any).refreshLivePreviewObservers(false);
		expect(entry.lastShown).toBe(true);
		expect(entry.pendingEmbeds.has(embedEl)).toBe(false);
		expect(scheduleObserverEntry).not.toHaveBeenCalled();

		setShown(false);
		(engine as any).refreshLivePreviewObservers(false);
		expect(entry.lastShown).toBe(false);
		expect(entry.pendingEmbeds.has(embedEl)).toBe(false);
		expect(scheduleObserverEntry).not.toHaveBeenCalled();

		setShown(true);
		(engine as any).refreshLivePreviewObservers(false);
		expect(entry.lastShown).toBe(true);
		expect(entry.pendingEmbeds.has(embedEl)).toBe(true);
		expect(scheduleObserverEntry).toHaveBeenCalledTimes(1);
	});

	test("force rescan still queues existing embed DOM for a recreated observer", () => {
		const { view, embedEl } = createView(true);
		const engine = new InlineEditEngine(createPlugin(view));
		jest.spyOn((engine as any).leaves, "isNestedWithinEmbed").mockReturnValue(false);
		const scheduleObserverEntry = jest.fn();
		(engine as any).scheduleObserverEntry = scheduleObserverEntry;

		(engine as any).refreshLivePreviewObservers(false);
		const firstEntry = (engine as any).livePreviewObservers.get(view);
		firstEntry.pendingEmbeds.clear();
		scheduleObserverEntry.mockClear();

		(engine as any).refreshLivePreviewObservers(true);
		const rescannedEntry = (engine as any).livePreviewObservers.get(view);
		expect(rescannedEntry).not.toBe(firstEntry);
		expect(rescannedEntry.lastShown).toBe(true);
		expect(rescannedEntry.pendingEmbeds.has(embedEl)).toBe(true);
		expect(scheduleObserverEntry).toHaveBeenCalledTimes(1);
	});
});
