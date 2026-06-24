# Proposal: Remove Timeline + Time Section (use `blp-view` instead)

## Why
- 现有 `blp-timeline`（Timeline Aggregation）是为了弥补历史能力缺口而引入，但它与当前已实现的 `blp-view`（Enhanced List Blocks Query/View）能力重叠，且维护成本高、妥协多。
- “时间章节（Time Section）”插入与样式属于低频功能，增加设置/命令/UI 面积，并与本轮以 Query 为中心的路线不一致。

## What Changes
- 移除 Timeline Aggregation 的核心实现与设置项；`blp-timeline` 代码块不再执行聚合/写入（可选：仅渲染迁移提示）。
- 移除 Time Section Insertion 的命令、菜单入口、设置项与相关样式处理。
- 设置页：删除 Timeline / Time Section 分组；把 Dataview 可用性提示放到 Enhanced List Blocks（`blp-view`）相关区域。
- 文档：删除/迁移 timeline 与 time section 的使用说明，提供用 `blp-view` 替代 `blp-timeline` 的示例。

## Impact
- **Breaking**：已有 `blp-timeline` 代码块不再生成/更新输出。
- 原有 “Insert Time Section” 命令与对应热键将失效。
- 不涉及用户数据迁移；历史插入的标题/内容保留不变。

