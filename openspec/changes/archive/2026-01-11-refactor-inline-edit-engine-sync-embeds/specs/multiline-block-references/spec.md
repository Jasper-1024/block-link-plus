## MODIFIED Requirements
### Requirement: Resolve multiline references to concrete content
插件 SHALL 能将 `![[file#^startId-endId]]` 解析为精确的内容行范围，并在渲染/嵌入时展示正确的多行内容。

#### Scenario: Render a multiline embed
- **WHEN** 笔记中存在 `![[file#^startId-endId]]`
- **THEN** 插件渲染的嵌入内容覆盖该范围的多行文本，且不包含范围外内容

#### Scenario: Range marker line is visible but read-only in inline edit
- **WHEN** Live Preview 中对 `![[file#^id-id]]` 启用了 inline edit
- **THEN** `^id-id` 的末尾 marker 行必须可见但不可编辑