# Block Link Plus

增強 Obsidian 塊引用功能的外掛，支援多行文字、時間線聚合和內聯編輯。

## 核心功能

- **多行塊引用** - 創新的 `^abc123-abc123` 範圍標識符，實現多行引用
- **時間線聚合** - 從多個檔案提取時間標題，按時間排序顯示
- **內聯編輯** - 直接編輯嵌入塊內容，無需跳轉原檔案
- **時間章節** - 插入當前時間作為標題，自動判斷標題級別
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

- **可編輯塊功能** - 移植修改自 [Obsidian-Basics](https://github.com/Make-md/Obsidian-Basics)
- **塊引用基礎** - 參考 [copy-block-link](https://github.com/mgmeyers/obsidian-copy-block-link)
- **多塊處理** - 啟發自 [Text Transporter](https://github.com/TfTHacker/obsidian42-text-transporter)

感謝所有開源貢獻者為 Obsidian 生態做出的努力。

## 相依套件

時間線功能需要 [Dataview](https://github.com/blacksmithgu/obsidian-dataview) 外掛。
