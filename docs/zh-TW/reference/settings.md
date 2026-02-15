# 設定參考

這裡彙整 Block Link Plus 2.0 的主要設定項（以程式碼實作為準）。

## 設定頁導覽（Tabs + 搜尋）

Block Link Plus 的設定頁提供 Tabs 分組與跨 Tab 搜尋：

- Tabs：`基礎` / `Outliner`
- 搜尋：在頂部輸入關鍵字（如 `outliner` / `blp-view` / `zoom`）即可跨 Tab 篩選設定項；點擊 Tab 或按 `Esc` 退出搜尋模式

## 基礎（Basics）

### 多行塊

**mult_line_handle**

- `0` - 預設處理（多行選取區視為一個塊）
- `1` - 新增新標題（用特殊標記的 heading 包住選取區）
- `2` - 新增多個塊（按段落/清單項等批次產生多個 `^id`）
- `3` - 新增多行塊（範圍塊：`^id-id`，如 `^abc123-abc123`）

### 塊連結（Block Link）

- **enable_right_click_block** - 啟用右鍵選單：Copy Block Link
- **enable_block_notification** - 複製塊連結後顯示通知
- **alias_type** - 別名類型（0=無，1=前 X 字元，2=父標題，3=選取文字）
- **alias_length** - 別名長度（1-100）
- **heading_id_newline** - 標題塊 ID 換行（實驗性）

### 嵌入連結（Embed Link）

- **enable_right_click_embed** - 啟用右鍵選單：Copy Block as Embed
- **enable_embed_notification** - 複製嵌入連結後顯示通知

### Obsidian URI

- **enable_right_click_url** - 啟用右鍵選單：Copy Block as Obsidian URI
- **enable_url_notification** - 複製 URI 後顯示通知

### 塊 ID（Block ID）

- **id_length** - 隨機 ID 長度（3-7；預設 4）
- **enable_prefix** - 啟用自訂前綴
- **id_prefix** - 塊 ID 前綴（最終形如 `prefix-rand`）

### 內嵌編輯（Inline Edit）

- **inlineEditEnabled** - 內嵌編輯總開關
- **inlineEditFile** - 允許 `![[file]]` 在 Live Preview 中可編輯
- **inlineEditHeading** - 允許 `![[file#Heading]]` 在 Live Preview 中可編輯
- **inlineEditBlock** - 允許 `![[file#^id]]` / `![[file#^id-id]]` 在 Live Preview 中可編輯

## Outliner

### 總開關

- **fileOutlinerViewEnabled** - 啟用 Outliner 路由：啟用後，範圍內檔案預設用 Outliner 視圖開啟

### 啟用範圍

- **fileOutlinerEnabledFolders** - 啟用資料夾清單（vault 相對路徑；遞迴匹配）
- **fileOutlinerEnabledFiles** - 啟用檔案清單（vault 相對路徑）
- **frontmatter 覆蓋** - 每檔案：`blp_outliner: true/false`

### 顯示與互動

- **fileOutlinerHideSystemLine** - 在閱讀模式隱藏帶 `[blp_sys:: 1]` 的協議尾行
- **fileOutlinerEmphasisLineEnabled** - 強調目前塊左側連接線
- **fileOutlinerDragAndDropEnabled** - 拖曳圓點移動塊子樹
- **fileOutlinerZoomEnabled** - 點擊圓點 Zoom 進入塊子樹

### 編輯行為

- **fileOutlinerChildrenOnSplit** - Enter 拆分塊時子塊處理（`keep` | `move`）
- **fileOutlinerPasteMultiline** - 貼上多行文字（`split` | `multiline`）
- **fileOutlinerBackspaceWithChildren** - 行首 Backspace（且有子塊）（`merge` | `outdent`）

### 編輯器右鍵選單（進階）

- **fileOutlinerEditorContextMenuEnabled** - 在 Outliner 編輯模式中使用 BLP 的右鍵選單
- **fileOutlinerEditorContextMenuAllowedPlugins** - 允許向該選單注入項目的外掛 ID 白名單（新增 `core` 以包含核心選單項）

### 編輯器快捷鍵/命令（進階）

- **fileOutlinerEditorCommandBridgeEnabled** - Outliner 編輯區塊時啟用編輯器命令橋接（讓 Ctrl+B 等 core 快捷鍵、白名單外掛的編輯器命令生效）
- **fileOutlinerEditorCommandAllowedPlugins** - 允許在 Outliner 中執行編輯器命令的外掛 ID 白名單（加入 `core` 以包含 core 編輯器命令）

### 除錯

- **fileOutlinerDebugLogging** - 將 Outliner 內部錯誤輸出到 DevTools console

## blp-view（Query/View）護欄

- **blpViewAllowMaterialize** - 允許 `render.mode: materialize` 寫回
- **blpViewMaxSourceFiles** - 最大掃描檔案數（`0` = 不限制）
- **blpViewMaxResults** - 最大輸出結果數（`0` = 不限制）
- **blpViewShowDiagnostics** - 輸出下方顯示診斷資訊（計數 + 耗時）

## 預設值

```json
{
  "mult_line_handle": 0,
  "alias_type": 0,
  "enable_right_click_block": true,
  "enable_right_click_embed": true,
  "enable_right_click_url": false,
  "alias_length": 20,
  "enable_prefix": false,
  "id_prefix": "",
  "id_length": 4,
  "heading_id_newline": false,
  "enable_block_notification": true,
  "enable_embed_notification": true,
  "enable_url_notification": true,

  "fileOutlinerEnabledFolders": [],
  "fileOutlinerEnabledFiles": [],
  "fileOutlinerHideSystemLine": true,
  "fileOutlinerViewEnabled": true,
  "fileOutlinerDragAndDropEnabled": true,
  "fileOutlinerZoomEnabled": true,
  "fileOutlinerEmphasisLineEnabled": true,
  "fileOutlinerDebugLogging": false,
  "fileOutlinerChildrenOnSplit": "keep",
  "fileOutlinerPasteMultiline": "split",
  "fileOutlinerBackspaceWithChildren": "merge",
  "fileOutlinerEditorContextMenuEnabled": true,
  "fileOutlinerEditorContextMenuAllowedPlugins": [],
  "fileOutlinerEditorCommandBridgeEnabled": true,
  "fileOutlinerEditorCommandAllowedPlugins": [
    "core"
  ],

  "blpViewAllowMaterialize": true,
  "blpViewMaxSourceFiles": 0,
  "blpViewMaxResults": 0,
  "blpViewShowDiagnostics": false,

  "inlineEditEnabled": true,
  "inlineEditFile": false,
  "inlineEditHeading": true,
  "inlineEditBlock": true,

  "lastSeenVersion": ""
}
```

