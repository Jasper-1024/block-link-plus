# Tasks: Add What's New Modal On Update

## 1. Spec
- [x] 1.1 为 `release-workflow` 增加「升级后展示更新说明」的 delta requirements（含场景）
- [x] 1.2 `openspec validate add-whats-new-on-update --strict`

## 2. Implementation
- [x] 2.1 增加 `lastSeenVersion` 持久化字段（不暴露在设置 UI）
- [x] 2.2 在 `onload` 中检测升级（对比 `this.manifest.version`），并在 `layout-ready` 后弹出 Modal
- [x] 2.3 实现 Modal：展示本版本关键变更 + 跳转完整 changelog 链接
- [x] 2.4 为新 UI 文案增加 i18n（en/zh/zh-TW）

## 3. Validation
- [x] 3.1 增加/更新单测（纯逻辑：是否需要弹窗、版本记录策略、文案选择）
- [x] 3.2 `npm test`
- [x] 3.3 `npm run build-with-types`

## 4. Release Prep
- [x] 4.1 版本号提升到 `1.8.0`（`package.json` / `manifest.json` / `versions.json`）
- [x] 4.2 文档 changelog 标记 `v1.8.0` 为当前版本（所有语言）
