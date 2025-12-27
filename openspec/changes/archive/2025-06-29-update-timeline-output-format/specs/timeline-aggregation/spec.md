## ADDED Requirements
### Requirement: Group timeline output by file with separators
插件 SHOULD 将 timeline 输出按文件分组，并为每个文件组生成入口链接与分隔符，以提升可读性。

#### Scenario: Output is grouped by file
- **WHEN** 查询命中多个文件的多个章节
- **THEN** 输出按文件分组，每组包含 `[[file]]` 入口，文件组之间用 `---` 分隔

### Requirement: Preserve customized embed lines
插件 SHOULD 尝试保留用户对生成的嵌入链接行的自定义修改，并在后续更新时合并回输出。

#### Scenario: User modified one embed line
- **WHEN** 用户手动修改了某条 `![[...]]` / `!![[...]]` 行
- **THEN** 插件后续更新时保留该修改，而不是无条件覆盖

