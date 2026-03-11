## Goal
在不重做 File Outliner 编辑架构的前提下，提供一条最小、稳定、用户可感知的结构 undo/redo 链，
覆盖 V1 的六类高频结构编辑。

## Scope
V1 只覆盖这些结构操作：
- `Enter` split
- 多行 `Ctrl/Cmd+V` split
- `Tab` / `Shift+Tab`
- `Backspace` at block start
- `Delete` at block end
- drag/drop move

不覆盖：
- 普通文本输入与删除
- block-range 键盘编辑语义
- `Ctrl/Cmd+A` / `Shift+Arrow` 作用域提升
- collapse / zoom / 其他视图状态 history

## Approach
### 1. 在 view 层维护结构快照 history
使用 view-local 的 undo / redo 栈，记录结构编辑前后的快照。
每个 entry 至少包含：
- `beforeFile`
- `beforeSelection`
- `afterFile`
- `afterSelection`

这里的 `selection` 指 Outliner 自己的 block-level 选择锚点，
用于 replay 后恢复焦点与光标位置。

### 2. 只在“结构编辑提交边界”记录 history
不把 `applyEngineResult()` 本身改成“所有调用都自动进 history”，
而是在明确属于 V1 范围的结构操作入口上，统一调用一个薄封装：
- 先捕获 `before` 快照
- 再应用 engine result
- 成功后推入 undo 栈并清空 redo 栈

这样可以保持实现边界清晰，避免把普通文本同步、视图重绘或未来非 V1 的结构变化一起卷进来。

### 3. 键盘路由先保留文本 history，再回退结构 history
编辑态：
- `Mod+Z` 先尝试 CodeMirror 原生文本 undo；若当前编辑器没有可消费的文本 history，再回退到结构 undo
- `Mod+Y` / `Mod+Shift+Z` 先尝试 CodeMirror 原生文本 redo；若当前编辑器没有可消费的文本 redo，再回退到结构 redo

非编辑态：
- 在 outliner root capture `keydown` 上处理 `Mod+Z` / `Mod+Y` / `Mod+Shift+Z`
- 主要用于 drag/drop 之后编辑器不一定处于激活状态的情况

### 4. replay 只恢复文件与焦点，不恢复完整 UI 临时态
undo/redo replay 时恢复：
- `outlinerFile`
- index / render
- 焦点 block 与 cursor selection

不恢复：
- collapse / zoom 栈
- block-range 临时选区
- suggest 打开状态
- 鼠标拖拽过程态

这不是完美模型，但足够覆盖 V1 最常见、最直接的工作流。

## Rationale
- 现有结构编辑已经统一经过 pure engine 结果 + view 应用边界，适合做快照式 history。
- 直接存快照比 diff/journal 更简单、更稳，也更容易借助 `9222` 做可视化回归。
- 文本 history 继续交给 CodeMirror，可显著降低与 IME / selection / suggest 的耦合风险。

## Risks
- 如果 root capture 过早截获快捷键，可能吞掉正常文本 undo/redo；因此 root 路由必须只在非编辑态下启用。
- 如果结构快照边界选错，可能把非结构变化错误纳入 history；因此 V1 只接入白名单操作入口。
- drag/drop 回放时的焦点行为可能与编辑态不同，需要额外依赖 `9222` 验证。