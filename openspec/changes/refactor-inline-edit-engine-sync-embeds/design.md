# Design: Refactor Inline Edit Engine (Basics → sync-embeds)

## Intent
用 Obsidian 原生对象模型（`WorkspaceLeaf`/`MarkdownView`）承载嵌入编辑，避免 Basics/FlowEditor 的 editor-in-editor 与生命周期问题；同时用 BLP 的范围模型保持 `#Heading/#^id/#^id-id` 行为一致。

## Key Ideas
- **Leaf per embed**：每个可编辑嵌入一个独立 leaf（参考 `sync-embeds/src/embed-manager.js`），可控的创建/挂载/卸载。
- **Re-parent**：将 `MarkdownView.containerEl` 挂载到 embed 的 DOM shell 内，避免自建“假编辑器”。
- **Focus-driven routing**：以“焦点在某个嵌入 editor 内”为路由边界，最小 patch 命令执行路径（参考 `sync-embeds/src/main.js`）。
- **Unified range model**：继续使用 `getLineRangeFromRef()` 计算可见范围，并在其上派生可编辑范围实现行级只读。

## Range Model
- Visible range：由 `getLineRangeFromRef()` 得到的 `[startLine,endLine]`（包含 Heading 行与 marker 行）。
- Editable range：
  - `Heading`：`[startLine+1,endLine]`
  - `BlockID`：`[startLine,endLine]`
  - `Range (^id-id)`：`[startLine,endLine-1]`

## Reading Mode
- 永不创建 editor leaf。
- 仅 `^id-id` 走 preview 管线补渲染；其它 embed 完全交给 Obsidian 原生。

## Out of Scope (initial)
- 递归/限深/防环（仅跳过扫描）。
- 复杂 lazy/并发配置（仅最小 lazy）。