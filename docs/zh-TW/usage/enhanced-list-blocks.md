# Enhanced List Blocks

將 Obsidian 的 list item 當作「最小 block 單元」：自動補齊隱藏的系統行（`[date:: ...] ^id`），並提供 `blp-view`（Query/View）用於篩選、分組與渲染。

## 啟用範圍（預設關閉）

Enhanced List Blocks 預設不啟用，僅在符合以下任一條件時對檔案生效：
- 位於設定中配置的「啟用資料夾/啟用檔案」範圍內
- 檔案 frontmatter 含 `blp_enhanced_list: true`

## 系統行（自動產生 + 隱藏）

在啟用檔案內，Live Preview 下當你建立「下一條」 list item（例如按 Enter）時，外掛會確保上一條 list item 擁有系統行：

```markdown
- 一條日誌內容
  [date:: 2026-01-11T14:30:25] ^abcd
```

- 系統行預設會在 Live Preview + Reading mode 下隱藏（可在設定中關閉隱藏，用於除錯）。
- 系統行會放在父項正文之後、任何子列表之前（避免 `^id` 關聯到子項）。

## blp-view（Query/View）

`blp-view` 需要 Dataview 外掛。

### blp-view 護欄設定（可選）

在設定頁的 Enhanced List Blocks 區域中，可設定 `blp-view` 相關護欄（僅在 Dataview 可用時顯示）：
- 允許/停用 `render.mode: materialize` 寫回
- 最大掃描檔案數（`0` 表示不限制）
- 最大輸出結果數（`0` 表示不限制；超過會截斷並提示）
- 顯示診斷資訊（掃描數量/匹配數量/耗時）

### 範例：最近 7 天且連結到目前檔案

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

### 範例：表格檢視（按標籤篩選）

````markdown
```blp-view
filters:
  tags:
    any: ["#專案/A"]
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

## 列表操作（縮排/拖曳/縮放）

列表操作不在 Enhanced List Blocks 範圍內；本外掛提供可選的內建模組：
- Built-in Outliner（`obsidian-outliner@4.9.0`）
- Built-in Zoom（`obsidian-zoom@1.1.2`）

在設定中啟用即可生效；若偵測到外置同名外掛啟用，內建模組會自動停用以避免衝突。
