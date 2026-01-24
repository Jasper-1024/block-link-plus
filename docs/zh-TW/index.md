# Block Link Plus

增強 Obsidian 塊引用功能的外掛，支援多行塊引用、Enhanced List Blocks（`blp-view`）和內聯編輯。

## 核心功能

- **多行塊引用** - 創新的 `^abc123-abc123` 範圍標識符，實現多行引用
- **Enhanced List Blocks** - 以 list item 為最小 block，自動產生隱藏系統行（`[date:: ...] ^id`），並提供 `blp-view` 查詢/檢視
- **內聯編輯** - 直接編輯嵌入塊內容，無需跳轉原檔案
- **智慧別名** - 塊連結顯示內容摘要而非隨機ID

## 快速開始

1. 在社群外掛中搜尋 "Block Link Plus"
2. 啟用外掛
3. 選取文字右鍵 → "複製塊連結"

## 連結類型

- `[[檔案#^abc123]]` - 常規塊連結
- `![[檔案#^abc123]]` - 嵌入塊（Live Preview 可編輯，需開啟設定）
- `![[檔案#^abc123-abc123]]` - 多行範圍嵌入
- `obsidian://open?vault=...` - URI連結

## 致謝

Block Link Plus 參考了優秀的開源專案：

- **內聯編輯引擎** - 移植自 [sync-embeds](https://github.com/uthvah/sync-embeds/)
- **早期可編輯塊基礎** - 參考 [Obsidian-Basics](https://github.com/Make-md/Obsidian-Basics)
- **塊引用基礎** - 參考 [copy-block-link](https://github.com/mgmeyers/obsidian-copy-block-link)
- **多塊處理** - 啟發自 [Text Transporter](https://github.com/TfTHacker/obsidian42-text-transporter)

感謝所有開源貢獻者為 Obsidian 生態做出的努力。

## 相依套件

`blp-view`（Query/View）需要 [Dataview](https://github.com/blacksmithgu/obsidian-dataview) 外掛。
