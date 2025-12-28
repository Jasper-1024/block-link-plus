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
import { replaceMultilineBlocks, cleanupMultilineBlocks } from "basics/flow/markdownPost";
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

		if (this.plugin.settings.inlineEditEnabled) {
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

			// Live Preview mode: multiline blocks render readonly for now (no !![[...]] support)
			replaceMultilineBlocks(element, context, this.plugin, this.plugin.app, false);
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

		// 监听文档变化，检测从!![[]]切换回![[]]的情况
		this.plugin.registerEvent(
			this.plugin.app.workspace.on('editor-change', (editor) => {
				const view = this.plugin.app.workspace.activeLeaf?.view;
				if (view instanceof MarkdownView && view.getMode() === 'source' && editor === view.editor) {
					// 获取当前文档内容
					const content = editor.getValue();

					// 检测是否包含![[file#^xyz-xyz]]或![[file#^xyz-xyz|alias]]格式的多行块
					const multilineBlockRegex = /!\[\[([^\]]+#\^[a-z0-9]+-[a-z0-9]+)(?:\|[^\]]+)?\]\]/g;
					const matches = content.match(multilineBlockRegex);

					if (matches && matches.length > 0) {

						// 查找这些多行块对应的DOM元素
						setTimeout(() => {
							const embeds = view.containerEl.querySelectorAll('.internal-embed.markdown-embed');
							let needsProcessing = false;

							embeds.forEach((embed) => {
								const embedEl = embed as HTMLElement;
								const src = embedEl.getAttribute('src');

								// 检查是否是多行块且没有内容
								let actualSrc = src;
								if (src && src.indexOf('|') !== -1) {
									actualSrc = src.substring(0, src.indexOf('|'));
								}
								if (actualSrc && /#\^([a-z0-9]+)-\1$/.test(actualSrc)) {
									const reactContainer = embedEl.querySelector('.mk-multiline-react-container');
									const hasContent = reactContainer && reactContainer.children.length > 0;
									if (!hasContent) {
										needsProcessing = true;
									}
								}
							});

							if (needsProcessing) {
								this.handleModeSwitch(view, 'multiline-block-update');
							}
						}, 100);
					}
				}
			})
		);
	}

	private handleModeSwitch(view: MarkdownView, switchType: string): void {

		// 第一步：根据不同模式使用不同的选择器 - 从bak11恢复这个逻辑
		const containerSelector = switchType === 'to-reading-mode'
			? '.markdown-preview-view .markdown-preview-sizer'
			: '.cm-content';

		const container = view.containerEl.querySelector(containerSelector);

		// 第二步：使用特定选择器查找嵌入块
		let embeds: NodeListOf<Element>;

		if (container) {
			embeds = switchType === 'to-reading-mode'
				? container.querySelectorAll('p > span.internal-embed.markdown-embed')
				: container.querySelectorAll('.internal-embed.markdown-embed');

		} else {
			// 如果找不到特定容器，使用通用选择器
			embeds = view.containerEl.querySelectorAll('.internal-embed.markdown-embed');
		}

		let processedCount = 0;
		embeds.forEach((embed, index) => {
			const embedEl = embed as HTMLElement;
			const src = embedEl.getAttribute('src');
			const alt = embedEl.getAttribute('alt');
			// Extract actual link without alias
			let actualSrc = src;
			if (src && src.indexOf('|') !== -1) {
				actualSrc = src.substring(0, src.indexOf('|'));
			}
			const isMultilineBlock = (actualSrc && /#\^([a-z0-9]+)-\1$/.test(actualSrc)) ||
				(alt && /\^[a-z0-9]+-[a-z0-9]+/.test(alt));

			if (isMultilineBlock) {

				// 第三步：检查是否需要处理
				// 关键改进：对于模式切换，特别是从Reading到Live Preview，总是强制重新处理
				const forceProcess =
					switchType === 'reading-to-live-preview' || // 从Reading切换到Live Preview
					switchType === 'multiline-block-update';    // 从!![[]]切换到![[]]

				// 检查是否有内容
				const reactContainer = embedEl.querySelector('.mk-multiline-react-container');
				const hasContent = reactContainer && reactContainer.children.length > 0;
				const hasFlowEditor = embedEl.querySelector('.mk-floweditor');
				const hasReactContent = embedEl.querySelector('.mk-multiline-ref');

				// 第四步：更精确的处理判断
				const needsProcessing =
					forceProcess || // 强制处理特定模式切换
					!hasContent || // 没有内容
					(!hasFlowEditor && !hasReactContent) || // 没有必要的内容元素
					embedEl.classList.contains('mk-multiline-block') === false; // 没有正确的类名

				if (needsProcessing) {

					// 第五步：彻底清理旧内容
					// 如果有React容器但没有内容，先清除
					if (reactContainer) {
						reactContainer.remove();
					}

					// 移除可能阻止重新处理的类
					embedEl.classList.remove('mk-multiline-block');
					embedEl.classList.remove('mk-multiline-readonly');

					// 移除任何可能的残留内容
					const existingEditor = embedEl.querySelector('.mk-floweditor');
					if (existingEditor) {
						existingEditor.remove();
					}

					// 第六步：重新渲染
					// Determine if we should show edit icon
					const showEditIcon = switchType !== 'to-reading-mode';

					// Create mock context
					const mockContext = {
						sourcePath: view.file?.path || '',
						frontmatter: null,
						addChild: () => { },
						getSectionInfo: () => null,
						remainingNestLevel: 4
					};

					// Re-render the multiline block
					replaceMultilineBlocks(embedEl, mockContext as any, this.plugin, this.plugin.app, showEditIcon);
					processedCount++;
				}
			}
		});
	}
} 
