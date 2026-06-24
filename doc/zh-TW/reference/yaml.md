# blp-view YAML

`blp-view` 是一個 Markdown 程式碼區塊（需要 Dataview 外掛），用於對 Outliner 啟用範圍內的列表塊（list blocks）進行篩選、分組、排序與渲染。

!!! note "範圍護欄"
    `blp-view` 只能掃描 Outliner 啟用範圍內的檔案。如果 `source` 指向了未啟用檔案，會直接報錯。  
    最簡單的做法是：不寫 `source`，直接掃描全部啟用檔案。

## 最小範例

````markdown
```blp-view
filters:
  date:
    within_days: 7
render:
  type: embed-list
```
````

## 配置結構

`blp-view` 的 YAML 頂層結構：

- `source`（可選）
- `filters`（可選）
- `group`（可選）
- `sort`（可選）
- `render`（可選）

## source（可選）

不寫 `source` 時，預設掃描**所有 Outliner 啟用範圍內的 Markdown 檔案**。

```yaml
source:
  folders: ["日記", "Projects/A"]
  files: ["Daily/2026-02-14.md", "[[Inbox]]"]
  dv: '"日記"' # Dataview source 字串（與 folders/files 二選一）
```

- `folders: string[]`：vault 相對路徑；遞迴匹配該資料夾下的 `.md`
- `files: string[]`：vault 相對路徑；也可寫 `[[...]]` 或檔案 basename（若有重名會報錯，建議寫完整路徑）
- `dv: string`：Dataview source 字串（內部使用 `dv.pages(source.dv, 目前檔案路徑)`）；**不可與** `folders/files` 同時使用

## filters（可選）

### filters.date

基於系統欄位 `date`（ISO 時間戳）過濾：

```yaml
filters:
  date:
    within_days: 7
    after: "2026-02-01"
    before: "2026-03-01"
    between: ["2026-02-01", "2026-03-01"]
```

- `within_days: number`：最近 N 天
- `after: string` / `before: string`：Dataview 可解析的日期字串
- `between`：可寫陣列 `["after", "before"]`，也可寫物件 `{ after, before }`

### filters.fields

按欄位表達式過濾（多個條件為 AND）：

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

- `op` 支援：`has`、`=`、`!=`、`>`、`>=`、`<`、`<=`、`in`、`contains`
  - `has`：判斷欄位是否為 truthy
  - `in`：`value` 需為陣列（表示「屬於其中任意一個」）
  - `contains`：字串為包含；陣列為包含某元素

### filters.tags

按標籤過濾（會自動把 `專案/A` 規範化為 `#專案/A`）：

```yaml
filters:
  tags:
    any: ["#專案/A", "日誌"]
    none_in_ancestors: ["#忽略"]
```

- `any`：命中任意一個標籤
- `all`：需要同時命中所有標籤
- `none`：不能命中任意一個標籤
- `none_in_ancestors`：祖先塊（父/祖父…）的 tags 不能包含這些標籤

### filters.outlinks

按外連結（outlinks）過濾：

```yaml
filters:
  outlinks:
    any: ["[[專案A]]", "People/張三.md"]
    link_to_current_file: true
```

- `any` / `all` / `none`：外連結集合匹配（輸入支援 `[[...]]`、路徑、basename；會做 best-effort 解析與 basename 相容）
- `link_to_current_file: true`：要求該塊連結到了目前檔案

### filters.section

按 Dataview 的 `item.section`（所在 heading 區段）過濾：

```yaml
filters:
  section:
    any: ["Log", "實驗記錄"]
```

### filters.hierarchy

控制巢狀清單項命中時是否「去重」：

- `all`（預設）：保留所有命中項
- `outermost-match`：若某個塊命中，則其子塊即使也命中，也會被抑制（只保留最外層命中）
- `root-only`：只保留根塊（沒有父塊）

## group（可選）

```yaml
group:
  by: day(date) # none | day(date) | file | field
  field: topic  # by=field 時必填
```

## sort（可選）

```yaml
sort:
  by: date      # date | file.path | line
  order: desc   # asc | desc
```

## render（可選）

```yaml
render:
  type: embed-list # embed-list | table
```

### render.type = embed-list

輸出形如 `![[path#^blockId]]` 的嵌入列表，並按 `group` 分組插入小標題。

### render.type = table

表格渲染需要配置欄位：

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

- 每一欄必須指定 `field` 或 `expr`（二選一）
- `expr` 使用 Dataview 表達式求值；上下文中包含目前 list item 的欄位，以及 `file`（包含 `file.link` 等）

### render.mode = materialize（寫回）

```yaml
render:
  mode: materialize
  type: table
```

當啟用 `materialize` 時，`blp-view` 會把渲染結果寫回目前檔案，在程式碼區塊下方維護一個受控區域：

```text
%% blp-view-start data-hash="..." %%
... materialized markdown ...
%% blp-view-end %%
```

注意：

- 受設定項 **blpViewAllowMaterialize** 控制；若被停用會報錯
- 目前檔案本身必須處於 Outliner 啟用範圍內，否則會報錯

