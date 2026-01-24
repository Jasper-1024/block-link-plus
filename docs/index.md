# Block Link Plus

增强 Obsidian 块引用功能的插件，支持多行块引用、Enhanced List Blocks（`blp-view`）和内联编辑。

## 核心功能

- **多行块引用** - 创新的 `^abc123-abc123` 范围标识符，实现多行引用
- **Enhanced List Blocks** - 以 list item 为最小 block，自动生成隐藏系统行（`[date:: ...] ^id`），并提供 `blp-view` 查询/视图
- **内联编辑** - 直接编辑嵌入块内容，无需跳转原文件
- **智能别名** - 块链接显示内容摘要而非随机ID

## 快速开始

1. 在社区插件中搜索 "Block Link Plus"
2. 启用插件
3. 选中文本右键 → "复制块链接"

## 链接类型

- `[[文件#^abc123]]` - 常规块链接
- `![[文件#^abc123]]` - 嵌入块（Live Preview 可编辑，需开启设置）
- `![[文件#^abc123-abc123]]` - 多行范围嵌入
- `obsidian://open?vault=...` - URI链接

## 致谢

Block Link Plus 参考了优秀的开源项目：

- **内联编辑引擎** - 移植自 [sync-embeds](https://github.com/uthvah/sync-embeds/)
- **早期可编辑块基础** - 参考 [Obsidian-Basics](https://github.com/Make-md/Obsidian-Basics)
- **块引用基础** - 参考 [copy-block-link](https://github.com/mgmeyers/obsidian-copy-block-link)
- **多块处理** - 启发自 [Text Transporter](https://github.com/TfTHacker/obsidian42-text-transporter)

感谢所有开源贡献者为 Obsidian 生态做出的努力。

## 依赖

`blp-view`（Query/View）需要 [Dataview](https://github.com/blacksmithgu/obsidian-dataview) 插件。
