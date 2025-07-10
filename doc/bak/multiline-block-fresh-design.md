# 多行 Block 功能全新设计方案

## 一、设计哲学

### 1.1 核心原则
- **简单优先**：选择最简单的技术方案，而不是最"聪明"的
- **原生优先**：尽可能利用 Obsidian 的原生能力，而不是对抗它
- **分离关注**：渲染和交互完全分离，避免复杂的状态管理
- **最小干预**：对 Obsidian 的默认行为做最小的修改

### 1.2 批判性反思
从 block 分支的经验来看，许多问题源于过度工程化：
- 试图在 CodeMirror Widget 内部处理所有逻辑
- 过于复杂的状态同步机制
- 对抗 Obsidian 的原生渲染而不是利用它
- 解决方案引入了新的复杂性

## 二、技术架构重新设计

### 2.1 核心洞察

**关键认识**：Obsidian 已经能够渲染 `![[file#^blockid]]`，只是它期望的是单行 block。

**新思路**：与其对抗这个机制，不如利用它：
1. 让 Obsidian 继续按它的方式渲染
2. 在渲染完成后，检测并增强多行 block 的显示
3. 保持原生的交互能力（跳转、预览等）

### 2.2 简化的架构

```
┌─────────────────────────────────────────┐
│         用户输入 ![[file#^xyz-xyz]]     │
└────────────────┬───────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────┐
│     Obsidian 原生渲染（单行显示）       │
└────────────────┬───────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────┐
│   检测多行 block 标识并增强显示         │
│   - 不改变 DOM 结构                     │
│   - 只添加额外的内容展示               │
└─────────────────────────────────────────┘
```

### 2.3 技术方案对比

| 方案 | block 分支做法 | 新设计做法 |
|------|---------------|-----------|
| 渲染方式 | 完全自定义渲染，替换原生 | 保留原生渲染，只做增强 |
| 事件处理 | Widget 内部处理所有事件 | 利用原生事件系统 |
| 只读实现 | CSS + DOM 操作 + StateEffect | 使用 MarkdownRenderer.renderMarkdown |
| 图标位置 | 外部容器 + 复杂定位 | 利用原生的 `.markdown-embed-link` |
| 状态管理 | 多处状态同步 | 无状态设计 |

## 三、实现策略

### 3.1 Phase 1: 最小可行产品（MVP）

#### 目标
实现基本的多行 block 显示，不追求完美，只追求可用。

#### 实现步骤

1. **创建简单的后处理器**
```typescript
// 只在 Reading Mode 下工作
this.registerMarkdownPostProcessor((element, context) => {
  const embeds = element.querySelectorAll('.internal-embed');
  embeds.forEach(embed => {
    const src = embed.getAttribute('src');
    if (src && isMultilineBlockRef(src)) {
      enhanceMultilineBlock(embed, src, context);
    }
  });
});
```

2. **利用 Obsidian 的 API**
```typescript
async function enhanceMultilineBlock(embed: HTMLElement, ref: string, context: MarkdownPostProcessorContext) {
  // 解析引用
  const [filePath, blockId] = parseRef(ref);
  
  // 使用 Obsidian API 获取内容
  const file = this.app.metadataCache.getFirstLinkpathDest(filePath, context.sourcePath);
  if (!file) return;
  
  const cache = this.app.metadataCache.getFileCache(file);
  const content = await this.app.vault.read(file);
  
  // 获取多行内容
  const lines = getMultilineBlockContent(content, blockId);
  
  // 使用 Obsidian 的 Markdown 渲染器
  const container = embed.querySelector('.markdown-embed-content');
  if (container) {
    MarkdownRenderer.renderMarkdown(
      lines.join('\n'),
      container,
      file.path,
      null
    );
  }
}
```

3. **简单的标识符解析**
```typescript
function isMultilineBlockRef(ref: string): boolean {
  return /#\^([a-z0-9]+)-\1$/.test(ref);
}

function getMultilineBlockContent(content: string, blockId: string): string[] {
  const lines = content.split('\n');
  const id = blockId.replace(/^\^/, '').split('-')[0];
  
  let startIdx = -1;
  let endIdx = -1;
  
  // 查找起始和结束标记
  for (let i = 0; i < lines.length; i++) {
    if (lines[i].includes(`^${id}`) && startIdx === -1) {
      startIdx = i;
    } else if (lines[i].includes(`^${id}-${id}`)) {
      endIdx = i;
      break;
    }
  }
  
  if (startIdx !== -1 && endIdx !== -1) {
    return lines.slice(startIdx, endIdx);
  }
  
  return [];
}
```

