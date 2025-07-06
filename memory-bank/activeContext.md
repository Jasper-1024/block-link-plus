# σ₄: Active Context
*v1.0 | Created: 2024-12-19 | Updated: 2024-12-28*
*Π: DEVELOPMENT | Ω: EXECUTE*

## 🔮 Current Focus
🔧 **NEW: 多行块渲染混乱问题调试**
- 用户需求：实现 `![[file#^xyz-xyz]]` 格式的只读多行块渲染
- **问题现象**：出现双重渲染，CodeMirror 装饰器和 Markdown 后处理器冲突
- **根本原因**：两个渲染系统同时处理相同内容，设计上存在冲突
- **状态**：已定位问题根源，待实施解决方案

## 📎 Context References
- 📄 Active Files: 
  - `src/basics/codemirror/flowEditor.tsx` (多行块 CodeMirror 装饰器)
  - `src/basics/ui/UINote.tsx` (只读嵌入渲染组件)
  - `src/basics/flow/markdownPost.tsx` (Markdown 后处理器)
  - `src/features/flow-editor/index.ts` (Flow Editor 管理器)
  - `doc/flow_editor_fixes_log.md` (问题记录文档)
- 💻 Active Code: 
  - `FlowEditorWidget` 类 (处理只读嵌入渲染)
  - `replaceMultilineBlocks` 函数 (导致冲突的后处理器)
  - `flowEditorInfo` StateField (检测多行块引用)
- 📚 Active Docs: Flow Editor 修复日志
- 📁 Active Folders: `src/basics/`, `src/features/flow-editor/`
- 🔄 Git References: 多行块渲染实现
- 📏 Active Rules: CursorRIPER♦Σ Lite 1.0.0 Execute Mode

## 📡 Context Status
- 🟢 Active: 多行块渲染问题调试
- 🟡 Partially Relevant: CSS 样式调整
- 🟣 Essential: 保持与现有 `!![[` 功能的兼容性
- 🔴 Deprecated: `replaceMultilineBlocks` 函数（可能需要移除）

## 🎯 多行块渲染问题分析

### 1. **问题现象**
- **双重渲染**：同时出现两个不同的多行块渲染
- **光标相关性**：一个渲染与光标位置有关，另一个无关
- **阅读模式异常**：首次显示多行块，重新打开后变成单行块

### 2. **根本原因**
- **系统冲突**：
  - CodeMirror 装饰器系统（实时渲染）
  - Markdown 后处理器系统（DOM 处理）
  - 两者同时工作导致冲突

- **设计差异**：
  - `!![[` 只由 CodeMirror 处理，无原生支持
  - `![[` 有 Obsidian 原生支持，导致三重处理

### 3. **技术发现**
- **多行块格式**：`#^xyz-xyz`（xyz 为相同的字母数字）
- **正则表达式**：`/#\^([a-z0-9]+)-\1$/`
- **Obsidian 限制**：原生不完全支持此格式

### 4. **解决方案方向**
- 移除冲突的后处理器
- 统一渲染策略
- 区分编辑模式和阅读模式的处理

## 🔧 重要共识和发现

### 装饰器系统限制
- `ReadOnlyEmbed` 类型不能使用独立的 `flowEditorSelector` 装饰器
- 必须在 `FlowEditorWidget` 内部处理所有渲染逻辑
- 这与 `Embed` 类型的双装饰器模式不同

### CSS 定位问题
- `mk-floweditor-selector` 的 `top: -34px` 是为 `!![[` 设计的
- 在只读嵌入中需要不同的定位策略
- 通过添加专门的 CSS 规则解决了定位问题

### 参数传递要求
- `UINote` 组件需要 `view` 和 `info` 参数来渲染编辑图标
- 这些参数是 `FlowEditorHover` 组件正常工作的必要条件

## 🔧 技术实现细节

### 多行块检测正则
```typescript
const multiLineBlockRegex = /#\^([a-z0-9]+)-\1$/;
// 使用负向前瞻避免匹配 !![[
for (const match of str.matchAll(/(?<!!)!\[\[([^\]]+)\]\]/g)) {
  if (multiLineBlockRegex.test(link)) {
    // 处理多行块
  }
}
```

### CSS 修复方案
```css
/* 专门为只读嵌入定位 */
.internal-embed.markdown-embed {
  position: relative;
}

.internal-embed.markdown-embed .mk-floweditor-selector {
  position: absolute;
  right: 8px;
  top: 8px;
}
```

## 📝 下一步行动
1. 🔍 决定是否移除 `replaceMultilineBlocks` 函数
2. 📋 改进渲染策略，避免系统冲突
3. 🔧 测试不同模式下的渲染行为
4. 📚 更新文档记录解决方案

## 📊 开发进度
- **问题定位**：✅ 完成
- **原因分析**：✅ 完成  
- **解决方案设计**：🔄 进行中
- **实施修复**：⏳ 待开始
- **测试验证**：⏳ 待开始