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
import { replaceAllEmbed, replaceAllTables, replaceMultilineBlocks, cleanupMultilineBlocks } from "basics/flow/markdownPost";
import { getActiveCM } from "basics/codemirror";
import { flowEditorInfo, toggleFlowEditor } from "basics/codemirror/flowEditor";

export class FlowEditorManager {
    private plugin: BlockLinkPlus;
    public enactor: Enactor;
    private lastMode: Record<string, string> = {};

    constructor(plugin: BlockLinkPlus) {
        this.plugin = plugin;
        this.enactor = new ObsidianEnactor(this.plugin);
    }

    public initialize() {
        this.enactor.load();

		if (this.plugin.settings.editorFlow) {
			this.setupFlowEditor();
			this.reloadExtensions(true);
			this.setupMultilineBlockCleanup();
		}
    }

    private setupFlowEditor(): void {
		// Patch workspace for flow editing
		patchWorkspaceForFlow(this.plugin);
		patchWorkspaceLeafForFlow(this.plugin);

		// Apply CSS classes for flow editing
		document.body.classList.add("mk-flow-replace");
		document.body.classList.add("mk-flow-" + this.plugin.settings.editorFlowStyle);

		// live preview
		// Register markdown post processor for embedded blocks
		this.plugin.registerMarkdownPostProcessor((element, context) => {
			const view = this.plugin.app.workspace.activeLeaf?.view;

			if (!(view instanceof MarkdownView && view.editor)) {
				return;
			}

			// First defense: exit early for reading mode.
			if (view.getMode() === 'preview') {
				return;
			}

			// Second, more precise defense: exit if not in live preview.
			const isLivePreview = view.editor.cm.state.field(editorLivePreviewField, false);
			if (!isLivePreview) {
				return;
			}

			this.processEmbeddedBlocks(element);
			replaceAllTables(this.plugin, element, context);
			// Live Preview mode: showEditIcon = true (enable edit interactions)
			replaceMultilineBlocks(element, context, this.plugin, this.plugin.app, true);
			replaceAllEmbed(element, context, this.plugin, this.plugin.app);
		});

		// read mode
		this.plugin.registerMarkdownPostProcessor((element, context) => {
			const view = this.plugin.app.workspace.activeLeaf?.view;

			if (!(view instanceof MarkdownView)) {
				return;
			}

			// Only process in reading mode
			if (view.getMode() !== 'preview') {
				return;
			}
			// Reading mode: showEditIcon = false (only readonly display)
			replaceMultilineBlocks(element, context, this.plugin, this.plugin.app, false);
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

	private setupMultilineBlockCleanup(): void {
		// Listen for workspace layout changes which might indicate mode switches
		this.plugin.registerEvent(
			this.plugin.app.workspace.on('layout-change', () => {
				const view = this.plugin.app.workspace.activeLeaf?.view;
				if (view instanceof MarkdownView && view.file) {
					const currentMode = view.getMode();
					const isLivePreview = view.editor?.cm?.state.field(editorLivePreviewField, false);
					const filePath = view.file.path;
					const previousMode = this.lastMode[filePath];
					
					// Detect mode switches
					if (previousMode && previousMode !== currentMode) {
						// Mode has changed
						if (currentMode === 'source' && isLivePreview && previousMode === 'preview') {
							// Switched from Reading to Live Preview
							setTimeout(() => {
								this.handleModeSwitch(view, 'reading-to-live-preview');
							}, 300); // Give DOM time to stabilize
						} else if (currentMode === 'preview') {
							// Switched to Reading mode
							setTimeout(() => {
								this.handleModeSwitch(view, 'to-reading-mode');
							}, 500); // Delay for Reading mode render
						}
					}
					
					// Track mode state
					this.lastMode[filePath] = currentMode;
					this.lastMode[filePath + '_isLive'] = isLivePreview ? 'true' : 'false';
				}
				
				// Also do generic cleanup
				setTimeout(() => {
					cleanupMultilineBlocks();
				}, 100);
			})
		);
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
		const embeds = switchType === 'to-reading-mode'
			? container.querySelectorAll('p > span.internal-embed.markdown-embed')
			: container.querySelectorAll('.internal-embed.markdown-embed');
			
		embeds.forEach((embed) => {
			const embedEl = embed as HTMLElement;
			const src = embedEl.getAttribute('src');
			const alt = embedEl.getAttribute('alt');
			
			// Check if this is a multiline block
			const isMultilineBlock = (src && /#\^([a-z0-9]+)-\1$/.test(src)) ||
				(alt && /\^[a-z0-9]+-[a-z0-9]+/.test(alt));
				
			if (isMultilineBlock) {
				// For Reading mode, always force re-render because the structure is different
				if (switchType === 'to-reading-mode') {
					// Remove any existing classes that might prevent reprocessing
					embedEl.classList.remove('mk-multiline-block');
					
					// Create mock context for re-processing
					const mockContext = {
						sourcePath: view.file?.path || '',
						frontmatter: null,
						addChild: () => {},
						getSectionInfo: () => null,
						remainingNestLevel: 4
					} as any;
					
					// Re-process the multiline block for Reading mode
					replaceMultilineBlocks(embedEl, mockContext, this.plugin, this.plugin.app, false);
				} else {
					// For Live Preview mode, check if content is missing
					const hasFlowEditor = embedEl.querySelector('.mk-floweditor');
					const hasReactContent = embedEl.querySelector('.mk-multiline-ref');
					
					if (!hasFlowEditor && !hasReactContent) {
						// Content is missing, force re-render
						// Remove the multiline block class to allow reprocessing
						embedEl.classList.remove('mk-multiline-block');
						
						// Determine if we should show edit icon
						const showEditIcon = switchType !== 'to-reading-mode';
						
						// Create mock context for re-processing
						const mockContext = {
							sourcePath: view.file?.path || '',
							frontmatter: null,
							addChild: () => {},
							getSectionInfo: () => null,
							remainingNestLevel: 4
						} as any;
						
						// Re-process the multiline block
						replaceMultilineBlocks(embedEl, mockContext, this.plugin, this.plugin.app, showEditIcon);
					}
				}
			}
		});
	}
} 