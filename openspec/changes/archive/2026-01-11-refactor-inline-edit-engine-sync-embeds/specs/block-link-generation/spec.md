## MODIFIED Requirements
### Requirement: Support multiple link formats
插件 SHALL 支持生成以下链接格式：
- 普通链接：`[[...]]`
- 嵌入链接：`![[...]]`
- Obsidian URI 链接：`obsidian://...`

插件 MUST NOT 生成 `!![[...]]`，且 MUST NOT 提供任何 editable embed（`!!`）相关格式。

#### Scenario: Copy different link formats
- **WHEN** 用户选择不同的链接类型（Regular / Embed / URI）
- **THEN** 插件分别输出 `[[...]]` / `![[...]]` / `obsidian://...` 到剪贴板