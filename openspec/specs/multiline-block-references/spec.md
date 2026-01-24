# Capability: Multiline Block References

## Purpose
支持对连续多行内容生成可引用的范围标识，并在渲染/嵌入时稳定解析到正确的行范围，兼容列表/引用块等常见结构。
## Requirements
### Requirement: Generate range-based block references
The plugin SHALL generate a stable range-based reference for a multi-line selection using the `^id-id` format.

#### Scenario: Create a multiline reference using an inline end marker (default)
- **WHEN** a user selects multiple lines and runs the command to create a multiline range block
- **AND** the start insertion line and end insertion line do not already end with a block ID
- **AND** appending `^id-id` inline at the end insertion line is safe
- **THEN** the plugin appends `^id` to the end of the start insertion line
- **AND** the plugin appends `^id-id` to the end of the end insertion line

#### Scenario: Auto-expand insertion points to Markdown block boundaries
- **WHEN** the selection start or end falls within a composite Markdown block (e.g. list, blockquote, fenced code, table, comment block)
- **THEN** the plugin MAY expand the effective insertion positions to the boundary of that block (typically the end boundary) so that inserted markers are parsed as block IDs

#### Scenario: Fallback to a standalone end marker when inline append is unsafe
- **WHEN** a user selects multiple lines and runs the command to create a multiline range block
- **AND** appending `^id-id` inline at the end insertion line is unsafe (e.g. the insertion point is inside code/table/blockquote/list context)
- **THEN** the plugin inserts a standalone `^id-id` marker line immediately after the end insertion block boundary
- **AND** the plugin inserts an additional blank line after the marker ONLY when required to ensure the marker forms its own Markdown block (e.g. the next line is a plain-text paragraph continuation)

#### Scenario: Fail without modifying the document when insertion points already have a block ID
- **WHEN** a user runs the command to create a multiline range block
- **AND** the start insertion line or end insertion line already ends with a block ID
- **THEN** the plugin does not modify the document
- **AND** the plugin notifies the user that the operation cannot be completed

#### Scenario: Fail without modifying the document when the selection is invalid
- **WHEN** a user runs the command to create a multiline range block
- **AND** the selection is invalid (e.g. single-line selection, crosses frontmatter, begins at empty-file start)
- **THEN** the plugin does not modify the document
- **AND** the plugin notifies the user that the operation cannot be completed

#### Scenario: Atomic insertion and rollback
- **WHEN** the plugin encounters any error while inserting the start marker or end marker
- **THEN** the plugin restores the document to its original state (no partial marker remains)
- **AND** the plugin notifies the user that the operation failed

### Requirement: Resolve multiline references to concrete content
插件 SHALL 能够从范围式引用解析出对应的实际内容范围，并在渲染/嵌入时展示正确的多行内容。

#### Scenario: Render a multiline embed
- **WHEN** 笔记中存在 `![[file#^startId-endId]]` 或 `!![[...]]` 的多行引用
- **THEN** 插件渲染的嵌入内容覆盖该范围内的多行文本，且不会误包含相邻无关内容

### Requirement: Preserve compatibility with Markdown structures
插件 SHALL 兼容常见 Markdown 结构（列表、引用块、代码块等）并尽量避免引入破坏性改写。

#### Scenario: Multiline selection contains list items
- **WHEN** 用户选择的多行内容包含列表项
- **THEN** 插件生成的引用在后续解析时仍能定位到正确行范围，且不破坏列表缩进与符号

