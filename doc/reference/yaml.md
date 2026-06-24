# blp-view YAML 配置

`blp-view` 是一个 Markdown 代码块（需要 Dataview 插件），用于对 Outliner 启用范围内的列表块（list blocks）进行筛选、分组、排序与渲染。

!!! note "范围护栏"
    `blp-view` 只能扫描 Outliner 启用范围内的文件。如果 `source` 指向了未启用文件，会直接报错。最简单的做法是：不写 `source`，直接扫描全部启用文件。

## 最小示例

````markdown
```blp-view
filters:
  date:
    within_days: 7
render:
  type: embed-list
```
````

## 配置结构

`blp-view` 的 YAML 顶层结构：

- `source`（可选）
- `filters`（可选）
- `group`（可选）
- `sort`（可选）
- `render`（可选）

## source（可选）

不写 `source` 时，默认扫描**所有 Outliner 启用范围内的 Markdown 文件**。

```yaml
source:
  folders: ["日记", "Projects/A"]
  files: ["Daily/2026-02-14.md", "[[Inbox]]"]
  dv: '"日记"' # Dataview source 字符串（与 folders/files 二选一）
```

- `folders: string[]`：vault 相对路径；递归匹配该文件夹下的 `.md`
- `files: string[]`：vault 相对路径；也可写 `[[...]]` 或文件 basename（若有重名会报错，建议写完整路径）
- `dv: string`：Dataview source 字符串（内部使用 `dv.pages(source.dv, 当前文件路径)`）；**不可与** `folders/files` 同时使用

## filters（可选）

### filters.date

基于系统字段 `date`（ISO 时间戳）过滤：

```yaml
filters:
  date:
    within_days: 7
    after: "2026-02-01"
    before: "2026-03-01"
    between: ["2026-02-01", "2026-03-01"]
```

- `within_days: number`：最近 N 天
- `after: string` / `before: string`：Dataview 可解析的日期字符串
- `between`：可写数组 `["after", "before"]`，也可写对象 `{ after, before }`

### filters.fields

按字段表达式过滤（多个条件为 AND）：

```yaml
filters:
  fields:
    - field: topic
      op: contains
      value: linux
    - field: priority
      op: ">="
      value: 3
```

- `op` 支持：`has`、`=`、`!=`、`>`、`>=`、`<`、`<=`、`in`、`contains`
  - `has`：判断字段是否为 truthy
  - `in`：`value` 需为数组（表示“属于其中任意一个”）
  - `contains`：字符串为包含；数组为包含某元素

### filters.tags

按标签过滤（会自动把 `项目/A` 规范化为 `#项目/A`）：

```yaml
filters:
  tags:
    any: ["#项目/A", "日志"]
    none_in_ancestors: ["#忽略"]
```

- `any`：命中任意一个标签
- `all`：需要同时命中所有标签
- `none`：不能命中任意一个标签
- `none_in_ancestors`：祖先块（父/祖父…）的 tags 不能包含这些标签

### filters.outlinks

按外链过滤：

```yaml
filters:
  outlinks:
    any: ["[[项目A]]", "People/张三.md"]
    link_to_current_file: true
```

- `any` / `all` / `none`：外链集合匹配（输入支持 `[[...]]`、路径、basename；会做 best-effort 解析与 basename 兼容）
- `link_to_current_file: true`：要求该块链接到了当前文件

### filters.section

按 Dataview 的 `item.section`（所在 heading）过滤：

```yaml
filters:
  section:
    any: ["Log", "实验记录"]
```

- `any`（或 `all`）：section 名称命中列表中的任意一个
- `none`：section 名称不能命中列表中的任意一个

### filters.hierarchy

控制嵌套列表项命中时是否“去重”：

- `all`（默认）：保留所有命中项
- `outermost-match`：若某个块命中，则其子块即使也命中，也会被抑制（只保留最外层命中）
- `root-only`：只保留根块（没有父块）

## group（可选）

```yaml
group:
  by: day(date) # none | day(date) | file | field
  field: topic  # by=field 时必填
```

## sort（可选）

```yaml
sort:
  by: date      # date | file.path | line
  order: desc   # asc | desc
```

## render（可选）

```yaml
render:
  type: embed-list # embed-list | table
```

### render.type = embed-list

输出形如 `![[path#^blockId]]` 的嵌入列表，并按 `group` 分组插入小标题。

### render.type = table

表格渲染需要配置列：

```yaml
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

- 每一列必须指定 `field` 或 `expr`（二选一）
- `expr` 使用 Dataview 表达式求值；上下文中包含当前 list item 的字段，以及 `file`（包含 `file.link` 等）

### render.mode = materialize（写回）

```yaml
render:
  mode: materialize
  type: table
```

当启用 `materialize` 时，`blp-view` 会把渲染结果写回当前文件，在代码块下方维护一个受控区域：

```text
%% blp-view-start data-hash="..." %%
... materialized markdown ...
%% blp-view-end %%
```

注意：

- 受设置项 **blpViewAllowMaterialize** 控制；若被禁用会报错
- 当前文件本身必须处于 Outliner 启用范围内，否则会报错

