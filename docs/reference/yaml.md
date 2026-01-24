# YAML配置

`blp-view` 代码块的 YAML 配置参考（需要 Dataview 插件）。

## 基础结构

````markdown
```blp-view
source:
  folders:
    - "日记"
filters:
  date:
    within_days: 7
render:
  type: embed-list
```
````

## 配置选项

### source

- `folders`: `string[]`（按文件夹）
- `files`: `string[]`（按文件）
- `dv`: `string`（Dataview source 字符串；不可与 `folders/files` 同时使用）

### filters

- `date`: `within_days | after | before | between`
- `fields`: `{ field, op, value }[]`
- `tags`: `any | all | none | none_in_ancestors`
- `outlinks`: `any | all | none | link_to_current_file`
- `section`: `any | all | none`

### group

- `by`: `none | day(date) | file | field`
- `field`: 当 `by: field` 时必填

### sort

- `by`: `date | file.path | line`
- `order`: `asc | desc`

### render

- `type`: `embed-list | table`
- `mode`: `materialize`（可选：写回受控区域；可在设置中禁用写回）
- `columns`: table 列定义（`{ name, field? , expr? }`）

## 示例

### 最近 30 天、链接到项目A

````markdown
```blp-view
source:
  folders: ["日记/2024-01"]
filters:
  date:
    within_days: 30
  outlinks:
    any: ["[[项目A]]"]
group:
  by: day(date)
render:
  type: embed-list
```
````

### 物化写回（materialize）

````markdown
```blp-view
render:
  mode: materialize
  type: table
```
````
