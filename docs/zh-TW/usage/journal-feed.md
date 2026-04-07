# Journal Feed（日記連續流）

Journal Feed 是一個 **anchor-only**（僅錨點檔觸發）的視圖：在 Obsidian 中用一個「錨點檔」打開類似 Logseq Journals 的**日記連續流**，一次查看/編輯多天日記；但每一天仍然保存為**獨立的 Daily Note 檔案**。

## 前置條件

- 已啟用 Obsidian 核心外掛 **Daily Notes**
- 已設定 Daily Notes 的 folder + date format（設定 → Daily Notes）

Journal Feed **只讀取**上述設定，不會接管/取代 Daily Notes 的模板、命令或建立流程。

## 啟用方式（錨點檔）

建立任意 Markdown 檔（不需要是日記檔），在 frontmatter 寫入：

```yaml
---
blp_journal_view: true

# 選用：
blp_journal_initial_days: 3   # 預設 3
blp_journal_page_size: 7      # 預設 7
---
```

之後正常打開這個檔案：當偵測到 `blp_journal_view: true` 時，Block Link Plus 會把它路由到 Journal Feed 視圖。

## 行為說明

- 日記來源完全跟隨 Obsidian core **Daily Notes** 設定（folder + format）
- 以日期**倒序**顯示既有的 daily note 檔案
- 初次只載入最近 N 天；向下捲動時再懶載入更早的 N 天（不會一次載入全部日記檔）
- 每一天是一個獨立區塊：
  - header + **Open** 按鈕（用一般方式打開該天原檔）
  - 內嵌編輯器，編輯內容會寫回該天檔案

## V1 限制 / 非目標

- 不會建立日記檔、不接管模板/命令
- 直接打開某一天日記檔仍然是一般 Markdown 視圖（不會強制路由到 Journal Feed）
- 僅支援 core Daily Notes（V1 不支援 Periodic Notes）
- 不提供跨檔操作（跨天搬移 block、跨檔統一 undo/redo 等）

## 排錯

- 顯示 Daily Notes disabled：到 設定 → 核心外掛 → Daily Notes 啟用
- 顯示 “No Daily Notes files found”：先依 Daily Notes 設定建立一些日記檔
- 可用 **Open Anchor** 按鈕把錨點檔以一般 Markdown 原始碼視圖打開

