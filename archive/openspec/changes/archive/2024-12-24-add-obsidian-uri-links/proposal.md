# Change: Add Obsidian URI Links

## Why
需要在 Obsidian 之外（浏览器、终端、移动端自动化等）直接跳转到指定笔记/块位置时，`obsidian://...` 形式更适合作为“可分享/可自动化”的深链。

## What Changes
- 新增生成 Obsidian URI 链接的能力（与现有块链接生成入口一致）。
- 在文档与设置/命令描述中补充 URI 链接的用途与示例。

## Impact
- Affected specs: `specs/block-link-generation/spec.md`
- Affected code: 链接生成与命令/菜单注册相关模块

