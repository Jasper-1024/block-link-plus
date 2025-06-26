# σ₄: Active Context
*v1.0 | Created: 2024-12-19 | Updated: 2024-12-20*
*Π: DEVELOPMENT | Ω: EXECUTE*

## �� Current Focus
当前焦点转移到**研究和解决 "内联编辑嵌入块" (Flow Editor) 功能相关的多个严重 bug**。我们已经完成了初步研究阶段，并对三个核心问题及一个新增问题有了明确的根本原因分析。

## 📎 Context References
- 📄 Active Files: 
  - `src/basics/flow/markdownPost.tsx` (问题2、3、4的根源)
  - `src/basics/enactor/obsidian.tsx` (问题1的根源)
  - `src/features/flow-editor/index.ts` (功能入口和协调器)
- 💻 Active Code: 
  - `replaceAllEmbed` (导致问题2、3的核心函数)
  - `flowEditorRangeset` (导致问题1的核心函数)
  - `FlowEditorHover` (很可能与问题4相关的React组件)
- 📚 Active Docs: `progress.md`, `projectbrief.md`
- 📁 Active Folders: `src/features/dataview-timeline`, `memory-bank`
- 🔄 Git References: N/A
- 📏 Active Rules: CursorRIPER♦Σ Lite 1.0.0

## 📡 Context Status
- 🟢 **Active**: 
  - "内联编辑嵌入块" (Flow Editor) 的 Bug 调查与修复
- 🟡 **Partially Relevant**: 
  - `blp-timeline` 功能的收尾工作 (已暂停)
- 🟣 **Essential**: 
  - **问题1**: `!![[...]]` 在源码模式下被错误渲染成 Widget。
  - **问题2**: 阅读模式下点击编辑图标导致 `posAtDOM` 崩溃。
  - **问题3**: `![[...]]` 的原生跳转图标被移除。
  - **问题4**: `![[笔记A#标题B]]` 形式的嵌入块在编辑时丢失了标题"标题B"。
- 🔴 **Deprecated**:
  - 当前的 `blp-timeline` 功能开发焦点。

## 🎯 Immediate Next Steps

### 短期目标
1. ➡️ **模式切换**: 进入 **INNOVATE** 模式。
2. ➡️ **设计解决方案**: 针对 **问题3 (图标被替换)**，构思具体的代码实现方案，包括 DOM 操作和 CSS 调整。
3. ➡️ **规划后续**: 讨论问题 1, 2, 4 的修复策略。

### 中期目标
1. 🔄 **执行修复**: 在 **EXECUTE** 模式下，依次实施对4个问题的修复方案。
2. 🔄 **代码审查**: 在 **REVIEW** 模式下，验证修复是否引入新问题，并确保代码质量。
3. 🔄 **回归测试**: 确保修复没有影响到 Flow Editor 的正常功能。

## 🚨 Critical Insights
- **核心缺陷**: 所有问题都源于插件未能正确区分和处理 Obsidian 的三种视图模式 (源码、实时预览、阅读)。
- **问题定位**: 已将每个问题的根本原因定位到具体的函数 (`replaceAllEmbed`, `flowEditorRangeset`) 和代码文件。
- **修复路径**: 解决方案需要围绕"模式感知"来设计，为不同模式提供不同的处理逻辑。