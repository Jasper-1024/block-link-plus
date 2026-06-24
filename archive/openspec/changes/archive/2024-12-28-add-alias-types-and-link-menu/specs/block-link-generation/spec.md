## ADDED Requirements
### Requirement: Provide alias types for block links
插件 SHALL 提供多种可配置的 alias 生成方式，用于将 `[[file#^id]]` 变得更可读。

#### Scenario: Alias uses nearest heading
- **WHEN** 用户选择“Nearest heading”别名策略生成块链接
- **THEN** 插件生成包含该标题文本的别名链接（例如 `[[file#^id|当前标题]]`）

### Requirement: Provide multiple link types in UI entry points
插件 SHALL 在命令面板与/或右键菜单提供多个链接类型入口，覆盖 Regular / Embed / URI 等常见需求。

#### Scenario: Choose an embed link from the context menu
- **WHEN** 用户在编辑器右键菜单选择“Embed block link”
- **THEN** 插件输出 `![[file#^id]]`（或等价）并保持可跳转

