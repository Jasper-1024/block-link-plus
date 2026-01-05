## ADDED Requirements

### Requirement: Show update notes after plugin upgrade
插件 SHALL 在版本升级后向用户展示一次本版本的关键更新说明，并提供查看完整 changelog 的入口。

#### Scenario: Upgrade triggers a What's New modal
- **WHEN** 插件启动时检测到 `manifest.version` 与上次记录的版本不同（升级）
- **THEN** 插件在 `layout-ready` 后弹出一次更新说明 Modal
- **AND** Modal 包含本版本关键变化摘要
- **AND** Modal 提供跳转完整更新日志的链接

#### Scenario: First install does not show the modal
- **WHEN** 插件首次安装且没有记录的历史版本
- **THEN** 插件只记录当前版本
- **AND** 不弹出更新说明 Modal

#### Scenario: Modal is shown at most once per version
- **WHEN** 更新说明 Modal 已经为某个版本展示过
- **THEN** 插件后续启动不再为该版本重复弹出

