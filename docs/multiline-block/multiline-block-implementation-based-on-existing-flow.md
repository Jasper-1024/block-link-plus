# 多行 Block 功能实现方案 - 基于 !![[]] 流程扩展

## 一、设计原则

### 1.1 核心理念
- **复用而非重建**：基于成熟的 `!![[]]` 处理流程扩展
- **最小改动原则**：尽可能少地修改现有代码
- **统一处理流程**：Live Preview 和 Reading Mode 保持一致

### 1.2 语法设计
```markdown
!![[file#^blockid]]     # 可编辑嵌入（支持单行/多行）
^![[file#^xyz-xyz]]     # 只读多行块嵌入（新增）
```

## 二、技术实现方案

### 2.1 扩展 FlowEditorLinkType 枚举

```typescript
// src/types/index.ts
export enum FlowEditorLinkType {
  Link = 0,
  Embed = 1,              // !![[]] 嵌入
  EmbedClosed = 2,
  ReadOnlyEmbed = 3,      // 新增：^![[]] 多行只读
}
```

### 2.2 扩展 flowEditorInfo StateField（新增检测逻辑）

```typescript
// src/basics/codemirror/flowEditor.tsx
export const flowEditorInfo = StateField.define<FlowEditorInfo[]>({
  update(value, tr) {
    const newValues = [] as FlowEditorInfo[];
    const str = tr.newDoc.sliceString(0);
    
    // 现有：处理 !![[]]
    for (const match of str.matchAll(/!!\[\[([^\]]+)\]\]/g)) {
      // ... 现有逻辑
    }
    
    // 新增：处理 ^![[]]
    for (const match of str.matchAll(/\^!\[\[([^\]]+)\]\]/g)) {
      if (match.index === undefined) continue;
      
      const link = match[1];
      // 验证是否为多行块引用
      if (!link.match(/#\^([a-z0-9]+)-\1$/)) continue;
      
      const info: FlowEditorInfo = {
        id: genId(),
        link: link,
        from: match.index + 3,  // 跳过 "^![["
        to: match.index + 3 + link.length,
        type: FlowEditorLinkType.MultilineReadOnly,
        height: -1,
        expandedState: FlowEditorState.Open  // 默认展开
      };
      
      newValues.push(info);
    }
    
    newValues.sort(compareByField("from", true));
    return newValues;
  }
});
```

### 2.3 扩展装饰器应用逻辑

```typescript
// src/basics/enactor/obsidian.tsx
const flowEditorRangeset = (state: EditorState, plugin: BlockLinkPlus) => {
  // ... 现有逻辑
  
  for (const info of infoFields) {
    const { from, to, type, expandedState } = info;
    
    // 新增：处理多行只读类型
    if (type === FlowEditorLinkType.MultilineReadOnly && 
        expandedState === FlowEditorState.Open) {
      
      // 避免与 Obsidian 原生渲染冲突
      const shouldSkip = checkSelectionConflict(state, from - 2, to + 2);
      
      if (!shouldSkip) {
        values.push({
          start: from - 2,
          end: to + 2,
          decoration: flowEditorWidgetDecoration(info, plugin)
        });
      }
    }
    
    // ... 处理其他类型
  }
};
```

### 2.4 扩展 FlowEditorWidget 渲染（复用 block 分支的外部图标机制）

