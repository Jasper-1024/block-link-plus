# Change: Fix Heading Analysis Edge Cases

## Why
标题分析与范围定位在极端输入（例如空范围、起止行均为 0、异常 heading cache）时会出现错误或不一致行为，需要补充校验以提升稳定性。

## What Changes
- 为标题分析与范围计算增加边界条件校验与更明确的错误处理。
- 修复起止行均为 0 等特殊输入导致的潜在错误。

## Impact
- Affected specs: `specs/block-link-generation/spec.md`
- Affected code: 标题分析与 selection/range 计算相关工具函数

