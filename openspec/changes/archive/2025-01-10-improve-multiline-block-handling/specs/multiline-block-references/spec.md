## MODIFIED Requirements
### Requirement: Preserve compatibility with Markdown structures
插件 SHOULD 兼容常见 Markdown 结构（列表、引用块、代码块等）并尽量避免引入破坏性改写。

#### Scenario: Multiline selection contains list items
- **WHEN** 用户选择的多行内容包含列表项
- **THEN** 插件生成的引用在后续解析时仍能定位到正确行范围，且不破坏列表缩进与符号

#### Scenario: Alias does not break multiline resolution
- **WHEN** 多行引用/嵌入链接包含 alias 或相关设置开启
- **THEN** 插件仍能解析出正确的多行范围，而不会因为 alias 文本导致解析失败或错位

