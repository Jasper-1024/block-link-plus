# Capability: Multiline Block References

## Purpose
支持对连续多行内容生成可引用的范围标识，并在渲染/嵌入时稳定解析到正确的行范围，兼容列表/引用块等常见结构。

## Requirements
### Requirement: Generate range-based block references
插件 SHALL 支持对连续多行选择生成可引用的范围标识，并用于后续跳转与渲染。

#### Scenario: Create a multiline reference from a selection
- **WHEN** 用户选择连续多行内容并执行“复制块链接（多行）”
- **THEN** 插件生成范围式引用（例如 `^startId-endId` 或等价表示）并可被稳定解析

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
