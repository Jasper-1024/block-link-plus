# σ₄: Active Context
*v1.0 | Created: 2024-12-19 | Updated: 2024-12-20*
*Π: DEVELOPMENT | Ω: EXECUTE*

## �� Current Focus
当前焦点是**解决最后一个 "内联编辑嵌入块" (Flow Editor) 的 bug**：问题 1，即 `!![[...]]` 在源码模式下被错误渲染的问题。

## 📎 Context References
- 📄 Active Files: 
  - `src/basics/enactor/obsidian.tsx` (问题1的根源)
  - `src/basics/codemirror/flowEditor.tsx` (Widget 实现)
  - `src/features/flow-editor/index.ts` (Bug 2 修复位置)
  - `src/shared/utils/uri.ts` (Bug 3 修复位置)
- 💻 Active Code: 
  - `flowEditorRangeset` (导致问题1的核心函数)
  - `FlowEditorWidget` (被错误应用的 Widget)
- 📚 Active Docs: 
  - `progress.md`
  - `projectbrief.md`
  - `flow_editor_fixes_log.md` (新增的修复日志)
- 📁 Active Folders: `src/basics/enactor`, `src/basics/codemirror`, `memory-bank`
- 🔄 Git References: N/A
- 📏 Active Rules: CursorRIPER♦Σ Lite 1.0.0

## 📡 Context Status
- 🟢 **Active**: 
  - "内联编辑嵌入块" (Flow Editor) 的 Bug 调查与修复
- 🟡 **Partially Relevant**: 
  - `blp-timeline` 功能的收尾工作 (已暂停)
- 🟣 **Essential**: 
  - **问题1**: `!![[...]]` 在源码模式下被错误渲染成 Widget。
- 🔴 **Deprecated**:
  - 已解决的问题 2 (阅读模式崩溃), 3 (原生图标), 4 (嵌入标题)。
  - 已解决的 Bug (别名链接解析)。

## 🎯 Immediate Next Steps

### 短期目标
1. ➡️ **模式切换**: 进入 **INNOVATE** 或 **PLAN** 模式。
2. ➡️ **设计解决方案**: 针对 **问题1 (`!![[...]]` 在源码模式下渲染)**，构思具体的代码实现方案。
3. ➡️ **执行修复**: 实施对问题1的修复。

### 中期目标
1. 🔄 **代码审查**: 在 **REVIEW** 模式下，验证问题1的修复是否引入新问题。
2. 🔄 **回归测试**: 确保 Flow Editor 的所有功能（包括已修复的bug）正常工作。
3. 🔄 **恢复开发**: 在所有 bug 修复后，可以考虑恢复 `blp-timeline` 的工作。

## 🚨 Critical Insights
- **核心缺陷**: 问题1的根源在于 CodeMirror 6 扩展未能正确区分和处理 Obsidian 的"源码模式"和"实时预览模式"。
- **修复路径**: 解决方案需要围绕"模式感知"来设计，让 `flowEditorRangeset` 函数在应用 Widget 装饰前，先检查当前的编辑器模式。