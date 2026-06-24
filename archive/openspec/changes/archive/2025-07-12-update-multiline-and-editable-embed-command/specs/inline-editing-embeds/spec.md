## ADDED Requirements
### Requirement: Provide a command to copy as editable embed
插件 SHALL 提供命令/菜单项，让用户可以直接复制选中块为 `!![[...]]` 格式。

#### Scenario: Copy selection as editable embed
- **WHEN** 用户选择一段内容并执行“Copy as editable embed”
- **THEN** 插件输出 `!![[file#^blockId]]`（或等价）到剪贴板

