## ADDED Requirements
### Requirement: Render editable embeds for blocks
插件 SHALL 支持将 `!![[...]]` 形式的嵌入渲染为可就地编辑的块内容（在支持的视图/模式中）。

#### Scenario: Editable embed in a note
- **WHEN** 笔记中包含 `!![[file#^blockId]]`
- **THEN** 插件渲染出可编辑的块内容区域，并提供必要的交互（例如定位、编辑入口）

