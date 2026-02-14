# Block Link Plus

增强 Obsidian 的块引用体验：一键复制块链接/嵌入/URI、创建多行范围块（`^id-id`，如 `^abc123-abc123`）、在启用范围内使用 Outliner（类 Logseq）与 `blp-view`（Query/View），并支持嵌入块的内联编辑。

## 核心功能

- **块链接/嵌入/URI** - 右键或命令面板一键复制：`[[file#^id]]` / `![[file#^id]]` / `obsidian://open?...`
- **多行范围块** - `^abc123-abc123` 范围标识符，精确引用/嵌入多行选区
- **Outliner + blp-view** - 在启用文件内把 list item 当作 block；自动维护协议尾行（Dataview inline fields + `^id`）；用 `blp-view` 查询/分组/渲染
- **内联编辑** - 在 Live Preview 直接编辑嵌入内容，无需跳转源文件（需开启设置）
- **智能别名** - 复制常规块链接时可生成内容摘要/父标题等别名

## 快速开始

1. 在社区插件中搜索 "Block Link Plus"
2. 启用插件
3. 选中文本右键 → "复制块链接"
4. 若要使用 Outliner：设置 → Block Link Plus → Outliner → 配置启用范围（建议在专用文件夹内启用；或在文件 frontmatter 写 `blp_outliner: true`）

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
