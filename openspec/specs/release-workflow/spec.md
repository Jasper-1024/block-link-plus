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