```typescript
// src/basics/codemirror/flowEditor.tsx
class FlowEditorWidget extends WidgetType {
  private externalIconRoot: Root | null = null;
  private externalIconContainer: HTMLElement | null = null;
  
  toDOM(view: EditorView) {
    const div = document.createElement("div");
    div.classList.add("mk-floweditor-container");
    div.setAttribute("id", "mk-flow-" + this.info.id);
    
    // 根据类型添加不同的 CSS 类
    if (this.info.type === FlowEditorLinkType.MultilineReadOnly) {
      div.classList.add("mk-multiline-readonly");
    }
    
    // ... 现有逻辑
    
    // 传递正确的参数给 UINote
    const isReadOnly = this.info.type === FlowEditorLinkType.ReadOnlyEmbed;
    
    this.root.render(
      <UINote
        load={true}
        plugin={this.plugin}
        path={this.info.link}
        source={file.path}
        isReadOnly={isReadOnly}
        view={view}
        info={this.info}
      />
    );
    
    // 为多行只读块创建外部编辑图标（可选）
    if (this.info.type === FlowEditorLinkType.MultilineReadOnly && this.plugin.settings.showMultilineEditIcon) {
      setTimeout(() => {
        this.createExternalEditIcon(view, div);
      }, 0);
    }
    
    return div;
  }
  
  // 复用 block 分支的外部图标实现
  private createExternalEditIcon(view: EditorView, widgetDiv: HTMLElement) {
    const cmRoot = view.dom.closest('.cm-editor') as HTMLElement;
    if (!cmRoot) return;
    
    this.cleanupExternalIcon();
    
    // 创建外部图标容器
    this.externalIconContainer = document.createElement('div');
    this.externalIconContainer.className = 'mk-floweditor-selector mk-external-icon';
    this.externalIconContainer.style.position = 'absolute';
    this.externalIconContainer.style.zIndex = 'var(--layer-popover)';
    this.externalIconContainer.style.visibility = 'hidden';
    
    // 计算位置
    const updatePosition = () => {
      if (!this.externalIconContainer || !widgetDiv) return;
      
      const widgetRect = widgetDiv.getBoundingClientRect();
      const cmRect = cmRoot.getBoundingClientRect();
      
      const left = widgetRect.right - cmRect.left - 40;
      const top = widgetRect.top - cmRect.top - 34;
      
      this.externalIconContainer.style.left = left + 'px';
      this.externalIconContainer.style.top = top + 'px';
    };
    
    updatePosition();
    cmRoot.appendChild(this.externalIconContainer);
    
    // 创建编辑按钮
    this.externalIconRoot = createRoot(this.externalIconContainer);
    this.externalIconRoot.render(
      <FlowEditorHover
        app={this.plugin.app}
        plugin={this.plugin}
        toggle={true}
        path={this.info.link}
        source={file.path}
        toggleState={false}
        view={view}
        pos={{ from: this.info.from, to: this.info.to }}
        dom={widgetDiv}
      />
    );
    
    // 悬浮显示逻辑
    const showIcon = () => {
      if (this.externalIconContainer) {
        this.externalIconContainer.style.visibility = 'visible';
      }
    };
    
    const hideIcon = () => {
      if (this.externalIconContainer) {
        this.externalIconContainer.style.visibility = 'hidden';
      }
    };
    
    widgetDiv.addEventListener('mouseenter', showIcon);
    widgetDiv.addEventListener('mouseleave', hideIcon);
    this.externalIconContainer.addEventListener('mouseenter', showIcon);
    this.externalIconContainer.addEventListener('mouseleave', hideIcon);
    
    // 监听滚动和窗口变化
    const updatePositionThrottled = this.throttle(updatePosition, 16);
    window.addEventListener('scroll', updatePositionThrottled, true);
    window.addEventListener('resize', updatePositionThrottled);
  }
  
  destroy(dom: HTMLElement): void {
    this.cleanupExternalIcon();
    if (this.root) this.root.unmount();
  }
  
  private cleanupExternalIcon() {
    if (this.externalIconRoot) {
      this.externalIconRoot.unmount();
      this.externalIconRoot = null;
    }
    if (this.externalIconContainer) {
      this.externalIconContainer.remove();
      this.externalIconContainer = null;
    }
  }
}
```

### 2.5 扩展 Reading Mode 处理

```typescript
// src/basics/flow/markdownPost.tsx
export const replaceAllTables = (el: HTMLElement, ...) => {
  // 现有：处理 !![[]]
  const codeBlocks = el.querySelectorAll("p");
  
  // 新增：同时处理 ^![[]]
  const multilinePattern = /\^!\[\[([^\]]+)\]\]/g;
  
  codeBlocks.forEach((codeBlock) => {
    const html = codeBlock.innerHTML;
    
    // 检测 ^![[]]
    if (multilinePattern.test(html)) {
      codeBlock.innerHTML = html.replace(multilinePattern, (match, ref) => {
        // 验证是否为多行块
        if (!ref.match(/#\^([a-z0-9]+)-\1$/)) return match;
        
        // 创建占位符，后续处理
        return `<span class="mk-multiline-ref" data-ref="${ref}"></span>`;
      });
    }
    
    // ... 现有的 !![[]] 处理
  });
  
  // 处理所有多行块占位符
  el.querySelectorAll('.mk-multiline-ref').forEach(span => {
    const ref = span.getAttribute('data-ref');
    const container = span.parentElement;
    
    // 使用现有的渲染逻辑
    const reactEl = createRoot(container);
    reactEl.render(
      <UINote
        load={true}
        plugin={plugin}
        path={ref}
        source={ctx.sourcePath}
        isReadOnly={true}
        isMultilineOnly={true}
      />
    );
  });
};
```

### 2.6 扩展 UINote 组件（复用 block 分支实现）

