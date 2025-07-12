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
- **enable_right_click_editable_embed** - 啟用可編輯嵌入選單
- **enable_right_click_url** - 啟用 URI 連結選單

### 通知設定
- **enable_block_notification** - 複製塊連結時顯示通知
- **enable_embed_notification** - 複製嵌入連結時顯示通知
- **enable_editable_embed_notification** - 複製可編輯嵌入時顯示通知
- **enable_url_notification** - 複製 URI 時顯示通知

### 別名設定
- **alias_type** - 別名類型 (0=無, 1=前 X 字元, 2=標題, 3=選取文字)
- **alias_length** - 別名長度 (1-100)

## 塊 ID

- **enable_prefix** - 啟用自訂前綴
- **id_prefix** - 塊 ID 前綴
- **id_length** - 塊 ID 長度 (3-7)
- **heading_id_newline** - 標題塊 ID 換行 (實驗性)

## 時間章節

- **enable_time_section** - 啟用時間章節功能
- **enable_time_section_in_menu** - 在右鍵選單中顯示
- **time_section_format** - 時間格式 (如 "HH:mm")
- **time_section_title_pattern** - 標題比對模式
- **time_section_plain_style** - 預覽中使用純文字樣式
- **insert_heading_level** - 啟用自動標題層級
- **daily_note_pattern** - 日記檔案名稱模式
- **daily_note_heading_level** - 日記中的標題層級 (1-6)

## 時間線

- **enableTimeline** - 啟用時間線功能
- **timelineDefaultHeadingLevel** - 預設標題層級 (1-6)
- **timelineDefaultEmbedFormat** - 預設嵌入格式 ('!![[]]' 或 '![[]]')
- **timelineDefaultSortOrder** - 預設排序 ('asc' 或 'desc')

## 流式編輯器

- **editorFlow** - 啟用嵌入塊編輯
- **editorFlowStyle** - 編輯樣式 ("minimal" 或 "seamless")

## 預設值

```json
{
  "mult_line_handle": 0,
  "alias_type": 0,
  "alias_length": 20,
  "enable_prefix": false,
  "id_prefix": "",
  "id_length": 4,
  "enable_time_section": true,
  "time_section_format": "HH:mm",
  "daily_note_heading_level": 2,
  "enableTimeline": true,
  "timelineDefaultHeadingLevel": 4,
  "editorFlow": true,
  "editorFlowStyle": "minimal"
}
```