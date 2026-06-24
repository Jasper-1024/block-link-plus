## ADDED Requirements
### Requirement: Insert time sections as headings
插件 SHALL 支持在当前位置插入时间章节（通常为标题形式的时间戳），用于日志/会议纪要/复盘等记录。

#### Scenario: Insert a timestamp heading
- **WHEN** 用户执行“插入时间章节”命令
- **THEN** 插件在光标处插入一行时间戳标题（格式可配置），并将光标放置在合理位置继续输入

