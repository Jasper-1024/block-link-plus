# Proposal: Add What's New Modal On Update

## Summary
在插件版本升级后（`manifest.version` 发生变化），自动弹出一次 “What’s New / 更新说明” 弹窗，向用户展示本次版本的关键变化，并提供跳转完整更新日志的链接。

## Why
- 目前用户需要手动查看 changelog 才能知道更新内容，容易错过 breaking changes（例如语法移除/行为变化）。
- 多语言用户需要在应用内直接看到简短摘要，减少沟通成本。

## What Changes
- 在 `onload` 期间对比 `this.manifest.version` 与持久化的 `lastSeenVersion`：
  - 首次安装：仅记录版本，不弹窗。
  - 升级：在 `layout-ready` 后弹出一次 Modal，并记录已展示版本，避免重复弹出。
- 弹窗内容按 Obsidian 语言（`en` / `zh` / `zh-TW`）展示，并提供 “View full changelog / 查看完整更新日志” 外部链接。
- 不新增设置项；该行为默认启用且每版本只弹一次。

## Impact
- 影响代码：`src/main.ts`、新增 UI Modal、i18n 文案、版本号文件（`manifest.json`/`package.json`/`versions.json`）与文档 changelog。
- 用户可见行为变化：升级后首次启动会出现一次更新说明弹窗。

