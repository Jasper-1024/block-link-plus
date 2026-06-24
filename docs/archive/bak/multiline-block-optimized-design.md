# 多行 Block 功能优化设计方案

## 一、功能需求分析

### 1.1 必须保留的核心功能
基于 block 分支的实现，以下功能是用户期望的：

1. **多行内容引用**：`![[file#^xyz-xyz]]` 能显示从 `^xyz` 到 `^xyz-xyz` 的多行内容
2. **编辑模式切换**：`!` 和 `!!` 的区别（只读 vs 可编辑）
3. **Live Preview 支持**：在编辑器中直接看到渲染效果
4. **Reading Mode 支持**：阅读模式下也能正确显示
5. **嵌套支持**：多行块内可以包含其他多行块
6. **交互功能**：跳转、编辑切换按钮等

### 1.2 block 分支的问题总结
从 `flow_editor_fixes_log.md` 可以看出主要问题：

1. **双重渲染**：Obsidian 原生渲染和插件渲染冲突
2. **事件处理复杂**：Widget 内部事件被 CodeMirror 拦截
3. **状态管理混乱**：多处状态不同步
4. **过度工程化**：解决方案本身成为新问题的来源

## 二、优化设计方案

### 2.1 核心设计原则

1. **分层架构**：清晰分离渲染层、数据层、交互层
2. **统一数据源**：所有状态集中管理，避免同步问题
3. **渐进增强**：先实现基础功能，再添加高级特性
4. **防御性编程**：预期 Obsidian 的行为变化

### 2.2 技术架构

```
┌─────────────────────────────────────┐
│          应用层 (Application)        │
│  - 命令注册                         │
│  - 设置管理                         │
│  - 插件生命周期                     │
└──────────────┬──────────────────────┘
               │
┌──────────────▼──────────────────────┐
│      核心管理器 (Core Manager)       │
│  - MultilineBlockManager (单例)      │
│  - 统一的数据存储                   │
│  - 事件分发                         │
└──────────────┬──────────────────────┘
               │
      ┌────────┴────────┬─────────────┐
      │                 │             │
┌─────▼─────┐    ┌─────▼─────┐ ┌────▼─────┐
│  渲染器   │    │  解析器   │ │ 交互处理  │
│           │    │           │ │          │
│ - Live    │    │ - 块检测  │ │ - 跳转   │
│ - Reading │    │ - 内容提取 │ │ - 编辑   │
└───────────┘    └───────────┘ └──────────┘
```

### 2.3 数据模型设计

```typescript
// 统一的数据模型
interface MultilineBlock {
  id: string;                    // 唯一标识符
  ref: string;                   // 引用格式 "file#^xyz-xyz"
  sourceFile: string;            // 源文件路径
  targetFile: string;            // 目标文件路径
  blockId: string;               // 块标识 "xyz-xyz"
  startMarker: string;           // 开始标记 "^xyz"
  endMarker: string;             // 结束标记 "^xyz-xyz"
  content?: string;              // 缓存的内容
  metadata: {
    isEditable: boolean;         // 是否可编辑 (!! vs !)
    isExpanded: boolean;         // 是否展开
    lastModified: number;        // 最后修改时间
    renderMode: 'live' | 'reading' | 'source';
  };
}

// 全局状态存储
class MultilineBlockStore {
  private blocks: Map<string, MultilineBlock> = new Map();
  private listeners: Map<string, Set<(block: MultilineBlock) => void>> = new Map();
  
  // 获取或创建块
  getOrCreate(ref: string, sourceFile: string): MultilineBlock { }
  
  // 更新块状态
  update(id: string, updates: Partial<MultilineBlock>): void { }
  
  // 订阅变化
  subscribe(id: string, callback: (block: MultilineBlock) => void): () => void { }
}
```

### 2.4 渲染策略

#### 2.4.1 Live Preview 渲染器

避免 block 分支的双重渲染问题：

```typescript
class LivePreviewRenderer {
  private processedRanges: WeakMap<EditorView, Set<string>> = new WeakMap();
  
  createExtension(): Extension {
    return ViewPlugin.fromClass(
      class {
        decorations: DecorationSet;
        
        constructor(view: EditorView) {
          this.decorations = this.buildDecorations(view);
        }
        
        update(update: ViewUpdate) {
          if (update.docChanged || update.viewportChanged) {
            this.decorations = this.buildDecorations(update.view);
          }
        }
        
        buildDecorations(view: EditorView): DecorationSet {
          const decorations: Range<Decoration>[] = [];
          
          // 关键：检测 Obsidian 是否已经渲染
          const processedRanges = this.getProcessedRanges(view);
          
          // 遍历文档查找多行块引用
          syntaxTree(view.state).iterate({
            enter(node) {
              if (isMultilineBlockRef(node, view.state)) {
                const range = `${node.from}-${node.to}`;
                
                // 避免双重渲染
                if (!processedRanges.has(range)) {
                  if (shouldRenderAsWidget(view.state, node)) {
                    decorations.push(...createWidget(node, view));
                    processedRanges.add(range);
                  }
                }
              }
            }
          });
          
          return Decoration.set(decorations);
        }
        
        getProcessedRanges(view: EditorView): Set<string> {
          // 检查已经被 Obsidian 原生渲染的范围
          const ranges = new Set<string>();
          view.dom.querySelectorAll('.internal-embed').forEach(embed => {
            const pos = view.posAtDOM(embed);
            if (pos !== null) {
              ranges.add(`${pos}-${pos + embed.textContent.length}`);
            }
          });
          return ranges;
        }
      },
      {
        decorations: v => v.decorations
      }
    );
  }
}
```