```typescript
// src/basics/ui/UINote.tsx
// 复用 block 分支的完整实现逻辑
export const UINote = forwardRef((props: NoteViewProps, ref) => {
  const loadPath = async () => {
    const div = flowRef.current;
    if (!div) return;
    
    // 处理只读多行块（复用 block 分支逻辑）
    if (props.isReadOnly && isMultilineBlockRef(props.path)) {
      // 1. 检查是否已在 embed 容器中
      const isAlreadyInEmbed = div.closest('.markdown-embed') !== null;
      if (!isAlreadyInEmbed) {
        div.classList.add("internal-embed", "markdown-embed");
      }
      
      // 2. 创建内容容器
      const contentDiv = div.createDiv("markdown-embed-content");
      
      // 3. 创建链接图标（复用 block 分支实现）
      const linkIconContainer = contentDiv.createDiv("markdown-embed-link");
      linkIconContainer.setAttribute("aria-label", "Open link");
      linkIconContainer.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"></path><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"></path></svg>`;
      
      // 4. 添加跳转处理（复用 block 分支的完整逻辑）
      linkIconContainer.addEventListener("click", async (e) => {
        e.stopPropagation();
        e.preventDefault();
        
        const parts = props.path.split('#');
        const filePath = parts[0];
        const blockId = parts[1];
        
        // 检查同文件导航
        const currentLeaf = props.plugin.app.workspace.activeLeaf;
        const currentFile = currentLeaf?.view?.file;
        const isSameFileNavigation = currentFile && (
          currentFile.name.replace('.md', '') === filePath ||
          currentFile.path === filePath + '.md' ||
          currentFile.path === filePath ||
          (currentFile as any).basename === filePath
        );
        
        if (isSameFileNavigation) {
          // 同文件导航
          const editor = currentLeaf?.view?.editor;
          if (editor) {
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
              
              editor.focus();
              editor.setSelection(from, to);
              editor.scrollIntoView({ from, to }, true);
            }
          }
        } else {
          // 跨文件导航
          await props.plugin.app.workspace.openLinkText(
            props.path,
            props.source || "",
            false
          );
          
          // 延迟应用选择
          setTimeout(async () => {
            const activeLeaf = props.plugin.app.workspace.activeLeaf;
            const editor = activeLeaf?.view?.editor;
            
            if (editor) {
              const formattedRef = blockId.startsWith('#') ? blockId : `#${blockId}`;
              const lineRange = getLineRangeFromRef(
                filePath + ".md", 
                formattedRef, 
                props.plugin.app
              );
              
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
        }
      });
      
      // 5. 加载并渲染内容
      const file = props.plugin.app.metadataCache.getFirstLinkpathDest(
        filePath,
        props.source || ""
      );
      
      if (file) {
        const cache = props.plugin.app.metadataCache.getFileCache(file);
        const lineRange = getLineRangeFromRef(file.path, `#${blockId}`, props.plugin.app);
        
        if (lineRange[0] && lineRange[1]) {
          const content = await props.plugin.app.vault.read(file);
          const lines = content.split('\n');
          const blockContent = lines.slice(lineRange[0] - 1, lineRange[1]).join('\n');
          
          // 使用 MarkdownRenderer 渲染
          MarkdownRenderer.renderMarkdown(
            blockContent,
            contentDiv,
            file.path,
            null
          );
        }
      }
    }
  };
});
```

### 2.7 模式切换处理

```typescript
// src/features/flow-editor/index.ts
private handleModeSwitch(view: MarkdownView, switchType: string): void {
  // ... 现有逻辑
  
  // 扩展选择器以包含 ^![[]]
  const embeds = container.querySelectorAll(
    '.internal-embed.markdown-embed, .mk-multiline-ref'
  );
  
  embeds.forEach((embed) => {
    const src = embed.getAttribute('src') || embed.getAttribute('data-ref');
    
    // 检查是否为多行块（!![[]] 或 ^![[]]）
    const isEditableMultiline = src && /!!\[\[.*#\^([a-z0-9]+)-\1\]\]/.test(src);
    const isReadOnlyMultiline = src && /\^!\[\[.*#\^([a-z0-9]+)-\1\]\]/.test(src);
    
    if (isEditableMultiline || isReadOnlyMultiline) {
      // 使用现有的重新渲染逻辑
      // ... 
    }
  });
}
```

## 三、CSS 样式支持（复用 block 分支样式）

```css
/* src/css/Editor/Flow/FlowEditor.css */

/* 复用 block 分支的容器样式 */
.mk-multiline-block-container {
  position: relative;
}

.mk-multiline-block-container .markdown-embed-content {
  padding: 0.5rem;
}

/* 外部编辑图标样式（复用 block 分支） */
.mk-floweditor-selector.mk-external-icon {
  position: absolute;
  z-index: var(--layer-popover);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 4px;
  background: var(--background-primary);
  border: 1px solid var(--background-modifier-border);
  border-radius: 4px;
  cursor: pointer;
  opacity: 0.8;
  transition: opacity 0.2s;
}

.mk-floweditor-selector.mk-external-icon:hover {
  opacity: 1;
}

/* 确保内容只读（复用 block 分支 CSS 方案） */
.mk-multiline-block-container .cm-content {
  pointer-events: none !important;
  user-select: text !important;
  cursor: default !important;
}

/* 透明覆盖层（block 分支的成功经验） */
.mk-multiline-block-container .cm-content::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: transparent;
  z-index: 1000;
  pointer-events: auto;
}

/* 链接图标样式 */
.markdown-embed-link {
  position: absolute;
  top: 0.5rem;
  right: 0.5rem;
  opacity: 0.6;
  cursor: pointer;
  transition: opacity 0.2s;
}

.markdown-embed-link:hover {
  opacity: 1;
}
```

## 四、命令和用户交互

### 4.1 创建多行块命令

```typescript
// 扩展现有的命令
this.plugin.addCommand({
  id: 'create-multiline-block-reference',
  name: 'Create multiline block reference (read-only)',
  editorCallback: (editor: Editor) => {
    const selection = editor.getSelection();
    if (!selection) return;
    
    // 生成块 ID
    const blockId = generateBlockId();
    
    // 添加标记
    const from = editor.getCursor('from');
    const to = editor.getCursor('to');
    
    // 在第一行末尾添加开始标记
    const firstLine = editor.getLine(from.line);
    editor.setLine(from.line, `${firstLine} ^${blockId}`);
    
    // 在最后一行后添加结束标记
    editor.replaceRange(
      `\n^${blockId}-${blockId}`,
      { line: to.line + 1, ch: 0 }
    );
    
    // 生成引用
    const fileName = app.workspace.getActiveFile()?.basename || '';
    const reference = `^![[${fileName}#^${blockId}-${blockId}]]`;
    
    // 复制到剪贴板
    navigator.clipboard.writeText(reference);
    new Notice('Multiline block reference copied to clipboard!');
  }
});
```

### 4.2 右键菜单

```typescript
// 扩展 EditorMenu
this.plugin.registerEvent(
  this.app.workspace.on('editor-menu', (menu, editor, view) => {
    const selection = editor.getSelection();
    if (!selection || !selection.includes('\n')) return;
    
    menu.addItem((item) => {
      item
        .setTitle('Create read-only multiline block')
        .setIcon('bookmark')
        .onClick(() => {
          // 执行创建命令
        });
    });
  })
);
```

## 五、实施步骤

### Phase 1: 基础实现（3天）
1. 扩展 FlowEditorLinkType 枚举
2. 修改 flowEditorInfo 检测逻辑
3. 基础渲染测试

### Phase 2: 完整功能（3天）
1. 实现装饰器逻辑
2. 扩展 UINote 组件
3. Reading Mode 支持

### Phase 3: 用户体验（2天）
1. 添加命令和菜单
2. 样式优化
3. 错误处理

### Phase 4: 测试完善（2天）
1. 各种边界情况测试
2. 性能优化
3. 文档编写

## 六、复用 block 分支的工具函数

### 6.1 多行块 ID 检测
```typescript
// src/shared/utils/obsidian.ts
// 直接复用
function getMultilineBlockId(inputStr: string): string | null {
  const matchResult = inputStr.match(/^#?\^([a-z0-9]+)-\1$/);
  return matchResult ? `^${matchResult[1]}` : null;
}
```

### 6.2 行范围获取
```typescript
// 直接使用现有的 getLineRangeFromRef
// 已经支持多行块解析
const lineRange = getLineRangeFromRef(file.path, ref, app);
```

### 6.3 防重复渲染检查
```typescript
// 复用 block 分支的检查逻辑
if (dom.querySelector('.mk-flowspace-editor')) {
  return; // 已处理
}

const existingContainer = dom.querySelector('.mk-multiline-block-container');
if (existingContainer?.querySelector('.mk-floweditor')) {
  return; // 已有内容
}
```

## 七、关键优势

1. **最小化改动**：主要是扩展现有逻辑，而非重写
2. **统一的处理流程**：Live Preview 和 Reading Mode 保持一致
3. **复用成熟代码**：避免重复造轮子
4. **向后兼容**：不影响现有的 `!![[]]` 功能

## 七、注意事项

1. **避免选择冲突**：正确计算偏移量（`^![[` 是3个字符）
2. **保持只读**：确保多行块始终是只读的
3. **性能考虑**：大文档中多个多行块的渲染优化
4. **错误处理**：无效的多行块引用的友好提示

通过这种方式，我们可以优雅地将多行块功能集成到现有系统中，而不是创建一个独立的、复杂的新系统。