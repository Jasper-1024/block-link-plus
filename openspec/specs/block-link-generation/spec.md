# Capability: Block Link Generation

## Purpose
为 Obsidian 用户提供稳定、可配置的块链接生成能力，覆盖不同链接格式与别名策略，并兼容标题/列表等常见 Markdown 结构。
## Requirements
### Requirement: Generate block links from editor selection
插件 SHALL 提供命令与/或右键菜单入口，允许用户从当前编辑器选择内容生成指向块或标题的链接。

#### Scenario: Copy a regular block link
- **WHEN** 用户在编辑器中选择一段文本并执行“复制块链接”
- **THEN** 插件生成 `[[file#^blockId]]` 形式的链接并写入剪贴板（必要时先生成 `blockId`）

### Requirement: Support multiple link formats
插件 SHALL 支持生成以下链接格式：
- 普通链接：`[[...]]`
- 嵌入链接：`![[...]]`
- Obsidian URI 链接：`obsidian://...`

插件 MUST NOT 生成 `!![[...]]`，且 MUST NOT 提供任何 editable embed（`!!`）相关格式。

#### Scenario: Copy different link formats
- **WHEN** 用户选择不同的链接类型（Regular / Embed / URI）
- **THEN** 插件分别输出 `[[...]]` / `![[...]]` / `obsidian://...` 到剪贴板

### Requirement: Provide configurable alias generation
插件 SHALL 支持为块链接生成可配置的别名（alias），用于提升链接可读性。

#### Scenario: Use selected text as alias
- **WHEN** 用户选择“Selected text”别名模式并生成链接
- **THEN** 插件生成带别名的链接（例如 `[[file#^id|选中的文本]]`）

### Requirement: Handle headings and list items robustly
The plugin SHALL insert and resolve block IDs for list items correctly. Each list item MUST be treated as its own targetable block for ID insertion/link generation, even though Obsidian metadata may represent an entire contiguous list as a single `"list"` section.

#### Scenario: Generate link for a list item
- **WHEN** the cursor/selection is within a list item and the user runs "Copy Block Link"
- **THEN** the plugin inserts (or reuses) the `^id` for that list item and copies a link targeting that list item

#### Scenario: List item after a previously linked item
- **WHEN** the previous list item already has a block link/ID and the active list item does not
- **THEN** the plugin MUST NOT reuse the previous item's ID and MUST insert a new `^id` for the active list item

#### Scenario: Active list item already has an ID
- **WHEN** the active list item line already ends with a `^id`
- **THEN** the plugin MUST reuse that `^id` and MUST NOT add a second ID to the same list item

#### Scenario: Do not reuse the first list item's ID
- **WHEN** the list's first item has a `^id` but the active item is a later list item
- **THEN** the plugin MUST NOT copy a link to the first item's `^id`; it MUST target the active list item

