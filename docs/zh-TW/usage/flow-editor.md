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

## 說明

- 舊版 `!![[...]]` 語法已移除，請改用 `![[...]]`。
