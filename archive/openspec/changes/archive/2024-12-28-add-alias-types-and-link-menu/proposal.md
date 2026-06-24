# Change: Add Alias Types and Link Menu

## Why
块链接默认以 `^id` 表示，不利于阅读与检索；同时用户希望在右键菜单中快速选择不同的复制格式（普通/嵌入/URI 等）。

## What Changes
- 增加多种别名（alias）生成策略（例如选中文本、截断内容、最近标题等）。
- 在右键菜单/命令中提供更清晰的链接类型入口。

## Impact
- Affected specs: `specs/block-link-generation/spec.md`
- Affected code: 命令注册、右键菜单、alias 生成与设置项

