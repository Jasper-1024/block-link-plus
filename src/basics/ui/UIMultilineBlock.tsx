import BlockLinkPlus from "main";
import React, { forwardRef, useEffect, useRef, useState } from "react";
import i18n from "shared/i18n";
import { getLineRangeFromRef } from "shared/utils/obsidian";

const removeLeadingSlash = (path: string) =>
    path.charAt(0) == "/" ? path.substring(1) : path;

const pathToString = (path: string) => {
    if (path.lastIndexOf("/") != -1) {
        if (path.lastIndexOf(".") != -1)
            return removeLeadingSlash(
                path.substring(path.lastIndexOf("/") + 1, path.lastIndexOf("."))
            );
        return path.substring(path.lastIndexOf("/") + 1);
    }
    if (path.lastIndexOf(".") != -1) {
        return path.substring(0, path.lastIndexOf("."));
    }

    return path;
};

export interface MultilineBlockProps {
    plugin: BlockLinkPlus;
    blockRef: string;          // 如 "file#^block-block"
    source?: string;           // 来源文件路径
    classname?: string;        // CSS类名
    onJump?: (ref: string) => void;  // 跳转回调
    onEdit?: () => void;       // 编辑回调 - 切换![[]]为!![[]]
    showEditIcon?: boolean;    // 是否显示编辑图标
}

