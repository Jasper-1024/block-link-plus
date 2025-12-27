## ADDED Requirements
### Requirement: Validate heading analysis inputs
插件 SHALL 对标题分析与范围计算的输入做边界校验，以避免极端输入导致的错误或异常输出。

#### Scenario: Empty or zero-range selection
- **WHEN** selection 的起止位置异常（例如 start/end 同为 0 或为空）
- **THEN** 插件不会抛出未捕获异常，且不会生成明显错误的链接

