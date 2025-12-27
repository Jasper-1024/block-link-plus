## MODIFIED Requirements
### Requirement: Extract sections by heading level and apply filters
插件 SHALL 支持按指定标题级别提取章节，并对章节内容应用过滤条件（links/tags，支持 AND/OR 组合）。

#### Scenario: Filter by tags OR links
- **WHEN** 配置中指定 `filters.tags` 与/或 `filters.links`，并设置 relation
- **THEN** 只输出满足过滤逻辑的章节嵌入链接

#### Scenario: Link matching supports multiple formats
- **WHEN** 过滤条件中的链接与章节内容中的链接写法不同（例如短格式、basename、带扩展名等）
- **THEN** 插件仍能在可接受范围内正确判断是否命中（以避免“实际相关但匹配不到”的问题）

