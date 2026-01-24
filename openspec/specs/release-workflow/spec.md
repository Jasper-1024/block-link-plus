# Capability: Release Workflow

## Purpose
通过自动化工作流构建、校验并发布插件版本，保证 `manifest.json` 与打包产物一致，减少手工发布步骤，并在发布前尽早发现缺失文件/构建失败等问题。
## Requirements
### Requirement: Validate build artifacts for release
项目 SHALL 在发布流程中验证构建产物与清单文件一致性（例如 `manifest.json`、`main.js`、`styles.css` 等）。

#### Scenario: CI runs checks on release
- **WHEN** 触发发布工作流
- **THEN** CI 执行构建与校验步骤，并在缺失必要文件或构建失败时阻止发布

### Requirement: Package and publish releases
项目 SHALL 支持通过自动化工作流打包并发布 Obsidian 插件 release（与 tag/版本号关联）。

#### Scenario: Publish a new version
- **WHEN** 维护者创建新版本并推送 tag
- **THEN** 工作流生成对应版本的发布产物并附加到 GitHub Release

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

