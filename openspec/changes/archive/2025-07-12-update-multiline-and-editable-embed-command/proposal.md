# Change: Update Multiline Handling and Add Editable Embed Command

## Why
多行块与可编辑嵌入在真实使用中需要更一致的解析策略（尤其是 alias/短格式链接混用），同时用户需要更快捷的入口直接复制 `!![[...]]`。

## What Changes
- 增加“Copy blocks as editable embeds”命令入口。
- 改进多行块/flow editor 的链接解析：支持 alias 与非 alias 形式并尽量提取真实链接目标。
- 更新设置/文案与多语言翻译以匹配新增能力。

## Impact
- Affected specs: `specs/inline-editing-embeds/spec.md`, `specs/multiline-block-references/spec.md`
- Affected code: flow editor 解析、markdown processor、设置与 i18n

