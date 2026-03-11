# Proposal: update-file-outliner-view-structural-history-v1

## Why
File Outliner 目前已经具备一套可用的结构编辑语义：`Enter` split、
多行 paste split、`Tab` / `Shift+Tab`、边界 merge、drag/drop move 都能工作。
但用户可感知的历史模型仍然断裂：

- 单个 block 内的普通文本输入主要依赖 CodeMirror 自带 history；
- 一旦进入结构编辑，`Ctrl/Cmd+Z` / `Ctrl+Y` 基本无法回到用户刚刚做过的动作；
- 这让 File Outliner 在最常见的高频操作上，不像一个统一的编辑器。

前置的正确性问题已经通过 `9222` 定位并以小补丁修复：
结构编辑后焦点切换时，旧 editor 的 stale text 不应再覆盖新的结构结果。
因此 V1 现在可以聚焦于真正的最小闭环：
让最常见的结构编辑第一次进入同一条用户可见的 undo/redo 链。

## What Changes
- 为 File Outliner 增加一条 view-local 的结构 history，仅覆盖 V1 的高频结构编辑：
  - `Enter` split 当前 block
  - 多行 `Ctrl/Cmd+V` 产生多个 block
  - `Tab` / `Shift+Tab` 缩进与反缩进
  - `Backspace` 在块首 merge previous
  - `Delete` 在块尾 merge next
  - drag/drop block move
- 为编辑态与非编辑态分别增加结构 history 路由：
  - 编辑态先尝试 CodeMirror 原生文本 undo/redo；只有当当前编辑器没有可消费的文本 history 时，才回退到结构 history
  - 非编辑态（例如 drag/drop 之后）通过 outliner root 触发结构 undo/redo
- 保持文本输入仍由 CodeMirror 自己负责；V1 不引入全局统一 journal/diff 架构。

## Non-Goals
- 不统一 block-range 的键盘 `copy/cut/delete/paste`
- 不处理 `Ctrl/Cmd+A`、`Shift+ArrowUp/Down` 的作用域提升
- 不把 collapse / zoom / 其他视图状态纳入 history
- 不重做整个编辑架构，也不把所有文本 transaction 收编进同一个 history 引擎
- 不在这个 change 里处理版本号提升、发布或 push

## Impact
- Affected capability: `file-outliner-view`
- Affected code:
  - `src/features/file-outliner-view/view.ts`
  - `src/features/file-outliner-view/editor-state.ts`
  - `src/features/file-outliner-view/__tests__/*`
- Verification:
  - Jest 定向回归测试
  - `build-with-types`
  - `9222` / CDP 场景回归（split / paste / indent / merge / drag-drop / text fallback）
