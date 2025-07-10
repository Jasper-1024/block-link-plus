# 多行 Block 功能架构设计方案

## 一、战略层面的认识

### 1.1 核心洞察
Block 分支的根本错误在于**试图与 Obsidian 的 embed 机制共存**，这导致了无穷无尽的冲突处理。

新方案的核心思想：**通过语法创新完全避开冲突**。

### 1.2 语法设计
```markdown
# 只读多行块
^![[file#^xyz-xyz]]

# 可编辑（单行或多行）
!![[file#^xyz-xyz]]
```

**关键优势**：
- `^![[` 不会被 Obsidian 识别为 embed
- 优雅降级：去掉 `^` 后仍是有效引用
- 语法一致：`!!` 始终表示可编辑

## 二、架构设计原则

### 2.1 简化原则
- **单一渲染管道**：不再区分 Live Preview / Reading Mode
- **无状态设计**：避免复杂的状态同步
- **预处理策略**：在 Obsidian 处理之前转换语法

### 2.2 技术架构
```
┌─────────────────────────────┐
│      Markdown 内容          │
│   ^![[file#^xyz-xyz]]      │
└──────────┬──────────────────┘
           │
           ▼ 预处理
┌─────────────────────────────┐
│    转换为内部标记           │
│  <mb-ref file="..." />     │
└──────────┬──────────────────┘
           │
           ▼ Obsidian 处理
┌─────────────────────────────┐
│   Obsidian 看不到 ![[       │
│   不会触发 embed 机制       │
└──────────┬──────────────────┘
           │
           ▼ 后处理
┌─────────────────────────────┐
│    统一渲染多行内容         │
└─────────────────────────────┘
```

## 三、实现策略

### 3.1 预处理器
```typescript
class MultilineBlockPreprocessor {
  process(markdown: string): string {
    // 转换 ^![[...]] 为内部标记
    return markdown.replace(
      /\^(!)?\[\[([^\]]+)\]\]/g,
      (match, bang, ref) => {
        const editable = !!bang;
        return `<mb-ref data-ref="${ref}" data-editable="${editable}"/>`;
      }
    );
  }
}
```

### 3.2 后处理器
```typescript
class MultilineBlockPostprocessor {
  process(el: HTMLElement, ctx: MarkdownPostProcessorContext) {
    // 处理所有 mb-ref 标记
    el.querySelectorAll('mb-ref').forEach(ref => {
      const blockRef = ref.getAttribute('data-ref');
      const isEditable = ref.getAttribute('data-editable') === 'true';
      
      // 统一渲染逻辑
      this.renderBlock(ref, blockRef, isEditable, ctx);
    });
  }
}
```

### 3.3 优化的多行块检测
```typescript
interface MultilineBlockRef {
  file: string;
  blockId: string;
  startMarker: string;  // ^xyz
  endMarker: string;    // ^xyz-xyz
}

function parseMultilineRef(ref: string): MultilineBlockRef | null {
  const match = ref.match(/^(.+)#\^([a-z0-9]+)-\1$/);
  if (!match) return null;
  
  return {
    file: match[1],
    blockId: match[2],
    startMarker: `^${match[2]}`,
    endMarker: `^${match[2]}-${match[2]}`
  };
}
```

## 四、关键技术决策

### 4.1 避免的陷阱（基于 Block 分支教训）

1. **不要创建多套渲染系统**
   - ❌ Live Preview 一套，Reading Mode 一套
   - ✅ 统一的预处理 + 后处理

2. **不要与 Obsidian embed 斗争**
   - ❌ 检测并阻止 Obsidian 渲染
   - ✅ 使用 `^![[` 让 Obsidian 根本看不到

3. **不要分散状态管理**
   - ❌ CodeMirror state + DOM 属性 + React state
   - ✅ 无状态设计，每次从源获取

4. **不要过度依赖 DOM 结构**
   - ❌ 6层链接恢复策略
   - ✅ 直接从源数据渲染

### 4.2 推荐的实践

1. **使用 Obsidian API**
   ```typescript
   // 使用官方的 resolveSubpath
   const resolved = resolveSubpath(cache, ref);
   
   // 使用官方的 MarkdownRenderer
   MarkdownRenderer.renderMarkdown(content, container, sourcePath, null);
   ```

2. **简单的事件处理**
   ```typescript
   // 不在复杂的 Widget 内部处理
   container.addEventListener('click', (e) => {
     if (e.target.matches('.edit-toggle')) {
       this.toggleEdit(blockRef);
     }
   });
   ```

3. **CSS 优先的样式方案**
   ```css
   /* 只读模式 - 学习 Block 分支的成功经验 */
   .mb-readonly .cm-content {
     pointer-events: none !important;
     user-select: text !important;
   }
   ```

## 五、实施计划

### Phase 1: 核心功能（1周）
1. 实现预处理器，转换 `^![[` 语法
2. 实现基础的多行内容提取
3. 实现后处理器渲染

### Phase 2: 编辑功能（1周）
1. 支持 `!![[` 的可编辑模式
2. 实现编辑/只读切换
3. 处理内容保存

### Phase 3: 用户体验（1周）
1. 创建多行块的命令
2. 右键菜单支持
3. 自动补全建议

### Phase 4: 优化完善（1周）
1. 性能优化（懒加载、缓存）
2. 错误处理和边界情况
3. 测试和文档

## 六、成功标准

### 6.1 技术指标
- 没有与 Obsidian embed 的冲突
- 单一的渲染管道
- 简洁的代码结构（< 1000 行核心代码）

### 6.2 用户体验
- 语法直观易记
- 创建和使用便捷
- 性能流畅

### 6.3 可维护性
- 清晰的架构
- 最少的外部依赖
- 易于调试和扩展

## 七、总结

这个方案的核心创新在于：

1. **语法层面解决冲突**：`^![[` 从根本上避免了与 Obsidian 的冲突
2. **架构简化**：单一渲染管道，无状态设计
3. **吸取教训**：避免 Block 分支的所有已知陷阱

通过这种方式，我们可以用更少的代码实现更稳定的功能，同时保持良好的用户体验和可维护性。