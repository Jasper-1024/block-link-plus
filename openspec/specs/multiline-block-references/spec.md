# Capability: Multiline Block References

## Purpose
支持对连续多行内容生成可引用的范围标识，并在渲染/嵌入时稳定解析到正确的行范围，兼容列表/引用块等常见结构。
## Requirements
### Requirement: Generate range-based block references
Range end marker `^startId-endId` MUST be inserted as a standalone line and MUST NOT be inserted as a prefix of the following content line.

If there is existing content on the next line, the plugin MUST insert a blank line after the marker so Obsidian can parse `^startId-endId` as a standalone block ID (end of Markdown block). If the next line is already blank, the plugin MUST NOT insert an extra blank line.

#### Scenario: End marker does not prefix the next line
- **WHEN** the line immediately after the selection already contains non-empty content
- **THEN** the end marker appears on its own line between the selection and the next line, followed by a blank line, and the next line content is preserved

#### Scenario: Existing blank line is reused
- **WHEN** the line immediately after the selection is already blank
- **THEN** the end marker is inserted before that blank line, and no additional blank line is added

#### Scenario: End marker at end-of-file remains a standalone line
- **WHEN** a range end marker is inserted after a selection that ends at end-of-file
- **THEN** the marker appears on its own line at the end of the note

### Requirement: Resolve multiline references to concrete content
插件 SHALL 能将 `![[file#^startId-endId]]` 解析为精确的内容行范围，并在渲染/嵌入时展示正确的多行内容。

#### Scenario: Render a multiline embed
- **WHEN** 笔记中存在 `![[file#^startId-endId]]`
- **THEN** 插件渲染的嵌入内容覆盖该范围的多行文本，且不包含范围外内容

#### Scenario: Range marker line is visible but read-only in inline edit
- **WHEN** Live Preview 中对 `![[file#^id-id]]` 启用了 inline edit
- **THEN** `^id-id` 的末尾 marker 行必须可见但不可编辑

### Requirement: Preserve compatibility with Markdown structures
插件 SHALL 兼容常见 Markdown 结构（列表、引用块、代码块等）并尽量避免引入破坏性改写。

#### Scenario: Multiline selection contains list items
- **WHEN** 用户选择的多行内容包含列表项
- **THEN** 插件生成的引用在后续解析时仍能定位到正确行范围，且不破坏列表缩进与符号

### Requirement: Reading/preview processing fails open
The plugin MUST NOT cause unrelated note content to disappear. If custom rendering for multiline embeds fails (or the environment does not support required APIs), the plugin SHALL keep Obsidian's native embed rendering visible (fail open).

#### Scenario: Processor error does not blank the note
- **WHEN** multiline embed post-processing throws an error or fails to initialize
- **THEN** the note continues to render normally and the native embed content remains visible

