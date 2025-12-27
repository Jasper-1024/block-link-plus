## ADDED Requirements
### Requirement: Generate Obsidian URI links
插件 SHALL 支持生成可在外部环境打开 Obsidian 的 URI 链接，并能定位到目标文件与子路径（标题/块）。

#### Scenario: Copy a URI link for a block
- **WHEN** 用户对某个块选择“URI”链接类型进行复制
- **THEN** 剪贴板内容为 `obsidian://...` 形式，且可跳转到对应文件并定位到该块

