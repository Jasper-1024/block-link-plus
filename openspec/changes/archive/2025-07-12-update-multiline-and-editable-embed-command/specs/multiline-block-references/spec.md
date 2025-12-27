## ADDED Requirements
### Requirement: Parse links with or without aliases in multiline flows
插件 SHALL 在多行块与 flow editor 的解析中支持带 alias 与不带 alias 的链接形式，并以链接真实目标为准进行后续处理。

#### Scenario: Link with alias is parsed correctly
- **WHEN** 输入包含 `!![[file#^id|alias]]` 或 `!![[file#^id]]`
- **THEN** 插件解析得到一致的目标引用（`file#^id`），而不会把 alias 误当作目标的一部分

