# Block Link Plus

增強 Obsidian 的塊引用體驗：一鍵複製塊連結/嵌入/URI、建立多行範圍塊（`^id-id`，如 `^abc123-abc123`）、在啟用範圍內使用 Outliner（類 Logseq）與 `blp-view`（Query/View），並支援嵌入塊的內嵌編輯。

## 核心功能

- **塊連結/嵌入/URI** - 右鍵或命令面板一鍵複製：`[[file#^id]]` / `![[file#^id]]` / `obsidian://open?...`
- **多行範圍塊** - `^abc123-abc123` 範圍識別符，精確引用/嵌入多行選取區
- **Outliner + blp-view** - 在啟用檔案內把 list item 當作 block；自動維護協議尾行（Dataview inline fields + `^id`）；用 `blp-view` 查詢/分組/渲染（需要 Dataview 外掛）
- **內嵌編輯** - 在 Live Preview 直接編輯嵌入內容，無需跳轉來源檔案（需開啟設定）
- **智慧別名** - 複製常規塊連結時可產生內容摘要/父標題等別名

## 快速開始

1. 在社群外掛中搜尋 "Block Link Plus"
2. 啟用外掛
3. 選取文字右鍵 →「複製塊連結」
4. 若要使用 Outliner：設定 → Block Link Plus → Outliner → 配置啟用範圍（建議僅在專用資料夾啟用；或在檔案 frontmatter 寫 `blp_outliner: true`）

## 連結類型

- `[[檔案#^abc123]]` - 常規塊連結
- `![[檔案#^abc123]]` - 嵌入塊（Live Preview 可編輯，需開啟設定）
- `![[檔案#^abc123-abc123]]` - 多行範圍嵌入
- `obsidian://open?vault=...` - URI 連結

## 致謝

Block Link Plus 參考了優秀的開源專案：

- **內嵌編輯引擎** - 移植自 [sync-embeds](https://github.com/uthvah/sync-embeds/)
- **早期可編輯塊基礎** - 參考 [Obsidian-Basics](https://github.com/Make-md/Obsidian-Basics)
- **塊引用基礎** - 參考 [copy-block-link](https://github.com/mgmeyers/obsidian-copy-block-link)
- **多塊處理** - 啟發自 [Text Transporter](https://github.com/TfTHacker/obsidian42-text-transporter)

感謝所有開源貢獻者為 Obsidian 生態做出的努力。

## 相依套件

`blp-view`（Query/View）需要 [Dataview](https://github.com/blacksmithgu/obsidian-dataview) 外掛。

