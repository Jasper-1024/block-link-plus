# Change: Improve Multiline Block Handling

## Why
多行块引用在列表/引用块等结构中更容易出现定位不稳定、alias 干扰解析、以及渲染边界不一致的问题，需要专项改进以提升稳定性。

## What Changes
- 改进多行块引用的生成与解析策略，使其在常见 Markdown 结构中更稳定。
- 优化 alias 相关行为，减少 alias 对解析/渲染的干扰。

## Impact
- Affected specs: `specs/multiline-block-references/spec.md`
- Affected code: 多行块 ID 生成、解析与渲染相关模块

