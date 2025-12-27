# Change: Update Timeline Output Format

## Why
早期 timeline 输出在可读性与组织性方面不足；用户希望结果按文件分组、具有清晰的入口链接与分隔符，并尽量保留对单条嵌入链接的自定义修改。

## What Changes
- 输出按文件分组：每组以 `[[file]]` 作为入口。
- 文件组之间使用 `---` 分隔，内容行之间插入空行提升可读性。
- 识别并保留用户对嵌入链接行的自定义修改。

## Impact
- Affected specs: `specs/timeline-aggregation/spec.md`
- Affected code: `src/features/dataview-timeline/index.ts`（渲染输出与合并逻辑）

