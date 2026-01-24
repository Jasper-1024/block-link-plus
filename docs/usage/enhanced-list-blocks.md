# Enhanced List Blocks

将 Obsidian 的 list item 当作“最小 block 单元”：自动补齐隐藏的系统行（`[date:: ...] ^id`），并提供 `blp-view`（Query/View）用于筛选、分组与渲染。

## 启用范围（默认关闭）

Enhanced List Blocks 默认不启用，仅在以下任一条件满足时对文件生效：
- 位于设置中配置的“启用文件夹/启用文件”范围内
- 文件 frontmatter 含 `blp_enhanced_list: true`

## 系统行（自动生成 + 隐藏）

在启用文件内，Live Preview 下当你创建“下一条” list item（例如按 Enter）时，插件会确保上一条 list item 拥有系统行：

```markdown
- 一条日志内容
  [date:: 2026-01-11T14:30:25] ^abcd
```

- 系统行默认会在 Live Preview + Reading mode 下隐藏（可在设置中关闭隐藏，用于调试）。
- 系统行会被放在父项正文之后、任何子列表之前（避免 `^id` 关联到子项）。

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
