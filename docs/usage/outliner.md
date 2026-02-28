# Outliner

Outliner 是 Block Link Plus 2.0 的主线能力：在**启用范围**内，把每个 list item 当作一个 block 来编辑（类 Logseq），并在磁盘上维护一条“协议尾行”（Dataview inline fields + `^id`），从而实现：

- 每个列表块都能稳定引用：`[[file#^id]]` / `![[file#^id]]`
- `blp-view`（Query/View）可以基于 Dataview 对这些块做筛选/分组/渲染（需要 Dataview 插件）

!!! danger "重要：只建议在「专用文件 / 专用文件夹」内启用"
    Outliner 是强 opt-in 的工作流：当文件以 Outliner 视图打开时，插件会把正文规范化为“列表块（list blocks）”结构，并在需要时写回文件。  
    这意味着：**非列表内容（段落、标题、引用等）可能会被忽略并在写回时丢失**。请务必先备份，或仅在新建/专用的 list-first 笔记中启用。

    Outliner 也会规范化格式（例如：缩进统一为 2 空格、列表符号统一为 `-`）。

    一个推荐的“list-first”结构示例：

    ```markdown
    - 2026-02-14
      - Log
        - 09:30 ... 
        - 14:00 ...
    ```

## 启用范围（默认关闭）

Outliner 默认不对任何文件生效。你可以通过以下方式启用：

- **设置启用范围**：设置 → Block Link Plus → `Outliner` → 配置“启用文件夹/启用文件”（vault 相对路径；文件夹递归匹配；建议用 Obsidian 右键 Copy path 获取）
- **单文件 frontmatter 覆盖**：
  - `blp_outliner: true` 强制启用
  - `blp_outliner: false` 强制禁用（即使位于启用文件夹内）

启用后，插件会做两件事：

1. **路由打开方式**（可开关）：当“启用 Outliner（`fileOutlinerViewEnabled`）”开启时，范围内文件会默认用 Outliner 视图打开
2. **为 `blp-view` 提供数据范围**：`blp-view` 只能扫描启用范围内的文件（否则会报错）

### 在 Markdown / Outliner 间切换

- 在普通 Markdown 视图：右上角面板菜单（More options）会出现“打开为 Outliner / 在新标签页打开为 Outliner”（仅对启用文件显示）
- 在 Outliner 视图：同样的菜单提供“打开为 Markdown / 在新标签页打开为 Markdown”

## 协议尾行（System Tail Line）

Outliner 会为每个列表块维护一条尾行，用 Dataview inline fields + `^id` 表达：

```markdown
- 一条日志内容
  [date:: 2026-02-14T09:30:25] [updated:: 2026-02-14T09:30:25] [blp_sys:: 1] [blp_ver:: 2] ^abcd
  - 子项（也是一个 block）
    [date:: 2026-02-14T09:31:00] [updated:: 2026-02-14T09:31:00] [blp_sys:: 1] [blp_ver:: 2] ^child
```

- 缩进约定：Outliner 固定以 **2 个空格**为一级缩进（无设置项）。
- `^id`：原生 block id，用于 `[[file#^id]]` 跳转/引用
- `date` / `updated`：创建时间 / 最近修改时间（`blp-view` 常用来做时间过滤与排序）
- `blp_sys` / `blp_ver`：插件协议标记（用于识别/兼容）

你也可以在尾行上附加额外 Dataview 字段（例如 `[topic:: linux]`），插件会尽量保留它们；但以上保留字段由插件维护，可能会被规范化。

### 隐藏尾行（阅读模式）

默认情况下，插件会在**阅读模式**隐藏带 `[blp_sys:: 1]` 的尾行（设置项：`fileOutlinerHideSystemLine`）。如果你需要排查问题，可以临时关闭隐藏，让尾行显示出来。

## 交互与编辑

在 Outliner 视图中，每个 block 的交互主要围绕“圆点（bullet）”：

- 左键点击圆点：Zoom 进入该 block 的子树视图（可在设置中关闭 Zoom）
- 拖拽圆点：在同一文件内移动 block 子树（可在设置中关闭拖拽）
- 右键圆点：打开圆点菜单
  - 复制块引用 / 嵌入 / URI
  - 转为任务 / 转为普通块
  - 复制 / 剪切 / 删除（以 block 子树为单位）
  - 折叠 / 展开
- 左键拖选（编辑态）：单个 block 内选择文本；拖选跨越多个 block 会切换为整块范围选择（仅高亮）
- 整块范围选择后：右键选中 block 可打开圆点菜单（无需对准圆点）

### 任务（Tasks）

任务块在磁盘上使用 Obsidian 原生语法：

- `- [ ] ...`
- `- [x] ...`

在 Outliner 视图里，你可以用命令快速切换：

- `Outliner：切换任务状态`（默认 `Mod+Enter`）
- `Outliner：切换任务标记`（默认 `Mod+Shift+Enter`）

快捷键可在 Obsidian 设置 → 快捷键 中自定义。

### 编辑行为选项

Outliner 提供一些与“块树”相关的编辑行为开关（设置 → `Outliner`）：

- Enter 拆分块时：子块保留在原块 / 移动到新块（`fileOutlinerChildrenOnSplit`）
- 粘贴多行文本：拆分成多个块 / 保留为单块多行（`fileOutlinerPasteMultiline`）
- 行首 Backspace 且有子块：与上一块合并 / 优先 outdent（`fileOutlinerBackspaceWithChildren`）

## 编辑器快捷键/插件命令（高级）

Outliner 的块编辑器采用“最小桥接”模式（独立的 CM6 EditorView）。因此：

- 依赖 **MarkdownView/CM6 注入**来修改编辑行为的插件，通常不会在 Outliner 里生效（我们也不打算兼容这一类）。
- 通过 **Obsidian 命令/快捷键（editorCallback / editorCheckCallback）**工作的插件，可以通过“编辑器命令桥接”在 Outliner 中 best-effort 生效。

相关设置（设置 → Outliner）：

- `fileOutlinerEditorCommandBridgeEnabled` - 是否启用桥接
- `fileOutlinerEditorCommandAllowedPlugins` - 严格白名单（想要 Ctrl+B 等 core 格式化快捷键，请保留 `core`）

## blp-view（Query/View）

`blp-view` 是一个 Markdown 代码块（需要 Dataview 插件）：

- 默认扫描 Outliner **启用范围**内的文件
- 如果 `source` 指向了未启用文件，会直接报错（这是刻意的护栏）

示例：最近 7 天且链接到当前文件

````markdown
```blp-view
filters:
  date:
    within_days: 7
  outlinks:
    link_to_current_file: true
group:
  by: day(date)
sort:
  by: date
  order: desc
render:
  type: embed-list
```
````

更多 YAML 配置请见：[blp-view YAML](../reference/yaml.md)。
