# Change: Fix Timeline Link Matching with Backward Compatibility

## Why
Timeline 的链接匹配在不同链接写法（短格式、带/不带扩展名、basename 等）之间容易出现误判；需要改进匹配逻辑，同时保持对既有“短格式链接”的向后兼容。

## What Changes
- 改进 timeline 中链接匹配逻辑（更灵活的路径/名称匹配策略）。
- 保持对历史短格式链接的兼容路径，避免升级后出现大量“匹配不到”的回归。

## Impact
- Affected specs: `specs/timeline-aggregation/spec.md`
- Affected code: `src/features/dataview-timeline/*`（过滤与匹配相关逻辑）

