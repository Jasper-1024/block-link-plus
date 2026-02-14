# 命令參考

所有可用命令及其用途。

## 塊連結（複製到剪貼簿）

### Copy Block Link
- **ID**: `copy-link-to-block`
- **功能**: 複製常規塊連結 `[[檔案#^id]]`
- **快速鍵**: 可在設定中自訂

### Copy Block as Embed
- **ID**: `copy-embed-to-block`
- **功能**: 複製嵌入連結 `![[檔案#^id]]`
- **快速鍵**: 可在設定中自訂

### Copy Block as Obsidian URI
- **ID**: `copy-url-to-block`
- **功能**: 複製 Obsidian URI 連結用於外部存取
- **快速鍵**: 可在設定中自訂

## 內嵌編輯（Inline Edit）

### Toggle Inline Edit
- **ID**: `mk-flow-editor`
- **功能**: 快速切換內嵌編輯（對應設定 `inlineEditEnabled`）
- **說明**: 僅影響嵌入在 Live Preview 是否可編輯；不影響塊連結/Outliner

## Outliner

### Outliner：切換任務狀態
- **ID**: `file-outliner-toggle-task-status`
- **功能**: 在 Outliner 視圖中切換任務塊狀態（`[ ]` ↔ `[x]`）
- **預設快速鍵**: `Mod+Enter`

### Outliner：切換任務標記
- **ID**: `file-outliner-toggle-task-marker`
- **功能**: 在普通塊 / 任務塊之間切換（`- ...` ↔ `- [ ] ...`）
- **預設快速鍵**: `Mod+Shift+Enter`

## 使用方式

### 命令面板
1. 按 `Ctrl+P`（或 `Cmd+P`）開啟命令面板
2. 搜尋命令名稱
3. 按 Enter 執行

### 快速鍵
1. 進入設定 → 快速鍵
2. 搜尋 "Block Link Plus"
3. 為常用命令設定快速鍵

### 建議快速鍵

```
Ctrl+Shift+B  → Copy Block Link
Ctrl+Shift+E  → Copy Block as Embed
Ctrl+Shift+U  → Copy Block as URI
```

## 執行條件

- Copy Block*：需要在 Markdown 編輯器中，且有選取區或游標位於可解析的塊/標題位置
- Outliner*：需要目前作用中的視圖為 Outliner（否則命令不會生效/不會顯示）
- 右鍵選單項可在設定中關閉，但命令面板/快速鍵仍可使用

