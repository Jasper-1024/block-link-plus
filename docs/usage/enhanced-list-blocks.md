# Enhanced List Blocks

将 Obsidian 的 list item 当作“最小 block 单元”：自动补齐隐藏的系统行（`[date:: ...] ^id`），并提供 `blp-view`（Query/View）用于筛选、分组与渲染。

## 启用范围（默认关闭）

Enhanced List Blocks 默认不启用，仅在以下任一条件满足时对文件生效：
- 位于设置中配置的“启用文件夹/启用文件”范围内（路径为 vault 内部路径；文件夹匹配递归；建议用 Obsidian 右键 Copy path 获取）
- 文件 frontmatter 含 `blp_enhanced_list: true`

## 系统行（自动生成 + 隐藏）

在启用文件内，Live Preview 下当你创建“下一条” list item（例如按 Enter）时，插件会确保上一条 list item 拥有系统行：

```markdown
- 一条日志内容
  [date:: 2026-01-11T14:30:25] ^abcd
```

- 系统行默认会在 Live Preview + Reading mode 下隐藏（可在设置中关闭隐藏，用于调试）。
- 系统行会被放在父项正文之后、任何子列表之前（避免 `^id` 关联到子项）。
- 删除 list item 时，插件会清理该 list item 的系统行，避免留下“孤儿系统行”。

### 列表手柄（可选）

若希望更容易发现拖拽/折叠交互，可在设置中开启：
- Enhanced List Blocks → “显示列表手柄”

开启后，Live Preview 下无序列表的 marker 会显示为把手（仅对启用文件生效）。

### 列表手柄动作（可选）

若希望把手更接近 Logseq 的 block handle 行为，可在设置中开启：
- Enhanced List Blocks → “启用列表手柄动作”

开启后（仅启用文件 + Live Preview）：
- 左键点击无序列表把手：执行已配置的动作（默认：切换折叠；需 Obsidian 设置开启“Fold indent”）。
- 右键点击无序列表把手：始终打开把手菜单（切换折叠、复制块链接/嵌入；若 Zoom 可用则显示缩放相关动作）。

可在设置中调整左键行为：
- Enhanced List Blocks → “手柄左键动作”

### 删除行为（可选）

默认情况下（不删除子项）：当你删除父 list item（例如删除 `-`/`1.` 等 marker 或剪切整行）时，插件只会删除系统行，子列表内容会保留。

如果你希望更接近 Logseq/Roam 的 outliner 行为（删父即删子树），可在设置中开启：
- Enhanced List Blocks → “删除列表项时删除子项”

## blp-view（Query/View）

`blp-view` 需要 Dataview 插件。

### blp-view 护栏设置（可选）

在设置页的 Enhanced List Blocks 区域中，可配置 `blp-view` 相关护栏（仅在 Dataview 可用时显示）：
- 允许/禁用 `render.mode: materialize` 写回
- 最大扫描文件数（`0` 表示不限制）
- 最大输出结果数（`0` 表示不限制；超过会截断并提示）
- 显示诊断信息（扫描数量/匹配数量/耗时）

### 示例：最近 7 天且链接到当前文件

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

### 示例：表格视图（按标签筛选）

````markdown
```blp-view
filters:
  tags:
    any: ["#项目/A"]
render:
  type: table
  columns:
    - name: File
      expr: file.link
    - name: Date
      field: date
    - name: Text
      field: text
```
````

## 列表操作（缩进/拖拽/缩放）

列表操作不在 Enhanced List Blocks 范围内；本插件提供可选的内置模块：
- Built-in Outliner（`obsidian-outliner@4.9.0`）
- Built-in Zoom（`obsidian-zoom@1.1.2`）

在设置中启用即可生效；若检测到外置同名插件启用，内置模块会自动禁用以避免冲突。

你也可以将内置列表样式/交互限定到 Enhanced List 启用文件：
- Built-in Plugins (vslinko) → “将内置列表交互限定到 Enhanced List”
