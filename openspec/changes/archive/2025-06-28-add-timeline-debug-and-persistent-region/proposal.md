# Change: Add Timeline Debug and Persistent Region Updates

## Why
Timeline 的过滤/匹配逻辑在真实库中容易出现“为什么没匹配上”的问题；同时频繁写入笔记会导致噪声、触发更多事件、甚至产生循环更新风险，需要引入可追踪的 debug 输出与更稳健的写入策略。

## What Changes
- 增加 timeline `debug` 模式，输出结构化信息帮助定位筛选问题。
- 引入动态区域解析与哈希比对：仅在内容变化时更新指定区域，降低写入频率与副作用。

## Impact
- Affected specs: `specs/timeline-aggregation/spec.md`
- Affected code: `src/features/dataview-timeline/*`（region parser / query builder / debug output）

