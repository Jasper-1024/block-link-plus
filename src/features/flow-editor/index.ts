// This file will contain the FlowEditorManager class.
// Content will be added in the next steps. 

import BlockLinkPlus from "main";
import { Enactor } from "basics/enactor/enactor";
import { ObsidianEnactor } from "basics/enactor/obsidian";
import { MarkdownView, editorLivePreviewField } from "obsidian";
import {
	patchWorkspaceForFlow,
	patchWorkspaceLeafForFlow,
} from "basics/flow/patchWorkspaceForFlow";
import { replaceAllEmbed, replaceAllTables, replaceMultilineBlocks } from "basics/flow/markdownPost";
import { getActiveCM } from "basics/codemirror";
import { flowEditorInfo, toggleFlowEditor } from "basics/codemirror/flowEditor";

export class FlowEditorManager {
	private plugin: BlockLinkPlus;
	public enactor: Enactor;
	private lastMode: { [key: string]: string } = {}; // Track mode per file

	constructor(plugin: BlockLinkPlus) {
		this.plugin = plugin;
		this.enactor = new ObsidianEnactor(this.plugin);
	}

	private handleModeSwitch(view: MarkdownView, switchType: string): void {
		// Different selectors for different modes
		const containerSelector = switchType === 'to-reading-mode'
			? '.markdown-preview-view .markdown-preview-sizer'
			: '.cm-content';

		const container = view.containerEl.querySelector(containerSelector);
		if (!container) {
			return;
		}

		// Find all embedded markdown blocks
		// In Reading mode, embeds are inside p > span elements
		const embeds = switchType === 'to-reading-mode'
			? container.querySelectorAll('p > span.internal-embed.markdown-embed')
			: container.querySelectorAll('.internal-embed.markdown-embed');

		let processedCount = 0;

		embeds.forEach((embed) => {
			const embedEl = embed as HTMLElement;
			const src = embedEl.getAttribute('src');
			const alt = embedEl.getAttribute('alt');

			// Check if this is a multiline block
			const isMultilineBlock = (src && /#\^([a-z0-9]+)-\1$/.test(src)) ||
				(alt && /\^[a-z0-9]+-[a-z0-9]+/.test(alt));

			if (isMultilineBlock) {
				// Check container state
				const mkContainer = embedEl.querySelector('.mk-multiline-block-container');
				const hasContent = mkContainer && mkContainer.querySelector('.mk-flowspace-editor .mk-floweditor');

				if (mkContainer && !hasContent) {
					// Remove the empty container
					mkContainer.remove();

					// Determine if we should show edit icon
					const showEditIcon = switchType !== 'to-reading-mode';

					// Create mock context
					const mockContext = {
						sourcePath: view.file?.path || '',
						frontmatter: null,
						addChild: () => { },
						getSectionInfo: () => null,
						containerEl: embedEl
					};

					// Re-render the multiline block
					replaceMultilineBlocks(embedEl, mockContext as any, this.plugin, this.plugin.app, showEditIcon);
					processedCount++;
				} else if (!mkContainer) {
					// For Reading mode, we might need to trigger initial render
					if (switchType === 'to-reading-mode') {
						const mockContext = {
							sourcePath: view.file?.path || '',
							frontmatter: null,
							addChild: () => { },
							getSectionInfo: () => null,
							containerEl: embedEl
						};

						replaceMultilineBlocks(embedEl, mockContext as any, this.plugin, this.plugin.app, false);
						processedCount++;
					}
				}
			}
		});

	}

	public initialize() {
		this.enactor.load();

		if (this.plugin.settings.editorFlow) {
			this.setupFlowEditor();
			this.reloadExtensions(true);
		}
	}

	private setupFlowEditor(): void {
		// Patch workspace for flow editing
		patchWorkspaceForFlow(this.plugin);
		patchWorkspaceLeafForFlow(this.plugin);

		// Apply CSS classes for flow editing
		document.body.classList.add("mk-flow-replace");
		document.body.classList.add("mk-flow-" + this.plugin.settings.editorFlowStyle);

		// Add mode change listener for debugging and fixing re-render issues
		this.plugin.registerEvent(
			this.plugin.app.workspace.on('layout-change', () => {
				const view = this.plugin.app.workspace.activeLeaf?.view;
				if (view instanceof MarkdownView && view.file) {
					const currentMode = view.getMode();
					const isLivePreview = view.editor?.cm?.state.field(editorLivePreviewField, false);
					const filePath = view.file.path;
					const previousMode = this.lastMode[filePath];

					// Check if we switched modes (any mode switch that might affect rendering)
					if (previousMode && previousMode !== currentMode) {
						// Handle different mode switches
						if (currentMode === 'source' && isLivePreview && previousMode === 'preview') {
							// Switched from Reading to Live Preview
							this.handleModeSwitch(view, 'reading-to-live-preview');
						} else if (currentMode === 'preview') {
							// Switched to Reading mode from any other mode
							// Need to wait a bit longer for Reading mode as it takes more time to render
							setTimeout(() => {
								this.handleModeSwitch(view, 'to-reading-mode');
							}, 500); // Increase delay for Reading mode
						} else if (currentMode === 'source' && isLivePreview && previousMode === 'source' && this.lastMode[filePath + '_isLive'] !== 'true') {
							// Switched from Source to Live Preview
							this.handleModeSwitch(view, 'source-to-live-preview');
						}
					}

					// Track Live Preview state separately
					this.lastMode[filePath + '_isLive'] = isLivePreview ? 'true' : 'false';
					// Update last mode
					this.lastMode[filePath] = currentMode;
				}
			})
		);

		// live preview mode only
		this.plugin.registerMarkdownPostProcessor((element, context) => {
			const view = this.plugin.app.workspace.activeLeaf?.view;
			if (!(view instanceof MarkdownView && view.editor)) {
				return;
			}

			// First defense: exit early for reading mode.
			const mode = view.getMode();
			if (mode === 'preview') {
				return;
			}

			// Second, more precise defense: exit if not in live preview.
			const isLivePreview = view.editor.cm.state.field(editorLivePreviewField, false);
			if (!isLivePreview) {
				return;
			}

			this.processEmbeddedBlocks(element);
			replaceAllTables(this.plugin, element, context);
			replaceMultilineBlocks(element, context, this.plugin, this.plugin.app, true);
			replaceAllEmbed(element, context, this.plugin, this.plugin.app);
		});

		// read mode only
		this.plugin.registerMarkdownPostProcessor((element, context) => {
			const view = this.plugin.app.workspace.activeLeaf?.view;
			if (!(view instanceof MarkdownView && view.editor)) {
				return;
			}
			// only read mode
			const mode = view.getMode();
			if (mode !== 'preview') {
				return;
			}

			// Special handling if the element itself is an embed
			if (element.classList.contains('internal-embed') && element.classList.contains('markdown-embed')) {
				const src = element.getAttribute('src');
				const alt = element.getAttribute('alt');

				// Check if this is a multiline block
				const isMultilineBlock = (src && /#\^([a-z0-9]+)-\1$/.test(src)) ||
					(alt && /\^[a-z0-9]+-[a-z0-9]+/.test(alt));

				if (isMultilineBlock) {
					replaceMultilineBlocks(element, context, this.plugin, this.plugin.app, false);
				}
				return;
			}

			// Process any existing embeds
			const processExistingEmbeds = () => {
				const directEmbeds = element.querySelectorAll('.internal-embed.markdown-embed');

				directEmbeds.forEach((embed) => {
					const embedEl = embed as HTMLElement;
					const src = embedEl.getAttribute('src');
					const alt = embedEl.getAttribute('alt');

					// Check if this is a multiline block
					const isMultilineBlock = (src && /#\^([a-z0-9]+)-\1$/.test(src)) ||
						(alt && /\^[a-z0-9]+-[a-z0-9]+/.test(alt));

					if (isMultilineBlock) {
						replaceMultilineBlocks(embedEl, context, this.plugin, this.plugin.app, false);
					}
				});
			};

			// Process immediately
			this.processEmbeddedBlocks(element);
			processExistingEmbeds();

			// Also use MutationObserver for dynamically added embeds
			let observerActive = true;
			const observer = new MutationObserver((mutations) => {
				if (!observerActive) return;

				let embedsAdded = false;
				for (const mutation of mutations) {
					for (const node of mutation.addedNodes) {
						if (node instanceof HTMLElement) {
							if (node.classList.contains('internal-embed') && node.classList.contains('markdown-embed')) {
								const src = node.getAttribute('src');
								const alt = node.getAttribute('alt');
								const isMultilineBlock = (src && /#\^([a-z0-9]+)-\1$/.test(src)) ||
									(alt && /\^[a-z0-9]+-[a-z0-9]+/.test(alt));

								if (isMultilineBlock) {
									replaceMultilineBlocks(node, context, this.plugin, this.plugin.app, false);
								}
							} else if (node.querySelector('.internal-embed.markdown-embed')) {
								embedsAdded = true;
							}
						}
					}
				}

				if (embedsAdded) {
					processExistingEmbeds();
				}
			});

			// Start observing
			observer.observe(element, {
				childList: true,
				subtree: true,
				attributes: true,
				attributeFilter: ['src', 'alt']
			});

			// Disconnect observer after a timeout to avoid memory leaks
			setTimeout(() => {
				observerActive = false;
				observer.disconnect();
			}, 5000);
		});
	}

	private processEmbeddedBlocks(element: HTMLElement): void {
		const embeds = element.querySelectorAll(".internal-embed.markdown-embed");
		for (let index = 0; index < embeds.length; index++) {
			const embed = embeds.item(index) as HTMLElement;
			if (
				embed.previousSibling &&
				embed.previousSibling.textContent?.slice(-1) === "!"
			) {
				embed.previousSibling.textContent =
					embed.previousSibling.textContent.slice(0, -1);
			}
		}
	}

	public reloadExtensions(firstLoad: boolean): void {
		(this.enactor as ObsidianEnactor).loadExtensions(firstLoad);
	}

	public openFlow(): void {
		const cm = getActiveCM(this.plugin);
		if (cm) {
			const value = cm.state.field(flowEditorInfo, false);
			if (!value) return;
			const currPosition = cm.state.selection.main;
			for (const flowEditor of value) {
				if (
					flowEditor.from < currPosition.to &&
					flowEditor.to > currPosition.from
				) {
					cm.dispatch({
						annotations: toggleFlowEditor.of([flowEditor.id, 2]),
					});
				}
			}
		}
	}

	public closeFlow(): void {
		const cm = getActiveCM(this.plugin);
		if (cm) {
			const value = cm.state.field(flowEditorInfo, false);
			if (!value) return;
			const currPosition = cm.state.selection.main;
			for (const flowEditor of value) {
				if (
					flowEditor.from < currPosition.to &&
					flowEditor.to > currPosition.from
				) {
					cm.dispatch({
						annotations: toggleFlowEditor.of([flowEditor.id, 0]),
					});
				}
			}
		}
	}
} 