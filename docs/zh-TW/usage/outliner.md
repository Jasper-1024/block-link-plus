# Outliner

Outliner 是 Block Link Plus 2.0 的主線能力：在**啟用範圍**內，把每個 list item 當作一個 block 來編輯（類 Logseq），並在磁碟上維護一條「協議尾行」（Dataview inline fields + `^id`），從而實現：

- 每個列表塊都能穩定引用：`[[file#^id]]` / `![[file#^id]]`
- `blp-view`（Query/View）可以基於 Dataview 對這些塊做篩選/分組/渲染（需要 Dataview 外掛）

!!! danger "重要：只建議在「專用檔案 / 專用資料夾」內啟用"
    Outliner 是強 opt-in 的工作流：當檔案以 Outliner 視圖開啟時，外掛會把正文規範化為「列表塊（list blocks）」結構，並在需要時寫回檔案。  
    這意味著：**非列表內容（段落、標題、引用等）可能會被忽略並在寫回時遺失**。請務必先備份，或僅在新建/專用的 list-first 筆記中啟用。

    Outliner 也會規範化格式（例如：縮排統一為 2 空格、列表符號統一為 `-`）。

    一個推薦的「list-first」結構示例：

    ```markdown
    - 2026-02-14
      - Log
        - 09:30 ... 
        - 14:00 ...
    ```

## 啟用範圍（預設關閉）

Outliner 預設不對任何檔案生效。你可以透過以下方式啟用：

- **設定啟用範圍**：設定 → Block Link Plus → `Outliner` → 配置「啟用資料夾/啟用檔案」（vault 相對路徑；資料夾遞迴匹配；建議用 Obsidian 右鍵 Copy path 取得）
- **單檔案 frontmatter 覆蓋**：
  - `blp_outliner: true` 強制啟用
  - `blp_outliner: false` 強制停用（即使位於啟用資料夾內）

啟用後，外掛會做兩件事：

1. **路由開啟方式**（可開關）：當「啟用 Outliner（`fileOutlinerViewEnabled`）」開啟時，範圍內檔案會預設用 Outliner 視圖開啟
2. **為 `blp-view` 提供資料範圍**：`blp-view` 只能掃描啟用範圍內的檔案（否則會報錯）

### 在 Markdown / Outliner 間切換

- 在普通 Markdown 視圖：右上角面板選單（More options）會出現「開啟為 Outliner / 在新分頁開啟為 Outliner」（僅對啟用檔案顯示）
- 在 Outliner 視圖：同一個選單提供「開啟為 Markdown / 在新分頁開啟為 Markdown」

## 協議尾行（System Tail Line）

Outliner 會為每個列表塊維護一條尾行，用 Dataview inline fields + `^id` 表達：

```markdown
- 一條日誌內容
  [date:: 2026-02-14T09:30:25] [updated:: 2026-02-14T09:30:25] [blp_sys:: 1] [blp_ver:: 2] ^abcd
  - 子項（也是一個 block）
    [date:: 2026-02-14T09:31:00] [updated:: 2026-02-14T09:31:00] [blp_sys:: 1] [blp_ver:: 2] ^child
```

- 縮排約定：Outliner 固定以 **2 個空格**為一級縮排（無設定項）。
- `^id`：原生 block id，用於 `[[file#^id]]` 跳轉/引用
- `date` / `updated`：建立時間 / 最近修改時間（`blp-view` 常用來做時間過濾與排序）
- `blp_sys` / `blp_ver`：外掛協議標記（用於識別/相容）

你也可以在尾行上附加額外 Dataview 欄位（例如 `[topic:: linux]`），外掛會盡量保留它們；但以上保留欄位由外掛維護，可能會被規範化。

### 隱藏尾行（閱讀模式）

預設情況下，外掛會在**閱讀模式**隱藏帶 `[blp_sys:: 1]` 的尾行（設定項：`fileOutlinerHideSystemLine`）。如果你需要排查問題，可以暫時關閉隱藏，讓尾行顯示出來。

## 互動與編輯

在 Outliner 視圖中，每個 block 的互動主要圍繞「圓點（bullet）」：

- 左鍵點擊圓點：Zoom 進入該 block 的子樹視圖（可在設定中關閉 Zoom）
- 拖曳圓點：在同一檔案內移動 block 子樹（可在設定中關閉拖曳）
- 右鍵圓點：開啟圓點選單
  - 複製塊引用 / 嵌入 / URI
  - 轉為任務 / 轉為普通塊
  - 複製 / 剪下 / 刪除（以 block 子樹為單位）
  - 折疊 / 展開

### 任務（Tasks）

任務塊在磁碟上使用 Obsidian 原生語法：

- `- [ ] ...`
- `- [x] ...`

相關命令（見：參考 → 命令）：

- Outliner：切換任務狀態（`Mod+Enter`）
- Outliner：切換任務標記（`Mod+Shift+Enter`）

