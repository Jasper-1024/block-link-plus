## ADDED Requirements
### Requirement: Release via GitHub Actions with file checks
项目 SHOULD 使用 GitHub Actions 执行发布流程，并在发布前校验构建产物与必要清单文件存在。

#### Scenario: Workflow blocks invalid releases
- **WHEN** 工作流发现 `main.js` / `manifest.json` / `styles.css` 等缺失或构建失败
- **THEN** 工作流失败并阻止发布产物生成

