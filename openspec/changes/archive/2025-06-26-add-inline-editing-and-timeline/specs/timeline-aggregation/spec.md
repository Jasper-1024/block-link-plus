## ADDED Requirements
### Requirement: Process `blp-timeline` code blocks with YAML config
插件 SHALL 识别并处理 `blp-timeline` 代码块，从 YAML 配置生成时间线聚合结果。

#### Scenario: Parse a basic timeline config
- **WHEN** 用户在笔记中写入 `blp-timeline` 代码块并提供合法 YAML
- **THEN** 插件解析配置并开始执行查询/聚合流程

