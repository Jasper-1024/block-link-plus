# Capability: Inline Editing Embeds

## Purpose
在笔记内以 `!![[...]]` 形式展示可编辑的嵌入块内容，减少文件跳转成本，并在不同模式切换时保持稳定。

## Requirements
### Requirement: Render editable embeds for blocks
插件 SHALL 支持将 `!![[...]]` 形式的嵌入渲染为可就地编辑的块内容（在支持的视图/模式中）。

#### Scenario: Editable embed in a note
- **WHEN** 笔记中包含 `!![[file#^blockId]]`
- **THEN** 插件渲染出可编辑的块内容区域，并提供必要的交互（例如定位、编辑入口）

### Requirement: Provide a command to copy as editable embed
插件 SHALL 提供命令/菜单项，让用户可以直接复制选中块为 `!![[...]]` 格式。

#### Scenario: Copy selection as editable embed
- **WHEN** 用户选择一段内容并执行“Copy as editable embed”
- **THEN** 插件输出 `!![[file#^blockId]]`（或等价）到剪贴板

### Requirement: Avoid DOM lifecycle errors during mode switches
插件 SHALL 在 Live Preview 与 Reading Mode 等模式切换时正确管理渲染容器与卸载流程，避免出现 React/DOM 的 unmount/removeChild 类错误。

#### Scenario: Switch between modes
- **WHEN** 用户在阅读模式与编辑模式之间切换
- **THEN** 已渲染的可编辑嵌入不会导致控制台报错，且展示状态保持一致
