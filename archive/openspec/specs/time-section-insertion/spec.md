# Capability: Time Section Insertion

## Purpose
提供快速插入“时间章节”的能力，适配日志/会议纪要等记录方式，并在不同文件结构下保持标题层级与展示风格的一致性与可控性。
## Requirements
### Requirement: Remove time section insertion capability
插件 MUST NOT 再提供“插入时间章节（Insert Time Section）”能力（命令、菜单入口、设置项与样式处理均移除）。

#### Scenario: Command is no longer present
- **WHEN** 用户打开命令面板搜索 “time section”
- **THEN** 不存在 “Insert Time Section” 命令

