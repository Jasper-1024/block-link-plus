## ADDED Requirements
### Requirement: Provide a debug mode
插件 MAY 提供 debug 模式输出，用于排查过滤、匹配与提取过程中的问题。

#### Scenario: Debug output is enabled
- **WHEN** 用户在 YAML 配置中开启 `debug: true`
- **THEN** 插件输出结构化调试信息（例如解析后的配置、候选文件、命中章节等）

### Requirement: Update timeline output using a marked region and hash
插件 SHALL 使用明确的 start/end 区域标记管理自动生成内容，并通过哈希比对避免重复写入。

#### Scenario: Update only the managed region
- **WHEN** 文件中存在已生成的 timeline 区域
- **THEN** 插件只更新 start/end 标记之间的内容，不改动区域外用户内容

