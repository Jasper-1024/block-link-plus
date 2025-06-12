# Block Link Plus

[copy-block-link](https://github.com/mgmeyers/obsidian-copy-block-link/tree/main) 是我使用频率最高的插件, 但是它始终没有支持多行文本块的创建, 于是我尝试编写了 block-link-plus. block-link-plus 支持了多行文本块的创建, 并对 block ID 更多的自定义.

## 使用

插件提供多种方式访问其功能：
- 编辑器中的右键菜单
- 命令面板
- 可配置的菜单项（可在设置中启用/禁用）

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

多行文本这里专指: 选中文本中没有任何标题的多行内容.

Obsidian 的块引用尚未支持多行文本块的创建, block-link-plus 使用了两种方式变通.

第一种是使用 heading: 将选中文本添加到一个新的 heading 中, 并拷贝指向 heading 的链接.
- 使用 `˅id` 和正常 heading 区分
- 修改 阅读模式 和 实时预览下 `## ˅id` 的渲染,使其更加类似普通的块引用.
- 通过实验性选项 `heading_id_newline` 控制标题块 ID 的换行行为

```bash
## ˅id
abc
def
## ^id

[[file#˅id]]
```

第二种创建多个块引用: 批量创建多组块引用并拷贝到剪贴板.
- 此功能来自 @[Text Transporter](https://github.com/TfTHacker/obsidian42-text-transporter)

```bash
abc ^id1

def ^id2

gh ^id3

[[file#^id1]]
[[file#^id2]]
[[file#^id3]]
```

### 自定义 Block ID

Block ID = 前缀-随机字符
- 自定义 block ID 的前缀 和 随机字符的长度(3-7)

现在这个功能尚未有更多的实际用途, 或许可以通过 block ID 的前缀进行更多的聚合操作.

### 时间章节

时间章节功能允许您快速插入时间戳作为标题，这对于日记和会议记录特别有用：

- 插入可配置格式的时间戳（默认：HH:mm）
- 对日记笔记进行特殊处理，支持自定义文件名模式检测
- 基于文档结构自动确定标题级别
- 选项可在预览模式下将时间章节显示为纯文本
- 可通过命令面板和右键菜单访问（可选）

```bash
## 09:30
会议记录...

## 14:15
后续讨论...
```

## 更新日志

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

Block Link Plus is released under GNU GPLv3 (License).

## Thanks

Block Link Plus 是我第一个 obsidian 插件,开发过程中参考了大量已有的插件,感谢这些开源项目.
- [copy-block-link](https://github.com/mgmeyers/obsidian-copy-block-link/tree/main)
- [Text Transporter](https://tfthacker.com/transporter)
- [rendered-block-link-suggestions](https://github.com/RyotaUshio/obsidian-rendered-block-link-suggestions)
- [linkify](https://github.com/matthewhchan/linkify)