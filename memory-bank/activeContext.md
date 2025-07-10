# σ₄: Active Context
*v1.0 | Created: 2024-12-19 | Updated: 2024-12-28*
*Π: DEVELOPMENT | Ω: EXECUTE*

## 🔮 Current Focus
🚧 **NEW: Multiline Block 功能重构**
- 用户需求：基于现有的 !![[]] 流程扩展实现 multiline block 功能
- **背景问题**：block 分支的 multiline block 实现设计太 lan，导致无限循环修改 bug
- **解决方案**：完全重构，基于 ^![[file#^xyz-xyz]] 语法，复用现有 !![[]] 流程
- **核心挑战**：Live Preview 和 Reading Mode 下的各种细节处理
- **实现策略**：一小步一验证，先用固定内容验证流程，最后才是真正的多行块渲染

## 📎 Context References
- 📄 Active Files: 
  - `doc/multiline-block-implementation-based-on-existing-flow.md` (完整重构设计方案)
  - `src/basics/codemirror/flowEditor.tsx` (需要扩展的核心文件)
  - `src/basics/enactor/obsidian.tsx` (装饰器应用逻辑)
  - `src/basics/ui/UINote.tsx` (UI 渲染组件)
  - `src/basics/flow/markdownPost.tsx` (Reading Mode 处理)
  - `memory-bank/activeContext.md` (当前更新)
- 💻 Active Code: 
  - `FlowEditorLinkType` 枚举 (需要扩展)
  - `flowEditorInfo` StateField (需要扩展检测逻辑)
  - `FlowEditorWidget` 渲染逻辑 (需要支持只读多行块)
  - `replaceAllTables` 函数 (需要扩展处理 ^![[]])
- 📚 Active Docs: 
  - Multiline Block 重构设计文档
  - 现有 3 种链接类型的实现机制分析
- 📁 Active Folders: 
  - `src/basics/` (核心实现目录)
  - `doc/` (设计文档目录)
- 🔄 Git References: 
  - feature-multline-block 分支
  - multiline block 重构实现
- 📏 Active Rules: CursorRIPER♦Σ Lite 1.0.0 Execute Mode

## 📡 Context Status
- 🟢 Active: Multiline Block 功能重构
- 🟡 Partially Relevant: 现有 !![[]] 和 ![[]] 链接类型实现
- 🟣 Essential: 一小步一验证的实现策略
- 🔴 Deprecated: block 分支的多行块实现

## 🎯 Multiline Block 重构需求分析

### 1. **问题背景**
- **现有实现**：项目支持 3 种链接类型
  - `!![[]]` - 完全独立的 embed edit block (已实现)
  - `![[]]` - Obsidian 原生渲染 + 插件编辑图标 (已实现)
  - `![[file#^xyz-xyz]]` - 多行 block (未实现，最复杂)
- **核心问题**：block 分支的 multiline block 设计太 lan，导致无限循环修改 bug
- **技术挑战**：Obsidian 会先将 `![[file#^xyz-xyz]]` 作为单行 block 渲染，需要排除干扰

### 2. **设计方案**
- **新语法**：使用 `^![[file#^xyz-xyz]]` 避免与 Obsidian 原生渲染冲突
- **复用策略**：基于成熟的 `!![[]]` 处理流程扩展
- **最小改动**：尽可能少地修改现有代码
- **统一处理**：Live Preview 和 Reading Mode 保持一致

### 3. **实现策略**
- **一小步一验证**：每个步骤都有明确的验证标准
- **先固定内容**：用固定文本验证流程，再实现真正的多行块渲染
- **渐进式功能**：按功能模块逐步实现（识别 → 渲染 → 跳转 → 编辑图标）
- **最后真实渲染**：所有基础功能验证完成后，才替换为真正的多行块内容

## 🛠️ 技术实现概览

### 类型系统扩展
```typescript
// src/types/index.ts
export enum FlowEditorLinkType {
  Link = 0,
  Embed = 1,              // !![[]] 嵌入
  EmbedClosed = 2,
  ReadOnlyEmbed = 3,      // 新增：^![[]] 多行只读
}
```

### 检测逻辑扩展
```typescript
// src/basics/codemirror/flowEditor.tsx
// 新增：处理 ^![[]]
for (const match of str.matchAll(/\^!\[\[([^\]]+)\]\]/g)) {
  // 验证是否为多行块引用
  if (!link.match(/#\^([a-z0-9]+)-\1$/)) continue;
  // 创建 FlowEditorInfo
}
```

### 渲染逻辑扩展
- **Live Preview**：扩展 `FlowEditorWidget` 渲染逻辑
- **Reading Mode**：扩展 `replaceAllTables` 处理 `^![[]]`
- **UI 组件**：扩展 `UINote` 支持只读多行块

## 📋 实施计划概览

### 🚀 10步渐进式实现计划
1. **基础检测** - 识别 `^![[]]` 语法，console.log 输出
2. **Live Preview 固定内容** - 用固定文本替换显示
3. **Reading Mode 固定内容** - 用固定文本替换显示
4. **模式切换测试** - Live ↔ Reading 切换验证
5. **Live Preview 跳转链接** - 添加跳转按钮
6. **Reading Mode 跳转链接** - 添加跳转按钮
7. **Live Preview 编辑图标** - 添加编辑图标，悬浮显示
8. **Reading Mode 编辑图标** - 添加编辑图标，悬浮显示
9. **完整模式切换** - 所有功能在模式切换时正确工作
10. **真正的多行块渲染** - 替换固定内容为实际多行块内容

### 🎯 关键优势
- **每步可验证**：避免陷入复杂的调试循环
- **渐进式开发**：先解决复杂的模式切换问题
- **风险控制**：用固定内容先验证流程
- **易于调试**：每步都有明确的验证标准

## 🔄 下一步行动
1. ✅ 完成需求分析和设计方案研究
2. ✅ 制定详细的实施计划
3. ✅ 更新 memory-bank 文档
4. 📋 创建详细的实施计划文档
5. 🚀 开始第一步：基础检测实现

## 📊 项目状态
- **当前阶段**：设计和规划完成，准备开始实施
- **技术准备**：已完成技术方案设计和实施策略
- **文档状态**：memory-bank 已更新，详细计划待记录
- **风险评估**：通过渐进式实现策略，风险已充分控制

## 📝 历史上下文
- **Timeline 功能**：✅ 已完成 (v1.5.3)
- **Flow Editor 功能**：✅ 已稳定
- **基础架构**：✅ 已完善
- **测试框架**：✅ 已建立

## 🎨 设计原则
- **复用而非重建**：基于成熟的 `!![[]]` 处理流程扩展
- **最小改动原则**：尽可能少地修改现有代码
- **统一处理流程**：Live Preview 和 Reading Mode 保持一致
- **一小步一验证**：每个步骤都有明确的验证标准