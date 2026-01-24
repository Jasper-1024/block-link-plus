# YAML 配置

`blp-view` 程式碼區塊的 YAML 設定參考（需要 Dataview 外掛）。

## 基礎結構

````markdown
```blp-view
source:
  folders:
    - "日記"
filters:
  date:
    within_days: 7
render:
  type: embed-list
```
````

## 設定選項

### source

- `folders`: `string[]`（按資料夾）
- `files`: `string[]`（按檔案）
- `dv`: `string`（Dataview source 字串；不可與 `folders/files` 同時使用）

### filters

- `date`: `within_days | after | before | between`
- `fields`: `{ field, op, value }[]`
- `tags`: `any | all | none | none_in_ancestors`
- `outlinks`: `any | all | none | link_to_current_file`
- `section`: `any | all | none`

### group

- `by`: `none | day(date) | file | field`
- `field`: 當 `by: field` 時必填

### sort

- `by`: `date | file.path | line`
- `order`: `asc | desc`

### render

- `type`: `embed-list | table`
- `mode`: `materialize`（可選：寫回受控區域）
- `columns`: table 欄位定義（`{ name, field? , expr? }`）

## 範例

### 最近 30 天、連結到專案A

````markdown
```blp-view
source:
  folders: ["日記/2024-01"]
filters:
  date:
    within_days: 30
  outlinks:
    any: ["[[專案A]]"]
group:
  by: day(date)
render:
  type: embed-list
```
````

### 物化寫回（materialize）

````markdown
```blp-view
render:
  mode: materialize
  type: table
```
````
