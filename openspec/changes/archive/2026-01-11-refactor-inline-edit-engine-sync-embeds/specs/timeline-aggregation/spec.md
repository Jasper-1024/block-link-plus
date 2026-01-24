## ADDED Requirements
### Requirement: Generate timeline embeds using standard `![[...]]` only
插件 SHALL 在 timeline 输出中生成标准嵌入链接 `![[...]]`，且不支持 `!![[...]]`。
插件 SHOULD 忽略 legacy 配置键 `embed_format`（若存在），并仍输出 `![[...]]`。

#### Scenario: Timeline output uses ![[]] only
- **WHEN** YAML 配置中存在 legacy `embed_format: '!![[]]'`
- **THEN** timeline 仍生成 `![[...]]` 形式的嵌入链接（不生成 `!![[...]]`）