# Change: Add MkDocs Multilanguage Docs and CI Workflows

## Why
需要一套可持续维护的文档站点与发布流程：文档支持多语言（中/英/繁体），发布过程需要自动化构建与产物校验，降低手工发布的风险与成本。

## What Changes
- 引入 MkDocs（Material）与 i18n 配置，建立多语言文档结构与导航。
- 增加 GitHub Actions 工作流：发布时构建、校验必要文件并打包 release。
- 更新站点域名与相关配置（如 CNAME）。

## Impact
- Affected specs: `specs/documentation-site/spec.md`, `specs/release-workflow/spec.md`
- Affected code: `mkdocs.yml`, `docs/**`, `.github/workflows/**`, `CNAME`