export const UIMultilineBlock = forwardRef((props: MultilineBlockProps, ref) => {
    const flowRef = useRef<HTMLDivElement>(null);
    const [existsPas, setExistsPas] = useState(false);
    const [loaded, setLoaded] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // 添加行点击跳转的处理函数
    const createLineClickHandler = (parentContainer: HTMLElement, embedElement: HTMLElement) => {
        
        // 添加点击事件监听器到内容区域
        const contentEl = parentContainer.querySelector('.cm-content');
        if (!contentEl) {
            return;
        }
        
        // 允许点击事件但仍保持只读
        const contentDOM = contentEl as HTMLElement;
        contentDOM.style.pointerEvents = 'auto !important';
        contentDOM.style.cssText += 'pointer-events: auto !important;';
        // 确保仍然是只读的
        contentDOM.contentEditable = 'false';
        
        // 也需要允许行元素接收点击事件，但不改变鼠标样式
        const styleEl = document.createElement('style');
        styleEl.textContent = `
            .internal-embed.mk-multiline-readonly .cm-editor .cm-content {
                pointer-events: auto !important;
                user-select: text !important;
            }
            .internal-embed.mk-multiline-readonly .cm-editor .cm-content .cm-line {
                pointer-events: auto !important;
                user-select: text !important;
            }
            .internal-embed.mk-multiline-readonly .cm-editor .cm-content * {
                pointer-events: auto !important;
            }
        `;
        parentContainer.appendChild(styleEl);
        
        // 确保所有子元素都可以接收点击事件
        const allElements = contentEl.querySelectorAll('*');
        allElements.forEach(el => {
            (el as HTMLElement).style.pointerEvents = 'auto';
        });
        
        const handleClick = (e: MouseEvent) => {
            
            // 获取当前文件的编辑器
            const activeLeaf = props.plugin.app.workspace.getLeaf(false);
            const view = activeLeaf?.view;
            
            if (view && 'editor' in view && view.editor) {
                const editor = view.editor;
                
                // 找到嵌入元素在编辑器中的位置
                try {
                    // 使用CodeMirror的API找到DOM元素对应的位置
                    const cm = editor.cm;
                    const pos = cm.posAtDOM(embedElement);
                    
                    if (pos !== null && pos !== undefined) {
                        // 移动光标到嵌入语法所在的行
                        const line = cm.state.doc.lineAt(pos);
                        const linePos = { line: line.number - 1, ch: 0 };
                        
                        editor.setCursor(linePos);
                        editor.scrollIntoView({ from: linePos, to: linePos }, true);
                        editor.focus();
                    } else {
                        console.warn('UIMultilineBlock: Could not find embed position in editor');
                    }
                } catch (err) {
                    console.error('UIMultilineBlock: Error finding embed position:', err);
                }
            }
        };
        
        // 添加点击事件监听器
        contentEl.addEventListener('click', handleClick);
        
        // 清理函数
        return () => {
            contentEl.removeEventListener('click', handleClick);
        };
    };

    // 添加编辑图标的处理函数
    const createEditIcon = (parentContainer: HTMLElement) => {
        // 检查是否已经存在编辑图标
        if (parentContainer.querySelector('.mk-multiline-external-edit')) {
            return;
        }

        // 创建编辑图标容器
        const externalEditIcon = parentContainer.createDiv('mk-multiline-external-edit');
        externalEditIcon.style.cssText = `
            position: absolute;
            top: -34px;
            right: 0px;
            cursor: pointer;
            opacity: 0;
            visibility: hidden;
            transition: opacity 0.2s, visibility 0.2s;
            z-index: var(--layer-popover);
            pointer-events: auto;
            display: flex;
        `;
        
        externalEditIcon.innerHTML = `
            <div class="mk-flowblock-menu">
                <button class="mk-toolbar-button" aria-label="Edit block">
                    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="none" viewBox="0 0 24 24">
                        <path stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 20h9M16.5 3.5a2.121 2.121 0 1 1 3 3L7 19l-4 1 1-4L16.5 3.5Z"/>
                    </svg>
                </button>
            </div>
        `;
        
        externalEditIcon.title = 'Edit block';
        
        // 添加悬停效果处理
        const showEditIconHandler = () => {
            externalEditIcon.style.opacity = '1';
            externalEditIcon.style.visibility = 'visible';
        };
        
        const hideEditIconHandler = () => {
            externalEditIcon.style.opacity = '0';
            externalEditIcon.style.visibility = 'hidden';
        };
        
        // 当鼠标悬停在多行块上时显示编辑图标
        parentContainer.addEventListener('mouseenter', showEditIconHandler);
        parentContainer.addEventListener('mouseleave', hideEditIconHandler);
        
        // 当鼠标悬停在编辑图标上时保持显示
        externalEditIcon.addEventListener('mouseenter', showEditIconHandler);
        externalEditIcon.addEventListener('mouseleave', hideEditIconHandler);
        
        // 为编辑按钮添加悬停效果和点击处理
        const editButton = externalEditIcon.querySelector('.mk-toolbar-button') as HTMLElement;
        if (editButton) {
            editButton.addEventListener('mouseenter', () => {
                editButton.style.color = 'var(--text-accent)';
                editButton.style.background = 'var(--background-modifier-hover)';
            });
            
            editButton.addEventListener('mouseleave', () => {
                editButton.style.color = 'var(--mk-ui-text-tertiary)';
                editButton.style.background = 'rgba(var(--nav-item-background-active), 0.3)';
            });
            
            // 点击编辑按钮的处理
            editButton.addEventListener('click', (e) => {
                e.stopPropagation();
                e.preventDefault();
                
                // 触发编辑功能 - 将![[]]切换为!![[]]
                if (props.onEdit) {
                    props.onEdit();
                }
            });
        }
    };

    // 添加跳转图标的处理函数
    const createJumpIcon = (parentContainer: HTMLElement) => {
        // 检查是否已经存在跳转图标
        if (parentContainer.querySelector('.mk-multiline-jump-link')) {
            return;
        }

        // 创建跳转图标容器
        const jumpIconContainer = parentContainer.createDiv("mk-multiline-jump-link");
        jumpIconContainer.setAttribute("aria-label", "Open link");
        jumpIconContainer.title = "Jump to original location";

        // 添加跳转图标SVG
        jumpIconContainer.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="svg-icon lucide-link"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"></path><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"></path></svg>`
        // 添加点击事件处理器
        jumpIconContainer.addEventListener("click", async (e) => {
            e.stopPropagation();
            e.preventDefault();

            try {
                // 解析路径获取文件和block ID
                const parts = props.blockRef.split('#');
                const filePath = parts[0];
                const blockId = parts[1];

                if (filePath && blockId) {
                    // 检查是否同文件导航
                    const activeLeaf = props.plugin.app.workspace.getLeaf(false);
                    const currentView = activeLeaf?.view;
                    const currentFile = currentView && 'file' in currentView ? currentView.file : null;
                    const isSameFileNavigation = currentFile && (
                        currentFile.name.replace('.md', '') === filePath ||
                        currentFile.path === filePath + '.md' ||
                        currentFile.path === filePath ||
                        (currentFile as any).basename === filePath
                    );

                    if (isSameFileNavigation) {
                        // 同文件导航 - 直接高亮多行
                        const editor = currentView && 'editor' in currentView ? currentView.editor : null;
                        if (editor) {
                            // 修复blockId格式
                            const formattedRef = blockId.startsWith('#') ? blockId : `#${blockId}`;
                            const lineRange = getLineRangeFromRef(
                                currentFile.path,
                                formattedRef,
                                props.plugin.app
                            );

                            if (lineRange[0] && lineRange[1]) {
                                const startLine = lineRange[0] - 1;
                                const endLine = lineRange[1] - 1;
                                const from = { line: startLine, ch: 0 };
                                const to = { line: endLine, ch: editor.getLine(endLine).length };

                                // 应用选择
                                editor.focus();
                                editor.setSelection(from, to);
                                editor.scrollIntoView({ from, to }, true);

                                return;
                            }
                        }
                    }

                    // 跨文件导航 - 使用 openLinkText 进行标准块引用处理
                    try {
                        // 使用 Obsidian 的原生 openLinkText 进行正确的块引用处理
                        await props.plugin.app.workspace.openLinkText(
                            props.blockRef,
                            props.source || "",
                            false
                        );

                        // 对于多行块，在导航后应用额外的选择
                        setTimeout(async () => {
                            const activeLeaf = props.plugin.app.workspace.getLeaf(false);
                            const activeView = activeLeaf?.view;
                            const editor = activeView && 'editor' in activeView ? activeView.editor : null;

                            if (editor) {
                                const formattedRef = blockId.startsWith('#') ? blockId : `#${blockId}`;
                                const lineRange = getLineRangeFromRef(filePath + ".md", formattedRef, props.plugin.app);

                                if (lineRange[0] && lineRange[1]) {
                                    const startLine = lineRange[0] - 1;
                                    const endLine = lineRange[1] - 1;
                                    const from = { line: startLine, ch: 0 };
                                    const to = { line: endLine, ch: editor.getLine(endLine).length };

                                    editor.focus();
                                    editor.setSelection(from, to);
                                    editor.scrollIntoView({ from, to }, true);
                                }
                            }
                        }, 100);

                        return;
                    } catch (error) {
                        console.error("跳转失败:", error);

                        // 回退到基本文件打开
                        const uri = props.plugin.enactor.uriByString(props.blockRef, props.source);

                        if (!uri) {
                            return;
                        }

                        const file = props.plugin.app.metadataCache.getFirstLinkpathDest(filePath, props.source || "");

                        if (!file) {
                            return;
                        }

                        const lineRange = getLineRangeFromRef(file.path, blockId ? `#${blockId}` : undefined, props.plugin.app);

                        // 打开文件并导航到块位置，实现正确的高亮
                        const leaf = props.plugin.app.workspace.getLeaf(false);
                        await leaf.openFile(file);

                        // 如果有有效范围，应用高亮
                        if (lineRange[0] && lineRange[1] && leaf.view?.editor) {
                            const editor = leaf.view.editor;
                            const startLine = lineRange[0] - 1;
                            const endLine = lineRange[1] - 1;

                            // 获取行范围的光标位置
                            const from = { line: startLine, ch: 0 };
                            const to = { line: endLine, ch: editor.getLine(endLine).length };

                            editor.setSelection(from, to);
                            editor.scrollIntoView({ from, to }, true);
                        }
                    }
                }
            } catch (err) {
                console.error('UIMultilineBlock: 跳转错误:', err);
            }
        });
    };

    const loadMultilineBlock = async (force?: boolean) => {
        // Use the component's own container instead of parent
        const container = flowRef.current;
        if (!container) return;

        try {
            // 解析多行块引用
            const path = props.plugin.enactor.uriByString(props.blockRef, props.source);
            if (!path) {
                setError(`Invalid block reference: ${props.blockRef}`);
                setExistsPas(true);
                setLoaded(false);
                return;
            }

            const pathExists = props.plugin.app.vault.getAbstractFileByPath(path.basePath) != null;
            const filePath = pathExists ? path.fullPath : null;

            if (!filePath) {
                if (!force) {
                    setError(`File not found: ${path.basePath}`);
                    setExistsPas(true);
                    setLoaded(false);
                    return;
                } else {
                    // 对于多行块，不支持自动创建文件
                    setError(`Cannot create file for multiline block: ${path.basePath}`);
                    setExistsPas(true);
                    setLoaded(false);
                    return;
                }
            } else {
                setExistsPas(false);
                setError(null);

                // Find the actual embed element (parent of react container)
                const embedElement = container.closest('.internal-embed.markdown-embed');
                if (embedElement) {
                    embedElement.classList.add('mk-multiline-readonly');
                }

                // 使用enactor.openPath在容器中创建编辑器，并设置为只读
                props.plugin.enactor.openPath(filePath, container, true);

                // 在编辑器加载后添加跳转图标、编辑图标和行链接功能
                setTimeout(() => {
                    if (embedElement) {
                        createJumpIcon(embedElement as HTMLElement);
                        // 只在Live Preview模式下显示编辑图标
                        if (props.showEditIcon) {
                            createEditIcon(embedElement as HTMLElement);
                        }
                    }
                    // 增加延迟以确保编辑器完全加载
                    setTimeout(() => {
                        if (embedElement && props.showEditIcon) {
                            createLineClickHandler(container, embedElement as HTMLElement);
                        }
                    }, 300);
                }, 150);
            }

            setLoaded(true);
        } catch (err) {
            console.error('UIMultilineBlock: Error loading multiline block:', err);
            setError(err instanceof Error ? err.message : 'Unknown error');
            setLoaded(false);
        }
    };

    const toggleFlow = () => {
        // Clear any existing editor content in container
        const container = flowRef.current;
        if (container) {
            // Remove any existing flow editor content
            const existingEditor = container.querySelector('.mk-floweditor');
            if (existingEditor) {
                existingEditor.remove();
            }
            // Find and clean the embed element
            const embedElement = container.closest('.internal-embed.markdown-embed');
            if (embedElement) {
                embedElement.classList.remove('mk-multiline-readonly');
            }
        }
        loadMultilineBlock();
    };

    useEffect(() => {
        toggleFlow();
    }, [props.blockRef]);

    useEffect(() => {
        // 组件挂载时的初始化逻辑
        // 清理函数可以在需要时添加
        return () => {
            // Cleanup logic if needed
        };
    }, []);

    // Handle error state by rendering error in the component's container
    useEffect(() => {
        if (existsPas || error) {
            const container = flowRef.current;
            if (container) {
                // Clear existing editor content
                const existingEditor = container.querySelector('.mk-floweditor');
                if (existingEditor) {
                    existingEditor.remove();
                }

                // Add error styling to container
                container.classList.add('mk-multiline-error');
                container.style.cssText = 'color: var(--text-error); padding: 8px; border: 1px solid var(--background-modifier-error); border-radius: 4px; background: var(--background-modifier-error); cursor: pointer; margin: 0.5rem 0;';
                container.textContent = error || i18n.labels.notePlaceholder.replace("${1}", pathToString(props.blockRef));
                container.onclick = () => loadMultilineBlock(true);
            }
        }
    }, [existsPas, error]);

    // Return a proper container div instead of hidden span
    return (
        <div
            ref={flowRef}
            className="mk-multiline-container mk-flowspace-editor"
            style={{ width: '100%' }}
        />
    );
});
UIMultilineBlock.displayName = "UIMultilineBlock"; 