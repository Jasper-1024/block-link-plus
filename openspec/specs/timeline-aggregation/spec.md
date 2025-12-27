# Capability: Timeline Aggregation

## Purpose
通过 `blp-timeline` 代码块 + YAML 配置，把多个文件中的时间相关章节聚合为时间线输出，并以尽量少的写入与更强的可调试性保证稳定运行。

## Requirements
### Requirement: Process `blp-timeline` code blocks with YAML config
插件 SHALL 识别并处理 `blp-timeline` 代码块，从 YAML 配置生成时间线聚合结果。

#### Scenario: Parse a basic timeline config
- **WHEN** 用户在笔记中写入 `blp-timeline` 代码块并提供合法 YAML
- **THEN** 插件解析配置并开始执行查询/聚合流程

### Requirement: Query notes via Dataview
插件 SHALL 在检测到 Dataview 可用时，使用 Dataview API 查询候选文件集合（例如按文件夹、时间范围等）。

#### Scenario: Dataview is missing
- **WHEN** 用户使用 timeline 功能但未安装/启用 Dataview
- **THEN** 插件给出明确提示并停止执行（不写入生成内容）

### Requirement: Extract sections by heading level and apply filters
插件 SHALL 支持按指定标题级别提取章节，并对章节内容应用过滤条件（links/tags，支持 AND/OR 组合）。

#### Scenario: Filter by tags OR links
- **WHEN** 配置中指定 `filters.tags` 与/或 `filters.links`，并设置 relation
- **THEN** 只输出满足过滤逻辑的章节嵌入链接

### Requirement: Write output to a marked dynamic region with hash optimization
插件 SHALL 将生成结果写入到文件中的动态区域（start/end 标记之间），并通过内容哈希避免不必要的重复写入。

#### Scenario: No-op when output is unchanged
- **WHEN** 配置与查询结果未变化导致输出内容一致
- **THEN** 插件不写入文件（避免触发额外的文件变更与事件循环）

### Requirement: Preserve user customizations to generated embeds
插件 SHALL 在可行范围内保留用户对生成内容的局部修改（例如对某条嵌入链接的自定义调整），并在下一次生成时合并回输出。

#### Scenario: Keep customized embed line
- **WHEN** 用户手动修改了某条生成的嵌入链接行
- **THEN** 插件在后续更新时尽量保留该修改，而不是无条件覆盖

### Requirement: Provide a debug mode
插件 SHALL 支持 debug 模式输出，用于排查过滤、匹配与提取过程中的问题。

#### Scenario: Debug output is enabled
- **WHEN** 用户在 YAML 配置中开启 `debug: true`
- **THEN** 插件输出结构化调试信息（例如解析后的配置、候选文件、命中章节等）
