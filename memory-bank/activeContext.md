# σ₄: Active Context
*v1.0 | Created: 2024-01-01 | Updated: 2024-01-01*
*Π: DEVELOPMENT | Ω: EXECUTE*

## 🔮 Current Focus
**多行块编辑图标缺失问题 - 已解决**

### 问题描述
- 多行块 `![[file#^xyz-xyz]]` 在 Live Preview 模式下缺少右上角编辑图标
- 单行块 `![[file#^xyz]]` 有编辑图标，多行块没有

### 解决方案
- 修改 `replaceMultilineBlocks` 函数，添加 `showEditIcon` 参数
- Live Preview 模式：创建 `blp-embed-toolbar` 和编辑图标
- Read Mode 模式：不创建编辑图标
- 使用 `FlowEditorHover` 组件实现编辑功能

### 关键文件修改
- `src/basics/flow/markdownPost.tsx` - 添加编辑图标逻辑
- `src/features/flow-editor/index.ts` - 区分模式调用

## 📎 Context References
- 📄 Active Files: 
  - `src/basics/flow/markdownPost.tsx`
  - `src/features/flow-editor/index.ts`
  - `src/basics/flow/FlowEditorHover.tsx`
- 💻 Active Code: 
  - `replaceMultilineBlocks` 函数
  - `FlowEditorHover` 组件
- 📚 Active Docs: 
  - `doc/flow_editor_fixes_log.md`
- 📁 Active Folders: 
  - `src/basics/flow/`
  - `src/features/flow-editor/`
- 🔄 Git References: 
  - 多行块编辑图标修复分支
- 📏 Active Rules: 
  - Live Preview vs Read Mode 区分
  - 编辑图标仅在 Live Preview 显示

## 📡 Context Status
- 🟢 Active: 
  - 多行块编辑图标修复
  - Live Preview 模式检测
- 🟡 Partially Relevant: 
  - CodeMirror 装饰器系统
  - MarkdownPostProcessor 系统
- 🟣 Essential: 
  - `FlowEditorHover` 组件
  - `blp-embed-toolbar` 容器
- 🔴 Deprecated: 
  - 之前的 CodeMirror 装饰器方案（对多行块无效）

## 🎯 Next Steps
1. 测试修复效果
2. 清理调试日志
3. 更新文档
4. 进行回归测试