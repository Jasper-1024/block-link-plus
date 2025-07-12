# 命令參考

所有可用命令及其用途。

## 塊連結命令

### Copy Block Link
- **ID**: `copy-link-to-block`
- **功能**: 複製常規塊連結 `[[檔案#^id]]`
- **快速鍵**: 可在設定中自訂

### Copy Block as Embed
- **ID**: `copy-embed-to-block`
- **功能**: 複製嵌入連結 `![[檔案#^id]]`
- **快速鍵**: 可在設定中自訂

### Copy Block as Editable Embed
- **ID**: `copy-editable-embed-to-block`
- **功能**: 複製可編輯嵌入 `!![[檔案#^id]]`
- **快速鍵**: 可在設定中自訂

### Copy Block as Obsidian URI
- **ID**: `copy-url-to-block`
- **功能**: 複製 URI 連結用於外部存取
- **快速鍵**: 可在設定中自訂

## 時間命令

### Insert Time Section
- **ID**: `insert-time-section`
- **功能**: 插入目前時間作為標題
- **快速鍵**: 建議設定為 `Ctrl+T`

## 使用方式

### 命令面板
1. 按 `Ctrl+P` 開啟命令面板
2. 搜尋命令名稱
3. 回車執行

### 快速鍵
1. 進入設定 → 快速鍵
2. 搜尋 "Block Link Plus"
3. 為常用命令設定快速鍵

### 建議快速鍵

```
Ctrl+Shift+B  → Copy Block Link
Ctrl+Shift+E  → Copy Block as Embed
Ctrl+Shift+U  → Copy Block as URI
Ctrl+T        → Insert Time Section
```

## 執行條件

所有命令需要：
- 目前處於編輯模式
- 有文字選取或游標在有效位置
- 對應功能在設定中已啟用