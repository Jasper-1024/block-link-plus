# Capability: Inline Editing Embeds

## Purpose
在笔记内以 `!![[...]]` 形式展示可编辑的嵌入块内容，减少文件跳转成本，并在不同模式切换时保持稳定。
## Requirements
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

#### Scenario: Inline edit preserves Obsidian jump affordance
- **WHEN** an inline-edit embed is mounted in Live Preview
- **THEN** the Obsidian embed jump/open affordance (`markdown-embed-link`) remains available

#### Scenario: Inline edit does not recurse
- **WHEN** 一个 `![[...]]` 嵌入出现在另一个 inline edit editor 的 DOM 容器内部
- **THEN** 插件 MUST 跳过该嵌入的 inline edit（避免 editor-in-editor）

#### Scenario: Hotkeys/commands target the focused embed editor
- **WHEN** 焦点位于某个 inline edit 的嵌入 editor 内，且用户触发一个 editor command/hotkey（含用户自定义热键）
- **THEN** 该命令 MUST 作用于该嵌入 editor（而不是宿主笔记的 editor）

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

### Requirement: Inline edit embeds hide Outliner v2 system tail lines
When an inline-edit embed renders content that contains an Outliner v2 system tail line (identified by `[blp_sys:: 1]`), the system tail line MUST NOT be visible in the embed surface.

#### Scenario: Block embed does not display system tail line
- **GIVEN** a Live Preview inline-edit embed renders an Outliner v2 block that includes a system tail line
- **WHEN** the embed editor is mounted
- **THEN** the embed surface does not expose `blp_sys`/`blp_ver`/`date`/`updated` system tail tokens

