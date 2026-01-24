## ADDED Requirements

### Requirement: Enable scoped outliner-like operations for enhanced list blocks
插件 SHALL 在显式启用增强的文件内，为增强 list blocks 提供类似 outliner 的操作能力（仅当前文件内），并提供设置开关用于启用/禁用各项功能。

#### Scenario: Ops are scoped to enabled files
- **WHEN** 当前文件未启用增强（不在设置的文件夹/文件范围内且无 `blp_enhanced_list: true`）
- **THEN** 插件不启用任何 outliner/zoom UI 与操作（命令执行为 no-op 或提示）

### Requirement: Zoom in/out to current list subtree
插件 SHALL 支持对当前 list item 子树进行 zoom（隐藏其他内容，仅展示该子树范围），并支持 zoom out 恢复全文显示。

#### Scenario: Zoom only shows current subtree
- **WHEN** 光标位于某个 list item 内并执行 zoom-in
- **THEN** 编辑器仅显示该 list item 及其子树内容

### Requirement: Subtree movement and indentation
插件 SHALL 支持对当前 list item 子树进行移动与缩进操作：
- Move subtree up/down
- Indent/outdent subtree（可通过设置开关启用/禁用）

#### Scenario: Indent/outdent is toggleable
- **WHEN** 用户关闭 indent/outdent 开关
- **THEN** indent/outdent 命令不生效（no-op 或提示）

### Requirement: Drag-and-drop subtree within current file
插件 SHALL 支持在当前文件内对 list item 子树进行拖拽（drag-and-drop），允许通过 drop 位置改变层级（拖成子项/父项），并且 MUST NOT 支持跨文件拖拽。

#### Scenario: Drag-and-drop is file-local
- **WHEN** 用户拖拽 list item 子树
- **THEN** 插件仅允许在当前文件内完成移动

### Requirement: Vertical indentation lines and bullet threading UI
插件 SHALL 提供可选的 UI 增强：
- 垂直缩进线（visual indentation guides）
- Bullet threading（高亮当前编辑 block 及其祖先链路径）

#### Scenario: Bullet threading highlights active path
- **WHEN** 光标移动到不同 list item
- **THEN** 高亮样式随之更新到新的 active block 路径

### Requirement: Prevent conflicts with third-party zoom/outliner plugins
当检测到第三方插件 `obsidian-zoom` 或 `obsidian-outliner` 已启用时，插件 SHALL 阻止用户启用 BLP 内置的对应 zoom/outliner 模块，并给出明确提示（包含冲突插件名称与处理建议）。

#### Scenario: Refuse enabling when conflict plugin is enabled
- **WHEN** 检测到 `obsidian-outliner` 已启用且用户尝试启用 BLP outliner 模块
- **THEN** 插件拒绝启用并提示冲突原因
