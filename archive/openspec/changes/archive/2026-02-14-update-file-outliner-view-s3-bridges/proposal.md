# Proposal: update-file-outliner-view-s3-bridges

## Why
File Outliner View(v2) 使用自建 CM6 `EditorView`（不在 Obsidian `MarkdownView` 管线内），因此缺少一批“原生编辑器生态能力”（`[[` 补全、`/` 指令建议、editor-menu 追加项等）。

同时，Outliner 的 block display 使用 `MarkdownRenderer.render(...)`，其内部渲染出的 `.internal-embed.markdown-embed` DOM 结构与 Obsidian 原生 preview 的 embed 结构不一致（缺少 `.markdown-embed-content`），导致 BLP 的 reading-range (`^id-id`) 多行渲染在 outliner display 内失败。

本变更按 S3「最小桥接」路线收敛：不复制 Obsidian 的完整 editor extensions 栈，只桥接少数关键入口，并修正 outliner display 的 embed DOM 形态，以恢复核心体验与兼容性。

## What Changes
- Outliner editor：桥接 `workspace.editorSuggest`，在自建 CM6 EditorView 内恢复 `[[` 文件/链接建议与 `/` 命令建议。
- Outliner display：对 `MarkdownRenderer.render(...)` 输出做 embed DOM normalize，确保 internal markdown embeds 含有 `.markdown-embed-content`，从而让 `^id-id` reading-range 多行渲染在 outliner display 内成立。

## Non-Goals
- 不尝试“复制/搬运” Obsidian Markdown editor 的完整 CM6 extensions 栈（不做 S2/S3+）。
- 不承诺所有第三方插件的 editor-menu/右键菜单追加项都可用（仅 best-effort）。
- 不改变 outliner file 的 system tail line 协议字段（`date/updated/blp_sys/blp_ver/^id`）。

## Impact
- Outliner 内的输入体验更接近原生（`[[`/`/` 建议回归），但仍保持 v2 的 file-level 隔离与稳定性边界。
- `![[file#^id-id]]` 在 outliner display 内恢复多行范围展示（reading-range），并为后续 inline edit / embed 交互留出结构性契约。

