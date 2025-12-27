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
插件 SHALL 支持生成多种链接格式，包括普通链接、嵌入链接、可编辑嵌入链接与 Obsidian URI 链接。

#### Scenario: Copy different link formats
- **WHEN** 用户选择不同的链接类型（Regular / Embed / Editable / URI）
- **THEN** 插件输出对应的链接格式（`[[...]]` / `![[...]]` / `!![[...]]` / `obsidian://...`）

### Requirement: Provide configurable alias generation
插件 SHALL 支持为块链接生成可配置的别名（alias），用于提升链接可读性。

#### Scenario: Use selected text as alias
- **WHEN** 用户选择“Selected text”别名模式并生成链接
- **THEN** 插件生成带别名的链接（例如 `[[file#^id|选中的文本]]`）

### Requirement: Handle headings and list items robustly
插件 SHALL 正确处理标题块与列表项块的定位与 ID 插入，避免破坏原有 Markdown 结构。

#### Scenario: Generate link for a list item
- **WHEN** 用户将光标置于列表项并生成块链接
- **THEN** 插件在合理位置插入/复用块 ID，且生成的链接可稳定跳转回该列表项
