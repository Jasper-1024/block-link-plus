## MODIFIED Requirements
### Requirement: Render editable embeds for blocks
插件 SHALL 支持对标准嵌入语法 `![[...]]` 的 inline edit（仅 Live Preview 且设置允许时），覆盖：
- `![[file]]`（file）
- `![[file#Heading]]`（heading）
- `![[file#^blockId]]`（block）
- `![[file#^startId-endId]]`（range，归入 block）

#### Scenario: Inline edit uses standard embed syntax
- **WHEN** Live Preview 中出现 `![[file#^blockId]]` 且 `inlineEditEnabled=true` 且 `inlineEditBlock=true`
- **THEN** 插件在嵌入容器内渲染可编辑的嵌入 editor，并让编辑影响源文件 `file`

#### Scenario: Legacy !![[...]] is ignored
- **WHEN** 笔记中出现 `!![[file#^blockId]]`
- **THEN** 插件 MUST NOT 清理/改写该语法，也 MUST NOT 将其视为 inline edit 的触发条件

#### Scenario: Heading line is visible but read-only
- **WHEN** Live Preview 中出现 `![[file#Heading]]` 且 `inlineEditEnabled=true` 且 `inlineEditHeading=true`
- **THEN** 嵌入 editor 内 `#Heading` 对应的标题行必须可见但不可编辑

#### Scenario: Range marker line is visible but read-only
- **WHEN** Live Preview 中出现 `![[file#^id-id]]` 且 `inlineEditEnabled=true` 且 `inlineEditBlock=true`
- **THEN** 末尾 marker 行（`^id-id` 所在行）必须可见但不可编辑

#### Scenario: Inline edit does not recurse
- **WHEN** 一个 `![[...]]` 嵌入出现在另一个 inline edit editor 的 DOM 容器内部
- **THEN** 插件 MUST 跳过该嵌入的 inline edit（避免 editor-in-editor）

#### Scenario: Reading mode is never editable
- **WHEN** 用于展示嵌入的视图处于 Reading/preview mode
- **THEN** 插件 MUST NOT 创建/挂载任何嵌入 editor leaf；嵌入只能只读展示

### Requirement: Avoid DOM lifecycle errors during mode switches
插件 SHALL 在 Live Preview/Reading 切换、设置开关切换、以及 DOM 卸载时正确清理嵌入 leaf/editor 与容器，避免控制台出现 unmount/removeChild 等错误，并避免残留 focus/command routing 状态。

#### Scenario: Switch between modes
- **WHEN** 用户在 Live Preview 与 Reading/preview mode 之间切换
- **THEN** 已渲染的 inline edit 嵌入不会导致控制台错误，且不残留不可见的 leaf/editor

#### Scenario: Toggle inline edit does not leak resources
- **WHEN** 用户关闭 `inlineEditEnabled`
- **THEN** 插件卸载所有已创建的嵌入 leaf/editor，并恢复到原生嵌入展示

## REMOVED Requirements
### Requirement: Provide a command to copy as editable embed
插件 SHALL 提供命令/菜单项，使用户可以直接复制选中内容为 `!![[...]]` 格式。

#### Scenario: Copy selection as editable embed
- **WHEN** 用户选择一段内容并执行“Copy as editable embed”
- **THEN** 插件输出 `!![[file#^blockId]]`（或等价）到剪贴板