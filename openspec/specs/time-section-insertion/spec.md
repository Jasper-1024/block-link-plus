# Capability: Time Section Insertion

## Purpose
提供快速插入“时间章节”的能力，适配日志/会议纪要等记录方式，并在不同文件结构下保持标题层级与展示风格的一致性与可控性。

## Requirements
### Requirement: Insert time sections as headings
插件 SHALL 支持在当前位置插入时间章节（通常为标题形式的时间戳），用于日志/会议纪要/复盘等记录。

#### Scenario: Insert a timestamp heading
- **WHEN** 用户执行“插入时间章节”命令
- **THEN** 插件在光标处插入一行时间戳标题（例如 `#### 16:19`，格式可配置）

### Requirement: Auto-detect heading level for time sections
插件 SHALL 支持自动识别当前上下文适合的标题层级，避免破坏文档结构。

#### Scenario: Insert time section inside a section
- **WHEN** 用户在某个标题章节内部插入时间章节
- **THEN** 插件选择合适的标题级别（例如在当前章节下一级），并保持结构一致

### Requirement: Support daily note special handling
插件 SHALL 支持对日记类文件进行特殊处理（例如识别日记文件名/路径模式，或使用不同标题策略）。

#### Scenario: Insert in a daily note
- **WHEN** 当前文件匹配“日记”模式
- **THEN** 插入逻辑符合日记场景的预期（例如默认层级/格式更贴合日记写法）

### Requirement: Optional plain style for preview
插件 SHALL 提供将时间章节在预览中以更“轻量”的样式展示的选项（例如弱化标题视觉权重）。

#### Scenario: Enable plain style
- **WHEN** 用户在设置中开启“plain style”展示
- **THEN** 预览/阅读模式中的时间章节使用更轻量的样式（不影响 Markdown 内容本身）
