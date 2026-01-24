# 設定參考

所有設定選項的詳細說明。

## 多行塊行為

**mult_line_handle**
- `0` - 預設處理
- `1` - 新增新標題
- `2` - 新增多個塊
- `3` - 新增多行塊

## 塊連結

### 右鍵選單
- **enable_right_click_block** - 啟用常規塊連結選單
- **enable_right_click_embed** - 啟用嵌入連結選單
- **enable_right_click_url** - 啟用 URI 連結選單

### 通知設定
- **enable_block_notification** - 複製塊連結時顯示通知
- **enable_embed_notification** - 複製嵌入連結時顯示通知
- **enable_url_notification** - 複製 URI 時顯示通知

### 別名設定
- **alias_type** - 別名類型 (0=無, 1=前 X 字元, 2=標題, 3=選取文字)
- **alias_length** - 別名長度 (1-100)

## 塊 ID

- **enable_prefix** - 啟用自訂前綴
- **id_prefix** - 塊 ID 前綴
- **id_length** - 塊 ID 長度 (3-7)
- **heading_id_newline** - 標題塊 ID 換行 (實驗性)

## Enhanced List Blocks

- **enhancedListEnabledFolders** - 啟用的資料夾清單（vault 相對路徑）
- **enhancedListEnabledFiles** - 啟用的檔案清單（vault 相對路徑）
- **enhancedListHideSystemLine** - 在 Live Preview/Reading mode 隱藏系統行
- **enhancedListHandleAffordance** - 顯示列表把手（僅 Live Preview + 啟用檔案）
- **enhancedListHandleActions** - 啟用列表把手動作（僅 Live Preview + 啟用檔案）
- **enhancedListDeleteSubtreeOnListItemDelete** - 刪除列表項時是否連帶刪除子項

## Built-in Outliner / Zoom

- **builtInObsidianOutlinerEnabled** - 啟用內建 Outliner（vendored `obsidian-outliner@4.9.0`）
- **builtInObsidianOutlinerSettings** - 內建 Outliner 的設定物件（保持與上游一致）
- **builtInObsidianZoomEnabled** - 啟用內建 Zoom（vendored `obsidian-zoom@1.1.2`）
- **builtInObsidianZoomSettings** - 內建 Zoom 的設定物件（保持與上游一致）

## 內嵌編輯 (Inline Edit)

- **inlineEditEnabled** - 內嵌編輯總開關
- **inlineEditFile** - 允許 `![[file]]` 在 Live Preview 中可編輯
- **inlineEditHeading** - 允許 `![[file#Heading]]` 在 Live Preview 中可編輯
- **inlineEditBlock** - 允許 `![[file#^id]]` / `![[file#^id-id]]` 在 Live Preview 中可編輯

## 預設值

```json
{
  "mult_line_handle": 0,
  "alias_type": 0,
  "alias_length": 20,
  "enable_right_click_block": true,
  "enable_right_click_embed": true,
  "enable_right_click_url": false,
  "enable_prefix": false,
  "id_prefix": "",
  "id_length": 4,
  "heading_id_newline": false,
  "enable_block_notification": true,
  "enable_embed_notification": true,
  "enable_url_notification": true,
  "enhancedListEnabledFolders": [],
  "enhancedListEnabledFiles": [],
  "enhancedListHideSystemLine": true,
  "enhancedListHandleAffordance": true,
  "enhancedListHandleActions": true,
  "enhancedListDeleteSubtreeOnListItemDelete": false,
  "builtInObsidianOutlinerEnabled": false,
  "builtInObsidianOutlinerSettings": {
    "styleLists": true,
    "debug": false,
    "stickCursor": "bullet-and-checkbox",
    "betterEnter": true,
    "betterVimO": true,
    "betterTab": true,
    "selectAll": true,
    "listLines": false,
    "listLineAction": "toggle-folding",
    "dnd": true,
    "previousRelease": null
  },
  "builtInObsidianZoomEnabled": false,
  "builtInObsidianZoomSettings": {
    "debug": false,
    "zoomOnClick": true,
    "zoomOnClickMobile": false
  },
  "inlineEditEnabled": true,
  "inlineEditFile": false,
  "inlineEditHeading": true,
  "inlineEditBlock": true
}
```
