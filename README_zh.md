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

### 内联编辑嵌入块 (Embed Block Editing)
此功能允许您直接在笔记中对嵌入的块或标题进行实时编辑，无需跳转到原始文件，提供了流畅的写作体验。

要启用此功能，请前往 `设置 -> Block Link Plus`，找到"内联编辑嵌入块"区域，并开启"启用内联编辑"选项。您还可以选择两种编辑风格：
- **minimal (简约)**: 为编辑区域提供更清晰的边界。
- **seamless (无缝)**: 使嵌入的块看起来就像是当前笔记的自然组成部分。

### 创建动态时间线 (Timeline)
`blp-timeline` 是一个强大的查询和聚合工具。它可以自动从您的笔记库中（特别是日记文件）根据标题、标签、链接等条件，抓取相关章节，并以时间线的方式聚合展示。

**工作流:**
1.  **记录 (生产):** 使用"时间章节"功能或手动在您的日记文件中创建带时间的标题（例如, `#### 10:30 项目会议`）。
2.  **聚合 (消费):** 在任何笔记页面，创建一个 `blp-timeline` 代码块，通过书写 `YAML` 配置来定义聚合规则。这将生成一个动态、自动更新的时间线。

**配置:**
以下是一个展示所有可用选项的高级 `YAML` 配置示例:
```yaml
---
# === 基础配置 ===
# 要搜索笔记的文件夹
source_folders:
  - "journal/daily"
  - "meeting_notes/"

# 只包含最近 30 天内的笔记
within_days: 30

# 笔记的排序顺序: 'asc' (旧的在前), 'desc' (新的在前)
sort_order: desc

# === 章节匹配 ===
# 要查找的标题级别 (1-6)
heading_level: 4 

# (可选) 用于从标题中提取时间以在一天内排序的正则表达式
# 此示例匹配 "#### 14:30 项目更新" 中的 "14:30"
time_pattern: '(\\d{2}:\\d{2})'

# === 输出格式 ===
# '!![[]]' 表示嵌入内容, '![[]]' 表示简单的链接引用
embed_format: '!![[]]'

# === 高级过滤 ===
# 如何组合 'links' 和 'tags' 过滤块，可以是 'AND' 或 'OR'
filters:
  relation: AND

  # 按链接过滤。'relation' 可以是 'AND' 或 'OR'
  links:
    relation: OR
    items:
      - "[[项目A]]"
      - "[[内部会议]]"
    # 如果为 true, 自动包含链接到当前笔记的章节
    link_to_current_file: true
  
  # 按标签过滤。'relation' 可以是 'AND' 或 'OR'
  tags:
    relation: AND
    items:
      - '#status/review'
      - '#important'
    
    # (可选) 同时从 frontmatter 的键中提取标签
    from_frontmatter:
      key: "project_tags"
      # (可选) 您可以从 frontmatter 源中排除某些标签
      exclude:
        - "archive"
---
```
**YAML 选项:**
- `source_folders`: (必填) 指定要在哪些文件夹中进行搜索。
- `heading_level`: (可选, 默认: 4) 指定要抓取的标题级别 (1-6)。
- `time_pattern`: (可选) 一个正则表达式，用于从标题文本中提取时间。例如，对于标题 `#### 14:30 会议`，您可以使用 `(\\d{2}:\\d{2})` 来匹配 `14:30`。
- `embed_format`: (可选, 默认: `!![[]]`) 定义最终生成的链接是嵌入形式 (`!![[]]`) 还是普通链接 (`![[]]`)。
- `sort_order`: (可选, 默认: `desc`) 按日期先后顺序 (`asc`) 或倒序 (`desc`) 排列。
- `within_days`: (可选) 只包含最近N天内的笔记。
- `filters`: (可选) 用于高级过滤的容器。
  - `relation`: 定义 `links` 和 `tags` 块如何组合 (`AND` 或 `OR`)。
  - `links`: 根据链接过滤章节。包含 `relation`, `items`, 和 `link_to_current_file`。
  - `tags`: 根据标签过滤章节。包含 `relation`, `items`, 和一个可选的 `from_frontmatter` 对象，用于从 YAML frontmatter 中提取标签。

**输出格式:**
从版本 1.5.3 开始，Timeline 的输出格式已更新为更加结构化的格式：

```
%% blp-timeline-start data-hash="..." %%
[[文件路径1]]

![[文件路径1#标题1]]

![[文件路径1#标题2]]

---
[[文件路径2]]

![[文件路径2#标题1]]
%% blp-timeline-end %%
```

新格式的特点：
- 每个文件有一个普通链接作为入口
- 文件之间用 `---` 分隔
- 每个内容行之间有空行
- 用户对嵌入链接的自定义修改会被保留

**调试模式:**
为了帮助排查问题，您可以在时间线配置中添加 `debug: true`，查看查询过程的详细信息：

```yaml
debug: true
source_folders: ["日记"]
heading_level: 4
```

这将显示一个包含解析配置、解析筛选器、查询结果和筛选统计信息的 JSON 输出。

## 更新日志

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

Block Link Plus is released under GNU GPLv3 (License).

## Thanks

Block Link Plus 是我第一个 obsidian 插件,开发过程中参考了大量已有的插件,感谢这些开源项目.
- [copy-block-link](https://github.com/mgmeyers/obsidian-copy-block-link/tree/main)
- [Text Transporter](https://tfthacker.com/transporter)
- [rendered-block-link-suggestions](https://github.com/RyotaUshio/obsidian-rendered-block-link-suggestions)
- [linkify](https://github.com/matthewhchan/linkify)