# Block Link Plus

[![Version](https://img.shields.io/badge/version-2.0.2-blue.svg)](https://github.com/Jasper-1024/obsidian-block-link-plus/releases)
[![Downloads](https://img.shields.io/github/downloads/Jasper-1024/obsidian-block-link-plus/total.svg)](https://github.com/Jasper-1024/obsidian-block-link-plus/releases)

[copy-block-link](https://github.com/mgmeyers/obsidian-copy-block-link/tree/main) 是我使用频率很高的插件，但它一直不支持“多行选区”的块引用，所以我写了 Block Link Plus：保留一键复制块链接的手感，同时补齐多行块、Block ID 自定义等能力。

从 2.0 开始，插件的主线变成了 Outliner（仿 Logseq）+ `blp-view`（查询/视图）：在指定文件范围内把列表项当作 block 来维护，并提供可查询/可渲染的视图。

## 🚀 核心特性

- **多行块引用** - 使用 `^abc123-abc123` 的范围块格式精确引用多行内容
- **Outliner（仿 Logseq）+ `blp-view`** - 在启用范围内把列表项当作 block；维护稳定 `^id` + 隐藏系统元数据；并用 `blp-view` 查询/渲染（依赖 Dataview）
- **内联编辑** - 在 Live Preview 下直接编辑嵌入的块/标题（启用后）
- **智能别名** - 复制链接时可基于内容生成描述

## demo

### base

https://github.com/user-attachments/assets/5a0f0a32-42a3-4c23-8b38-17542c5ec072

### inline edit

https://github.com/user-attachments/assets/d34b9be4-9a1b-4d00-9a87-1b70463dc8d7

### outliner

https://github.com/user-attachments/assets/ea7f1d24-7845-4957-aa9c-7309af0a3514

## 📦 安装

### 社区插件（推荐）
1. 打开 Obsidian 设置 → 社区插件
2. 搜索 "Block Link Plus" → 安装 → 启用

### 手动安装
1. 下载最新 [release](https://github.com/Jasper-1024/obsidian-block-link-plus/releases)
2. 解压到 `.obsidian/plugins/block-link-plus/`
3. 重启 Obsidian 并启用

## 🔧 快速开始

1. 选中一个块/标题 → 右键 → 选择链接类型（link / embed / URI），或使用命令面板："Copy Block Link" / "Copy Block as Embed" / "Copy Block as Obsidian URI"
2. 多行：选中多行文本 →（设置中选择多行处理模式）→ 创建一个范围块（`^id-id`）
3. Outliner & `blp-view`：启用范围（设置里配置启用文件夹/文件，或 frontmatter `blp_outliner: true`）→ 使用 `blp-view` 代码块进行查询/渲染

## 📖 文档

**完整文档站点：** https://block-link-plus.jasper1024.com/

- [安装指南](https://block-link-plus.jasper1024.com/install/)
- [多行块](https://block-link-plus.jasper1024.com/usage/multiline/)
- [Outliner 与 blp-view](https://block-link-plus.jasper1024.com/usage/outliner/)
- [设置参考](https://block-link-plus.jasper1024.com/reference/settings/)

## 使用

插件提供多种方式访问其功能：
- 编辑器中的右键菜单
- 命令面板
- 快捷键（可在 Obsidian 设置中配置）
- 大部分开关都在 `设置 -> Block Link Plus`（比如右键菜单项、复制提示等）

基本使用方式与 [copy-block-link](https://github.com/mgmeyers/obsidian-copy-block-link/tree/main) 完全相同。

## 功能

### 块链接类型

插件支持三种类型的块链接：
- 常规链接：将块/标题复制为常规链接
- 嵌入：将块/标题复制为嵌入式链接
- Obsidian URI：将块/标题复制为 Obsidian URI，用于外部访问

### 块链接别名

你可以自定义块链接别名的生成方式：
- 默认：无别名
- 首字符：使用块内容的前 x 个字符作为别名（长度可在设置中配置）
- 标题：使用最近的标题作为别名
- 选中文本：使用选中的文本作为别名（长度可在设置中配置）

别名功能仅适用于常规块链接（不适用于嵌入和 URI）。
对于标题块，除非选择"无别名"，否则将始终使用标题文本作为别名。

### 多行文本块

这里的“多行文本”指的是：你在编辑器里选中了一段跨多行、且不包含标题行的文本。

Obsidian 的块引用尚未原生支持“多行范围”的引用，Block Link Plus 提供了几种方式变通（由设置 `mult_line_handle` 控制）。

第一种：新建一个 heading 来包住选区，并复制指向该 heading 的链接。
- 使用 `˅id` 和正常 heading 区分
- 修改阅读模式和实时预览下 `## ˅id` 的渲染，使其更像普通的块引用
- 通过实验性选项 `heading_id_newline` 控制标题块 ID 的换行行为

```bash
## ˅id
abc
def
## ^id

[[file#˅id]]
```

第二种：批量创建多个块引用并拷贝到剪贴板。
- 此功能来自 @[Text Transporter](https://github.com/TfTHacker/obsidian42-text-transporter)

```bash
abc ^id1

def ^id2

gh ^id3

[[file#^id1]]
[[file#^id2]]
[[file#^id3]]
```

第三种是创建范围块（`^id-id`）：在范围起止位置写入 `^id` 和 `^id-id`，然后用 `![[file#^id-id]]` 引用这段多行内容。

```bash
第一行 ^abc123
第二行
第三行 ^abc123-abc123

![[file#^abc123-abc123]]
```

### 自定义 Block ID

Block ID = 前缀-随机字符
- 自定义 Block ID 的前缀，以及随机字符长度（3-7）

现在这个功能尚未有更多的实际用途，或许可以通过 Block ID 的前缀做一些聚合操作。

### Outliner（仿 Logseq）+ blp-view

Outliner（仿 Logseq）把 Obsidian 的列表项当作“块”来用：你可以像在 Logseq 一样写大纲，并且每个列表项都能稳定引用、可查询。

- 在启用范围内，插件会为列表项维护一行系统元数据（默认隐藏）和 `^id`，保证 `[[file#^id]]` 这类引用稳定可用
- 提供 `blp-view` 代码块（依赖 Dataview）用于查询/分组/渲染这些列表块

注意：`blp-view` 只会读取 Outliner 启用范围内的文件，如果 `source` 指到了未启用文件会直接报错。

启用方式：
- 在设置页配置启用文件夹/文件（vault 相对路径；对应 `fileOutlinerEnabledFolders` / `fileOutlinerEnabledFiles`）
- 或在文件 frontmatter 写入 `blp_outliner: true`（`false` 为强制关闭）

示例（最近 7 天按天分组）：

````markdown
```blp-view
filters:
  date:
    within_days: 7
group:
  by: day(date)
render:
  type: embed-list
```
````

### 内联编辑嵌入块 (Embed Block Editing)
此功能允许您直接在笔记中对嵌入的块或标题进行实时编辑，无需跳转到原始文件，提供了流畅的写作体验。

要启用此功能，请前往 `设置 -> Block Link Plus`，开启 `inlineEditEnabled`，并按需要启用：
- `inlineEditFile`（`![[file]]`）
- `inlineEditHeading`（`![[file#Heading]]`）
- `inlineEditBlock`（`![[file#^id]]` / `![[file#^id-id]]`）

说明：阅读模式（Reading mode）始终是只读的。

### 查询/视图（blp-view）

`blp-view` 使用 Dataview 作为索引来源，读取 Outliner 启用范围内的列表块，并按 YAML 配置进行筛选/分组/排序与渲染。

更多用法与配置项请参考文档站点：
https://block-link-plus.jasper1024.com/usage/outliner/

## 社区

- Telegram Channel：https://t.me/blocklinkplus
- Telegram Chat：https://t.me/+QqmqUG-jSeY2ODNh

## 更新日志

### 2.0.2
- 修复：Outliner 展示态（未点击/纯预览）的 `![[...]]` 嵌入渲染更接近内联编辑（行距/缩进；避免列表 marker 被裁切）

### 2.0.1
- Outliner：编辑器命令桥接（让 Ctrl+B 等 core 快捷键生效）+ 严格插件白名单
- 新增设置：`fileOutlinerEditorCommandBridgeEnabled`、`fileOutlinerEditorCommandAllowedPlugins`（想要 core 快捷键请保留 `core`）

### 2.0.0
- Outliner（仿 Logseq）成为主线编辑体验
- 启用范围统一（设置中的启用文件夹/文件：`fileOutlinerEnabledFolders` / `fileOutlinerEnabledFiles` + frontmatter：`blp_outliner`）
- `blp-view` 与 Outliner 范围对齐
- 移除 Timeline / Time section 等旧能力（如仍需要，请固定使用旧版本）

### 1.5.3
- 改进了 **Timeline** 输出格式，提高了可读性和组织性
- 为每个文件组添加了文件链接作为入口点
- 在文件组之间添加了分隔符，内容行之间添加了空行
- 保留了用户对嵌入链接的自定义修改
- 更新了文档，添加了新格式示例
- 修复了 Timeline 过滤中的链接匹配问题

### 1.5.0
- 为 Timeline 功能添加了**调试模式**，用于排查过滤问题
- 修复了 Timeline 中的章节提取，以正确匹配链接
- 通过基本名称匹配改进了 Timeline 过滤的准确性
- 添加了基于哈希的优化，防止不必要的文件更新
- 修复了 Timeline 功能中的各种边缘情况

### 1.4.0
- 新增 **内联编辑嵌入块 (Embed Block Editing)** 功能，提供无缝的内联编辑体验。
- 新增 **时间线 (Timeline)** 功能 (`blp-timeline`)，可动态查询和聚合笔记中的章节。
- 将项目迁移到标准化结构，源代码移至 `src` 目录。
- 将 Flow Editor 等主要组件重构为独立模块，以提高可维护性。

### 1.3.0
- 添加了时间章节功能，用于插入时间戳作为标题
- 添加了时间章节的自动标题级别确定
- 添加了对日记笔记的特殊处理，支持自定义模式匹配
- 添加了在预览模式下将时间章节显示为纯文本的选项
- 改进了标题分析，提供更好的级别检测
- 修复了插入元素后的光标定位问题

### 1.2.4
- 添加了标题分析中边缘情况的验证，提高了稳定性
- 增强了 analyzeHeadings 函数的错误处理
- 修复了 start_line 和 end_line 同时为零时的潜在问题

### 1.2.3
- 改进了多行块处理，特别是对列表项的处理
- 增强了多行块的别名生成功能
- 添加了可配置的块链接复制通知
- 修复了列表块的ID处理和位置问题
- 改进了选中文本作为别名的处理

### 1.2.0
- 重新整理设置菜单结构，提升使用体验
- 修复了包含标题的文本块处理问题
- 新增实验性选项：heading_id_newline，用于控制标题块 ID 的换行行为
- 改进设置文本的清晰度和组织

### 1.1.3
- 修复了列表项的块 ID 处理问题
- 优化了列表类型块的 ID 插入位置
- 改进了列表块的处理逻辑

### 1.1.2
- 新增块链接别名类型：选中文本
- 改进了标题块的别名处理
- 修复了单行块的别名生成
- 增强了别名类型配置选项
- 改进了文档和设置说明

### 1.1.0
- 添加了 Obsidian URI 链接支持
- 添加了可自定义的块链接别名类型：
  - 块内容的前 x 个字符
  - 最近的标题
- 改进了命令和菜单文本的清晰度
- 修复了命令面板和右键菜单功能的一致性

## License

Block Link Plus 使用 GNU GPLv3 或更高版本发布，详见 [LICENSE](LICENSE)。

## Thanks

Block Link Plus 是我第一个 Obsidian 插件。开发过程中参考了大量已有插件，感谢这些开源项目：
- [copy-block-link](https://github.com/mgmeyers/obsidian-copy-block-link/tree/main)
- [Text Transporter](https://tfthacker.com/transporter)
- [rendered-block-link-suggestions](https://github.com/RyotaUshio/obsidian-rendered-block-link-suggestions)
- [linkify](https://github.com/matthewhchan/linkify)
