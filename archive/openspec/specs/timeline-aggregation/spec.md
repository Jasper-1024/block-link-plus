# Capability: Timeline Aggregation

## Purpose
通过 `blp-timeline` 代码块 + YAML 配置，把多个文件中的时间相关章节聚合为时间线输出，并以尽量少的写入与更强的可调试性保证稳定运行。
## Requirements
### Requirement: Deprecate `blp-timeline` in favor of `blp-view`
插件 MUST NOT 再提供 `blp-timeline` 的时间线聚合/写入能力；应引导用户使用 `blp-view`（Enhanced List Blocks Query/View）实现查询与渲染（例如通过文档/变更说明）。

#### Scenario: `blp-timeline` becomes non-operative
- **WHEN** 用户在笔记中使用 `blp-timeline` 代码块
- **THEN** 插件不再执行查询/聚合，也不写入任何动态区域
- **AND** 该代码块按 Obsidian 默认方式作为普通代码块渲染

