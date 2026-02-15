# Enhanced List Blocks Ops：与 vslinko 插件的“效果差异”对比（历史记录）

> 状态（2026-02 / v2.0.0）：BLP 已移除 vendored 的 vslinko outliner/zoom 集成；当前主线 Outliner 实现在 `src/features/file-outliner-view/`。本文仅用于回溯历史决策，不再代表当前实现。

> 目的：记录**曾经**的 “BLP 自研 Enhanced List Blocks Ops” 与参考插件（`obsidian-zoom` / `obsidian-outliner`）的差异，并说明为什么最终切换到“直接复用/内置插件”的路线。

## TL;DR（历史原则 / 结论，已废弃）

- Enhanced List Blocks 的“第三部分：Ops”（Zoom/Move/Indent/Outdent/Drag&Drop/垂直缩进线…）**不再由 BLP 自研实现**。
- 这些交互能力由 BLP 内置（vendored）的 vslinko 插件提供：
  - `obsidian-outliner@4.9.0`
  - `obsidian-zoom@1.1.2`
- BLP 只负责：启用开关、设置存储、样式引入/隔离、与外置同名插件冲突时自动禁用内置、以及在 vendor 代码上的 bugfix。
- 因此，之前列出的“剩余差异”（例如“点击 bullet/marker 触发 zoom”“Move/Indent/Outdent 对齐 outliner”“Drag&Drop + 垂直缩进线对齐”）都不再是 BLP 的待办项；如出现不一致，按“vendor bug / 集成 bug”处理。

## 当前实现（Built-in Outliner / Built-in Zoom）

- 代码位置：
  - vendor：`src/vendor/vslinko/obsidian-outliner/**`、`src/vendor/vslinko/obsidian-zoom/**`
  - 集成层：`src/features/built-in-vslinko/index.ts`
  - CSS：`src/css/vendor-obsidian-outliner.css`、`src/css/vendor-obsidian-zoom.css`
- 设置入口：BLP 设置页 → Built-in Outliner / Built-in Zoom。
- 作用范围：**全局**（与上游插件一致），不走 Enhanced List Blocks 的启用范围（`blp_enhanced_list` / 启用文件夹/启用文件列表）。
- 冲突策略：检测到外置插件已启用时，BLP 会自动关闭内置版本以避免“双重注册”：
  - 外置 `obsidian-outliner` 启用 → 自动禁用 Built-in Outliner
  - 外置 `obsidian-zoom` 启用 → 自动禁用 Built-in Zoom
- 命令命名空间：由于模块运行在 BLP 插件内，命令 ID 归属于 `block-link-plus:*`（而不是 `obsidian-outliner:*` / `obsidian-zoom:*`）。
- 插件间联动：`obsidian-outliner` 会在部分动作里探测 `window.ObsidianZoomPlugin`；BLP 内置 Zoom 会在不与外置 Zoom 冲突时提供该 global API。

## 路线变更（2026-01-10）

- 切换原因：自研实现与上游交互差异逐渐扩大，维护成本高；直接复用更稳定，也便于跟随上游问题与社区反馈做修复。
- 对齐目标：规格内只保证“集成正确 + 行为尽量与上游一致”；不再在 BLP 内复刻一套 outliner/zoom。

## 附录：历史遗留的“剩余差异”（已废弃）

以下差异点仅用于回溯为什么曾经觉得需要对齐；在当前路线下**不应再作为实现清单**：
- 点击 bullet/marker 触发 zoom（由 `obsidian-zoom` 提供）
- Move / Indent / Outdent（由 `obsidian-outliner` 提供）
- Drag & Drop + 垂直缩进线（由 `obsidian-outliner` 提供）
