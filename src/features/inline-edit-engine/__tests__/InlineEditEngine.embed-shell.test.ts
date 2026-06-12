import { InlineEditEngine } from "../InlineEditEngine";

beforeAll(() => {
	(HTMLElement.prototype as any).addClass = function addClass(className: string) {
		this.classList.add(className);
	};
	(HTMLElement.prototype as any).removeClass = function removeClass(className: string) {
		this.classList.remove(className);
	};
	(HTMLElement.prototype as any).detach = function detach() {
		this.remove();
	};
});

function createPlugin() {
	return {
		settings: {
			inlineEditEnabled: true,
			inlineEditFile: false,
			inlineEditHeading: true,
			inlineEditBlock: true,
		},
		app: {
			metadataCache: {
				getFirstLinkpathDest: jest.fn(),
			},
		},
	} as any;
}

function createEmbedShell() {
	const embedEl = document.createElement("div");
	embedEl.className = "internal-embed markdown-embed inline-embed is-loaded";

	const contentEl = document.createElement("div");
	contentEl.className = "markdown-embed-content";

	const previewEl = document.createElement("div");
	previewEl.className = "markdown-preview-view";
	previewEl.textContent = "[date:: 2026-06-12T00:00:00] [blp_sys:: 1]";
	contentEl.appendChild(previewEl);

	const nestedLink = document.createElement("div");
	nestedLink.className = "markdown-embed-link";
	contentEl.appendChild(nestedLink);

	const linkEl = document.createElement("div");
	linkEl.className = "markdown-embed-link";

	embedEl.appendChild(contentEl);
	embedEl.appendChild(linkEl);
	document.body.appendChild(embedEl);

	return { embedEl, contentEl, previewEl, nestedLink, linkEl };
}

afterEach(() => {
	document.body.replaceChildren();
});

describe("InlineEditEngine embed shell lifecycle", () => {
	test("preserves the native top-level embed link while mounting the inline-edit host", () => {
		const engine = new InlineEditEngine(createPlugin());
		const { embedEl, contentEl, linkEl } = createEmbedShell();

		const { hostEl } = (engine as any).prepareEmbedShell(embedEl);

		expect(embedEl.classList.contains("blp-inline-edit-active")).toBe(true);
		expect(linkEl.isConnected).toBe(true);
		expect(linkEl.parentElement).toBe(embedEl);
		expect(contentEl.isConnected).toBe(true);
		expect(hostEl.className).toBe("blp-inline-edit-host");
		expect(hostEl.parentElement).toBe(contentEl);
		expect(contentEl.firstElementChild).toBe(hostEl);
	});

	test("cleanup removes only BLP host state and leaves the native shell connected", () => {
		const engine = new InlineEditEngine(createPlugin());
		const { embedEl, contentEl, linkEl } = createEmbedShell();

		const { hostEl, cleanup } = (engine as any).prepareEmbedShell(embedEl);
		cleanup();

		expect(hostEl.isConnected).toBe(false);
		expect(embedEl.classList.contains("blp-inline-edit-active")).toBe(false);
		expect(contentEl.isConnected).toBe(true);
		expect(contentEl.parentElement).toBe(embedEl);
		expect(linkEl.isConnected).toBe(true);
		expect(linkEl.parentElement).toBe(embedEl);
	});

	test("does not treat nested preview links as the top-level jump affordance", () => {
		const engine = new InlineEditEngine(createPlugin());
		const { embedEl, contentEl, nestedLink, linkEl } = createEmbedShell();

		const { hostEl } = (engine as any).prepareEmbedShell(embedEl);

		expect(hostEl.parentElement).toBe(contentEl);
		expect(nestedLink.isConnected).toBe(true);
		expect(nestedLink.parentElement).toBe(contentEl);
		expect(linkEl.isConnected).toBe(true);
		expect(linkEl.parentElement).toBe(embedEl);
	});

	test("does not detach a later-added native top-level embed link", () => {
		const engine = new InlineEditEngine(createPlugin());
		const { embedEl } = createEmbedShell();
		embedEl.querySelector(":scope > .markdown-embed-link")?.remove();

		(engine as any).prepareEmbedShell(embedEl);

		const recreatedLink = document.createElement("div");
		recreatedLink.className = "markdown-embed-link";
		embedEl.appendChild(recreatedLink);

		expect(recreatedLink.isConnected).toBe(true);
		expect(recreatedLink.parentElement).toBe(embedEl);
	});
});