#### 2.4.2 Reading Mode 渲染器

保持简单，利用 Obsidian 的后处理机制：

```typescript
class ReadingModeRenderer {
  register(plugin: Plugin) {
    plugin.registerMarkdownPostProcessor((element, context) => {
      // 批量处理，提高性能
      const embeds = element.querySelectorAll('.internal-embed[src*="^"][src*="-"]');
      if (embeds.length === 0) return;
      
      embeds.forEach(embed => {
        this.processEmbed(embed as HTMLElement, context);
      });
    });
  }
  
  private processEmbed(embed: HTMLElement, context: MarkdownPostProcessorContext) {
    const src = embed.getAttribute('src');
    if (!src || !isMultilineBlockRef(src)) return;
    
    // 使用数据存储
    const block = store.getOrCreate(src, context.sourcePath);
    
    // 只在需要时加载内容
    if (!block.content) {
      this.loadContent(block).then(() => {
        this.renderContent(embed, block);
      });
    } else {
      this.renderContent(embed, block);
    }
  }
}
```

### 2.5 交互处理优化

#### 2.5.1 编辑按钮实现

学习 block 分支的教训，但简化实现：

```typescript
class EditButtonManager {
  addButton(container: HTMLElement, block: MultilineBlock) {
    // 利用已有的 DOM 结构
    const toolbar = container.querySelector('.markdown-embed-link') || 
                   container.createDiv('multiline-block-toolbar');
    
    // 创建按钮
    const button = toolbar.createEl('button', {
      cls: 'multiline-block-edit-btn',
      attr: { 'aria-label': 'Toggle edit mode' }
    });
    
    // 使用 Obsidian 的图标 API
    setIcon(button, block.metadata.isEditable ? 'eye' : 'pencil');
    
    // 简单的点击处理
    button.addEventListener('click', (e) => {
      e.stopPropagation();
      this.toggleEditMode(block);
    });
  }
  
  private toggleEditMode(block: MultilineBlock) {
    // 找到编辑器中的位置
    const view = app.workspace.getActiveViewOfType(MarkdownView);
    if (!view) return;
    
    const pos = this.findBlockPosition(view.editor, block.ref);
    if (pos) {
      // 简单的文本替换
      const newPrefix = block.metadata.isEditable ? '!' : '!!';
      view.editor.replaceRange(newPrefix, pos.from, pos.to);
    }
  }
}
```

#### 2.5.2 跳转功能

利用 Obsidian 的原生能力：

```typescript
class NavigationHandler {
  async navigateToBlock(block: MultilineBlock) {
    // 使用 Obsidian 的 API
    const file = app.metadataCache.getFirstLinkpathDest(block.targetFile, block.sourceFile);
    if (!file) return;
    
    // 打开文件
    const leaf = app.workspace.getLeaf(false);
    await leaf.openFile(file);
    
    // 获取编辑器
    const view = leaf.view as MarkdownView;
    if (view.editor) {
      // 使用已有的 getLineRangeFromRef
      const cache = app.metadataCache.getFileCache(file);
      const range = getLineRangeFromRef(file.path, `#${block.blockId}`, app);
      
      if (range[0] && range[1]) {
        // 选中多行
        view.editor.setSelection(
          { line: range[0] - 1, ch: 0 },
          { line: range[1] - 1, ch: view.editor.getLine(range[1] - 1).length }
        );
        
        // 滚动到视图
        view.editor.scrollIntoView({
          from: { line: range[0] - 1, ch: 0 },
          to: { line: range[1] - 1, ch: 0 }
        });
      }
    }
  }
}
```

### 2.6 避免已知陷阱的策略

1. **双重渲染问题**
   - 使用 WeakMap 跟踪已处理的范围
   - 检测 Obsidian 是否已经渲染
   - 只在必要时介入

2. **事件处理问题**
   - 不在 Widget 内部处理复杂事件
   - 使用原生 DOM 事件系统
   - 事件处理器保持简单

3. **状态同步问题**
   - 单一数据源（MultilineBlockStore）
   - 使用订阅模式而非轮询
   - 状态变化立即反映到 UI

4. **性能问题**
   - 使用防抖和节流
   - 懒加载内容
   - 缓存已处理的结果

## 三、实施计划

### Phase 1: 基础架构（第1周）
1. 实现 MultilineBlockStore
2. 实现基础的解析器
3. 设置项目结构

### Phase 2: Reading Mode（第2周）
1. 实现 ReadingModeRenderer
2. 处理内容加载
3. 基础样式

### Phase 3: Live Preview（第3周）
1. 实现 LivePreviewRenderer
2. 处理双重渲染问题
3. 集成 CodeMirror

### Phase 4: 交互功能（第4周）
1. 实现编辑切换
2. 实现跳转功能
3. 处理嵌套情况

### Phase 5: 优化和完善（第5周）
1. 性能优化
2. 错误处理
3. 测试和文档

## 四、关键技术决策

1. **使用 syntaxTree API**：比正则表达式更可靠
2. **WeakMap 缓存**：避免内存泄漏
3. **延迟加载**：提高初始性能
4. **防御性编程**：处理 Obsidian API 变化

## 五、测试策略

1. **单元测试**：解析器、数据存储
2. **集成测试**：与 Obsidian API 的交互
3. **性能测试**：大文档场景
4. **兼容性测试**：不同 Obsidian 版本

这个方案保留了 block 分支的功能完整性，但通过更好的架构设计避免了已知的陷阱。