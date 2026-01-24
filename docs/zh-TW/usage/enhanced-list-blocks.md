# Enhanced List Blocks

將 Obsidian 的 list item 當作「最小 block 單元」：自動補齊隱藏的系統行（`[date:: ...] ^id`），並提供 `blp-view`（Query/View）用於篩選、分組與渲染。

## 啟用範圍（預設關閉）

Enhanced List Blocks 預設不啟用，僅在符合以下任一條件時對檔案生效：
- 位於設定中配置的「啟用資料夾/啟用檔案」範圍內（vault 內部路徑；資料夾匹配遞迴；建議用 Obsidian 右鍵 Copy path 取得）
- 檔案 frontmatter 含 `blp_enhanced_list: true`

## 系統行（自動產生 + 隱藏）

在啟用檔案內，Live Preview 下當你建立「下一條」 list item（例如按 Enter）時，外掛會確保上一條 list item 擁有系統行：

```markdown
- 一條日誌內容
  [date:: 2026-01-11T14:30:25] ^abcd
```

- 系統行預設會在 Live Preview + Reading mode 下隱藏（可在設定中關閉隱藏，用於除錯）。
- 系統行會放在父項正文之後、任何子列表之前（避免 `^id` 關聯到子項）。
- 刪除 list item 時，外掛會清理該 list item 的系統行，避免留下「孤兒系統行」。

### 清單把手（可選）

若希望更容易發現拖曳/折疊互動，可在設定中開啟：
- Enhanced List Blocks →「顯示列表把手」

啟用後，Live Preview 下無序清單的 marker 會顯示為把手（僅對啟用檔案生效）。

### 清單把手動作（可選）

若希望把手更接近 Logseq 的 block handle 行為，可在設定中開啟：
- Enhanced List Blocks →「啟用列表把手動作」

啟用後（僅啟用檔案 + Live Preview）：
- 左鍵點擊無序清單把手：執行已設定的動作（預設：切換折疊；需 Obsidian 設定開啟「Fold indent」）。
- 右鍵點擊無序清單把手：一律開啟把手選單（切換折疊、複製區塊連結/嵌入；若 Zoom 可用則顯示縮放相關動作）。

可在設定中調整左鍵行為：
- Enhanced List Blocks →「把手左鍵動作」

### 刪除行為（可選）

預設情況（不刪除子項）：當你刪除父 list item（例如刪除 `-`/`1.` 等 marker 或剪下整行）時，外掛只會刪除系統行，子列表內容會保留。

若你希望更接近 Logseq/Roam 的 outliner 行為（刪父即刪子樹），可在設定中開啟：
- Enhanced List Blocks →「刪除列表項時刪除子項」

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

你也可以將內建列表樣式/互動限定到 Enhanced List 啟用檔案：
- Built-in Plugins (vslinko) →「將內建列表互動限定到 Enhanced List」
