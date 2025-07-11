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
			console.log('📝 LIVE PREVIEW POST PROCESSOR CALLED:', {
				elementTag: element.tagName,
				elementClass: element.className,
				sourcePath: context.sourcePath,
				hasEmbeds: element.querySelectorAll('.internal-embed.markdown-embed').length
			});

			const view = this.plugin.app.workspace.activeLeaf?.view;

			if (!(view instanceof MarkdownView && view.editor)) {
				console.log('📝 LIVE PREVIEW: Not MarkdownView or no editor, skipping');
				return;
			}

			// First defense: exit early for reading mode.
			if (view.getMode() === 'preview') {
				console.log('📝 LIVE PREVIEW: In preview mode, skipping');
				return;
			}

			// Second, more precise defense: exit if not in live preview.
			const isLivePreview = view.editor.cm.state.field(editorLivePreviewField, false);
			if (!isLivePreview) {
				console.log('📝 LIVE PREVIEW: Not in live preview mode, skipping');
				return;
			}

			console.log('📝 LIVE PREVIEW: Processing elements...');
			this.processEmbeddedBlocks(element);
			replaceAllTables(this.plugin, element, context);
			// Live Preview mode: showEditIcon = true (enable edit interactions)
			replaceMultilineBlocks(element, context, this.plugin, this.plugin.app, true);
			replaceAllEmbed(element, context, this.plugin, this.plugin.app);
			console.log('📝 LIVE PREVIEW: Processing completed');
		});

		// read mode
		this.plugin.registerMarkdownPostProcessor((element, context) => {
			console.log('📖 READING MODE POST PROCESSOR CALLED:', {
				elementTag: element.tagName,
				elementClass: element.className,
				sourcePath: context.sourcePath,
				hasEmbeds: element.querySelectorAll('.internal-embed.markdown-embed').length
			});

			const view = this.plugin.app.workspace.activeLeaf?.view;

			if (!(view instanceof MarkdownView)) {
				console.log('📖 READING MODE: Not MarkdownView, skipping');
				return;
			}

			// Only process in reading mode
			if (view.getMode() !== 'preview') {
				console.log('📖 READING MODE: Not in preview mode, skipping');
				return;
			}
			
			console.log('📖 READING MODE: Processing elements...');
			// Reading mode: showEditIcon = false (only readonly display)
			replaceMultilineBlocks(element, context, this.plugin, this.plugin.app, false);
			console.log('📖 READING MODE: Processing completed');
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
		
		// 监听文档变化，检测从!![[]]切换回![[]]的情况
		this.plugin.registerEvent(
			this.plugin.app.workspace.on('editor-change', (editor) => {
				const view = this.plugin.app.workspace.activeLeaf?.view;
				if (view instanceof MarkdownView && view.getMode() === 'source' && editor === view.editor) {
					// 获取当前文档内容
					const content = editor.getValue();
					
					// 检测是否包含![[file#^xyz-xyz]]格式的多行块
					const multilineBlockRegex = /!\[\[([^\]]+#\^[a-z0-9]+-[a-z0-9]+)\]\]/g;
					const matches = content.match(multilineBlockRegex);
					
					if (matches && matches.length > 0) {
						console.log('🔄 Detected potential multiline blocks after edit:', matches);
						
						// 查找这些多行块对应的DOM元素
						setTimeout(() => {
							const embeds = view.containerEl.querySelectorAll('.internal-embed.markdown-embed');
							let needsProcessing = false;
							
							embeds.forEach((embed) => {
								const embedEl = embed as HTMLElement;
								const src = embedEl.getAttribute('src');
								
								// 检查是否是多行块且没有内容
								if (src && /#\^([a-z0-9]+)-\1$/.test(src)) {
									const reactContainer = embedEl.querySelector('.mk-multiline-react-container');
									const hasContent = reactContainer && reactContainer.children.length > 0;
									if (!hasContent) {
										console.log('🔄 Found empty multiline block that needs processing:', src);
										needsProcessing = true;
									}
								}
							});
							
							if (needsProcessing) {
								console.log('🔄 Processing empty multiline blocks...');
								this.handleModeSwitch(view, 'multiline-block-update');
							}
						}, 100);
					}
				}
			})
		);
	}
	
	private handleModeSwitch(view: MarkdownView, switchType: string): void {
		console.log('🚀 handleModeSwitch called:', {
			switchType,
			filePath: view.file?.path,
			mode: view.getMode(),
			isLivePreview: view.editor?.cm?.state.field(editorLivePreviewField, false)
		});

		let processedCount = 0;
		const embeds = view.containerEl.querySelectorAll('.internal-embed.markdown-embed');
		console.log('🚀 Found embeds to process:', embeds.length);

		embeds.forEach((embed, index) => {
			const embedEl = embed as HTMLElement;
			const src = embedEl.getAttribute('src');
			const alt = embedEl.getAttribute('alt');
			const isMultilineBlock = (src && /#\^([a-z0-9]+)-\1$/.test(src)) ||
				(alt && /\^[a-z0-9]+-[a-z0-9]+/.test(alt));

			console.log(`🚀 Processing embed ${index}:`, {
				src,
				alt,
				isMultilineBlock,
				classList: embedEl.className,
				hasFlowEditor: !!embedEl.querySelector('.mk-floweditor'),
				hasReactContent: !!embedEl.querySelector('.mk-multiline-ref'),
				hasReactContainer: !!embedEl.querySelector('.mk-multiline-react-container')
			});

			if (isMultilineBlock) {
				console.log('🚀 Processing multiline block...');
				
				// 检查是否有内容
				const reactContainer = embedEl.querySelector('.mk-multiline-react-container');
				const hasContent = reactContainer && reactContainer.children.length > 0;
				const needsProcessing = 
					switchType === 'multiline-block-update' || // 新增：处理从!![[]]切换回![[]]的情况
					!hasContent || // 没有内容
					embedEl.classList.contains('mk-multiline-block') === false; // 没有正确的类名
				
				if (needsProcessing) {
					console.log('🚀 Multiline block needs processing:', {
						switchType,
						hasContent,
						hasClass: embedEl.classList.contains('mk-multiline-block')
					});
					
					// 如果有React容器但没有内容，先清除
					const reactContainer = embedEl.querySelector('.mk-multiline-react-container');
					if (reactContainer && !hasContent) {
						console.log('🚀 Removing empty React container');
						reactContainer.remove();
					}
					
					// 移除可能阻止重新处理的类
					embedEl.classList.remove('mk-multiline-block');
					
					// Determine if we should show edit icon
					const showEditIcon = switchType !== 'to-reading-mode';
					console.log('🚀 showEditIcon:', showEditIcon);

					// Create mock context
					const mockContext = {
						sourcePath: view.file?.path || '',
						frontmatter: null,
						addChild: () => { },
						getSectionInfo: () => null,
						containerEl: embedEl
					};

					console.log('🚀 Re-rendering multiline block...');
					// Re-render the multiline block
					replaceMultilineBlocks(embedEl, mockContext as any, this.plugin, this.plugin.app, showEditIcon);
					processedCount++;
				} else {
					console.log('🚀 Multiline block already has content, skipping');
				}
			}
		});

		console.log('🚀 handleModeSwitch completed, processed:', processedCount);
	}
} 