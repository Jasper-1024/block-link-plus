# Change: Add Inline Editing and Timeline

## Why
用户希望在引用块内容时能够直接在当前文件内编辑（避免频繁切换文件），并希望通过可配置的方式从多个文件聚合“时间相关章节”以形成时间线视图。

## What Changes
- 增加 `!![[...]]` 可编辑嵌入语法与对应渲染/交互基础设施。
- 增加 `blp-timeline`：通过 YAML 配置 + Dataview 查询 + 章节提取生成时间线输出。
- 重构项目结构以提升可维护性（将特性模块拆分到 `src/features/` 等）。

## Impact
- Affected specs: `specs/inline-editing-embeds/spec.md`, `specs/timeline-aggregation/spec.md`
- Affected code: `src/features/dataview-timeline/*`, `src/basics/*`, `src/main.ts`