### 3.2 Phase 2: Live Preview 支持

#### 关键洞察
不要试图阻止 Obsidian 的原生渲染，而是在它完成后进行增强。

#### 实现策略
```typescript
// 使用 EditorView 的 ViewUpdate
const multilineBlockPlugin = ViewPlugin.fromClass(
  class {
    constructor(view: EditorView) {
      this.processView(view);
    }
    
    update(update: ViewUpdate) {
      if (update.docChanged || update.viewportChanged) {
        this.processView(update.view);
      }
    }
    
    processView(view: EditorView) {
      // 查找所有已渲染的嵌入
      const embeds = view.dom.querySelectorAll('.internal-embed');
      embeds.forEach(embed => {
        if (!embed.dataset.enhanced && isMultilineBlock(embed)) {
          enhanceEmbed(embed);
          embed.dataset.enhanced = 'true';
        }
      });
    }
  }
);
```

### 3.3 Phase 3: 交互功能

#### 编辑切换
利用现有的 DOM 结构，不创建新的复杂机制：

```typescript
function addEditToggle(embed: HTMLElement) {
  const toolbar = embed.querySelector('.markdown-embed-link');
  if (!toolbar) return;
  
  const editBtn = toolbar.createEl('span', {
    cls: 'multiline-block-edit',
    text: '✏️'
  });
  
  editBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    // 简单地修改引用：! -> !!
    const view = this.app.workspace.getActiveViewOfType(MarkdownView);
    if (view && view.editor) {
      const pos = findEmbedPosition(view.editor, embed);
      if (pos) {
        view.editor.replaceRange('!!', pos);
      }
    }
  });
}
```

## 四、避免的陷阱

### 4.1 不要做的事
1. **不要**试图完全控制渲染过程
2. **不要**在 Widget 内部处理复杂的事件
3. **不要**创建复杂的状态同步机制
4. **不要**对抗 Obsidian 的默认行为
5. **不要**过早优化性能

### 4.2 要做的事
1. **要**利用 Obsidian 的原生 API
2. **要**保持代码简单直接
3. **要**优先实现核心功能
4. **要**充分测试边界情况
5. **要**接受不完美的解决方案

## 五、实施计划

### Week 1: MVP
- [ ] 实现 Reading Mode 的基本多行显示
- [ ] 使用 MarkdownRenderer API
- [ ] 测试基本功能

### Week 2: Live Preview
- [ ] 添加 ViewPlugin 支持
- [ ] 处理动态更新
- [ ] 保持与 Reading Mode 一致

### Week 3: 交互增强
- [ ] 添加编辑切换按钮
- [ ] 实现跳转功能增强
- [ ] 处理嵌套情况

### Week 4: 完善和优化
- [ ] 处理边界情况
- [ ] 性能优化（如果需要）
- [ ] 文档和测试

## 六、成功标准

### 6.1 必须达到
- 能够显示多行 block 内容
- Live Preview 和 Reading Mode 行为一致
- 保留原生的跳转功能
- 不破坏现有功能

### 6.2 最好达到
- 流畅的编辑切换
- 良好的性能
- 优雅的错误处理

### 6.3 可以妥协
- 完美的视觉效果
- 所有边界情况的处理
- 复杂的交互功能

## 七、技术决策原则

1. **当有疑问时，选择更简单的方案**
2. **当有冲突时，遵循 Obsidian 的方式**
3. **当需要优化时，先确保功能正确**
4. **当遇到 bug 时，考虑是否设计过于复杂**

## 八、总结

这个新设计的核心理念是：**不要试图重新发明轮子**。

Obsidian 已经有了良好的嵌入块渲染机制，我们要做的只是：
1. 检测多行 block
2. 获取完整内容
3. 让 Obsidian 渲染它
4. 添加必要的交互

通过这种方式，我们可以避免 block 分支遇到的大部分问题，因为我们不再试图控制整个渲染流程，而是作为 Obsidian 系统的一个和谐部分。

记住：**最好的代码是没有代码，次好的代码是简单的代码。**