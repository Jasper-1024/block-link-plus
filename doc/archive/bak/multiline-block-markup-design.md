# 多行 Block 标记设计探讨

## 一、问题本质

### 1.1 核心矛盾
- **需求**：标记和引用多行内容
- **限制**：`![[` 会触发 Obsidian 的 embed 机制，导致冲突
- **约束**：`!![[` 已经被定义为可编辑 block

### 1.2 设计目标
1. 避免与 Obsidian 原生 embed 冲突
2. 语法简洁直观
3. 支持只读和可编辑两种模式
4. 便于创建和维护

## 二、现有方案分析

### 2.1 Block 分支方案：`^xyz-xyz`
```markdown
这是第一行 ^abc
这是第二行
这是第三行
^abc-abc

引用：![[file#^abc-abc]]
```

**优点**：
- 利用了 Obsidian 已有的 `^blockid` 语法
- 相对直观（开始和结束标记）

**缺点**：
- 需要手动添加两个标记
- ID 管理麻烦（需要确保唯一性）
- 结束标记占用额外一行
- 引用时仍然会触发 Obsidian 的 embed 机制

## 三、替代标记方案探讨

### 3.1 方案一：注释标记
利用 Markdown 注释，对 Obsidian 透明：

```markdown
<!-- block:start:myblock -->
这是多行内容
可以包含任何东西
包括代码和列表
<!-- block:end:myblock -->

引用：{{block:myblock}} 或 [[block:myblock]]
```

**优点**：
- 对 Obsidian 完全透明
- 不会触发 embed 机制
- 可以自定义引用语法

**缺点**：
- 注释在预览时不可见，不够直观
- 需要新的引用语法

### 3.2 方案二：代码块扩展
利用代码块的 metadata：

```markdown
```text {#myblock}
这是多行内容
可以包含任何东西
```

或者：

:::block myblock
这是多行内容
可以包含任何东西
:::

引用：{{myblock}} 或 @block[myblock]
```

**优点**：
- 利用已有的代码块语法
- 在预览时有明确的视觉边界
- 可以添加额外的 metadata（如标题、描述）

**缺点**：
- 改变了内容的语义（变成代码块）
- 可能影响其他插件

### 3.3 方案三：自定义块语法
完全自定义的语法：

```markdown
@[start:myblock]
这是多行内容
可以包含任何东西
@[end:myblock]

或者更简洁的：

{#myblock
这是多行内容
可以包含任何东西
#}

引用：@[myblock] 或 {>myblock}
```

**优点**：
- 完全控制语法
- 不与任何现有语法冲突
- 可以设计得很简洁

**缺点**：
- 用户需要学习新语法
- 可能与未来的 Markdown 扩展冲突

### 3.4 方案四：缩进标记
利用特殊的缩进或前缀：

```markdown
> [myblock]
> 这是第一行
> 这是第二行
> 这是第三行

或者：

    #myblock
    这是第一行
    这是第二行
    这是第三行
    #end

引用：>[myblock] 或 #[myblock]
```

**优点**：
- 视觉上容易识别
- 利用了 Markdown 的引用语法

**缺点**：
- 改变了内容的展示方式
- 可能与其他用途的引用块冲突

## 四、推荐方案：混合标记系统

### 4.1 核心设计
结合 Obsidian 的习惯和新的标记方式：

```markdown
# 1. 对于需要在源文件中明确标记的：
%% block:start:myblock %%
这是多行内容
可以包含任何东西
%% block:end:myblock %%

# 2. 对于临时选择的内容：
使用行号范围或标题范围

# 3. 引用语法（避免 ![[）：
@[[file#block:myblock]]     -- 引用命名块
@[[file#L10-L20]]           -- 引用行范围  
@[[file#heading|next]]      -- 引用标题范围

# 4. 可编辑版本（对应 !![[）：
@@[[file#block:myblock]]    -- 可编辑命名块
```

### 4.2 实现策略

1. **渐进增强**：
   - 第一步：支持 `%% block %% ` 标记
   - 第二步：支持行号引用
   - 第三步：支持智能范围选择

2. **向后兼容**：
   - 保留对 `^xyz-xyz` 的支持
   - 允许 `![[` 语法作为备选

3. **用户体验**：
   - 提供命令快速创建块标记
   - 右键菜单支持
   - 自动完成建议

### 4.3 优势分析

1. **避免冲突**：`@[[` 不会触发 Obsidian 的 embed
2. **灵活性**：支持多种标记和引用方式
3. **可发现性**：`%%` 注释在编辑时可见
4. **扩展性**：可以添加更多元数据

## 五、实现考虑

### 5.1 解析优先级
```typescript
function parseReference(ref: string): ReferenceType {
  // 1. 检查命名块
  if (ref.includes('#block:')) {
    return { type: 'named-block', id: extractBlockId(ref) };
  }
  
  // 2. 检查行号范围
  if (ref.match(/#L\d+(-L?\d+)?/)) {
    return { type: 'line-range', ...parseLineRange(ref) };
  }
  
  // 3. 检查标题范围
  if (ref.includes('|')) {
    return { type: 'heading-range', ...parseHeadingRange(ref) };
  }
  
  // 4. 回退到传统 blockId
  if (ref.match(/#\^[a-z0-9]+-[a-z0-9]+/)) {
    return { type: 'legacy-block', id: extractLegacyId(ref) };
  }
}
```

### 5.2 渲染策略
```typescript
// 注册自定义标记处理器
registerMarkdownPostProcessor((el, ctx) => {
  // 处理 @[[ 语法
  el.innerHTML = el.innerHTML.replace(
    /@(@?)\[\[([^\]]+)\]\]/g,
    (match, editable, ref) => {
      const isEditable = editable === '@';
      return renderBlockReference(ref, isEditable, ctx);
    }
  );
});
```

## 六、总结

理想的多行 block 标记设计应该：

1. **独立于 `![[`**：避免与 Obsidian embed 机制冲突
2. **支持多种方式**：命名块、行范围、智能选择
3. **渐进实现**：从简单到复杂
4. **用户友好**：易于创建和使用

推荐使用 `@[[` 作为新的引用语法，配合 `%% block %%` 作为标记语法，这样可以完全避免与 Obsidian 原生功能的冲突，同时提供更好的扩展性。