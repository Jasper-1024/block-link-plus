# 內嵌編輯 (Inline Edit)

在 Live Preview 中直接編輯嵌入內容，無需跳轉到來源檔案。

## 開啟

設定 → Block Link Plus → Inline Edit：
- `inlineEditEnabled`（總開關）
- `inlineEditFile` / `inlineEditHeading` / `inlineEditBlock`

也可以透過命令面板執行 `Toggle Inline Edit`（`mk-flow-editor`）快速切換 `inlineEditEnabled`。

## 用法

使用原生嵌入語法：

```markdown
![[筆記]]
![[筆記#標題]]
![[筆記#^blockId]]
![[筆記#^id-id]]
```

Reading 模式始終唯讀。

## 在目前檔案中搜尋

啟用 Inline Edit 後，在一般 Markdown 檔案的 Live Preview 中按 `Ctrl+F`（macOS：`Cmd+F`），可以搜尋正文及已掛載的內嵌編輯內容，包括區塊、標題與檔案嵌入。

- 使用搜尋列的上一項／下一項瀏覽結果；內嵌匹配只捲動與高亮，不會自動進入編輯或跳轉到來源檔案。
- 焦點保留在搜尋列，便於繼續輸入；按 `Escape` 關閉搜尋並清除搜尋高亮。
- 這是目前檔案內搜尋，不是全庫搜尋，也不是 Outliner 專用搜尋。閱讀模式保留 Obsidian 原有行為。

## 說明

- 舊版 `!![[...]]` 語法已移除，請改用 `![[...]]`。
