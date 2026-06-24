# Project Context

## Purpose
Block Link Plus 是一个 Obsidian 插件，用于增强「块级链接/标题链接」的生成、展示与编辑体验，并扩展了一组围绕块引用的生产力能力（多行块引用、可编辑嵌入、时间章节、时间线聚合等）。

项目目标：
- 让用户用更少的操作生成可靠的块链接（单行、列表项、标题、多行范围）。
- 在保持 Obsidian 原生语法兼容的前提下，提供更强的嵌入展示与「就地编辑」能力（`!![[...]]`）。
- 面向日志/复盘等场景，提供可配置的聚合能力（`blp-timeline`），并在大库中保持可接受的性能与稳定性。

## Tech Stack
- **运行环境**：Obsidian Plugin API（桌面/移动端）
- **语言**：TypeScript（`strictNullChecks: true`，支持 `ts/tsx`）
- **构建**：esbuild（入口 `src/main.ts`，输出 `main.js` / `styles.css`）
- **编辑器/渲染相关**：CodeMirror 6、Obsidian DOM API、（局部）React 18 + react-dom
- **关键依赖**：
  - `obsidian-dataview`：Timeline 聚合查询
  - `js-yaml`：Timeline YAML 配置解析
  - `luxon` / `date-fns`：日期与时间处理（部分功能通过 Dataview 间接使用）
- **质量工具**：ESLint（TypeScript 规则）、Jest + ts-jest（单测与 mock）
- **文档站点**：MkDocs + Material + i18n（`docs/`, `docs/en/`, `docs/zh-TW/`）

## Project Conventions

### Code Style
- **缩进**：使用 Tab（`.editorconfig` 规定 `indent_style=tab`，`tab_width=4`）
- **TypeScript**：
  - 以类型明确为优先：避免 `any`（`noImplicitAny: true`），必要时再局部放宽
  - 以「可读性与可维护性」为主：变量/函数命名使用清晰的英语
  - 允许在少量边界场景使用 `// @ts-ignore`（ESLint 已放开 `ban-ts-comment`）
- **路径别名**：优先使用 `tsconfig.json` 的 `paths`（如 `features/*`, `shared/*`, `basics/*`）
- **Lint**：遵循 `.eslintrc`；未使用参数允许（`args: none`），避免无意义的禁用规则

### Architecture Patterns
- **模块化分层**（以目录为边界）：
  - `src/main.ts`：插件入口与生命周期管理（注册命令、processor、事件、设置页）
  - `src/features/*`：面向用户的功能模块（timeline、flow editor、time section 等）
  - `src/basics/*`：与第三方（Make.md / Obsidian-Basics）相关的集成与可编辑嵌入基础设施
  - `src/shared/*`：跨模块复用的基础能力
  - `src/test-utils/*`、`src/__mocks__/*`：测试与 mock
- **向后兼容优先**：对链接语法/解析逻辑的修改尽量提供兼容路径，避免破坏既有笔记内容
- **文件写入最小化**：对自动生成内容（如 timeline 输出）采用「哈希比对 + 区域标记」策略，避免无意义写入与循环触发

### Testing Strategy
- **框架**：Jest + ts-jest，配合 `jest-environment-jsdom`
- **原则**：
  - 对纯函数/解析与格式化逻辑优先做单测（尤其是 timeline 的解析、过滤、渲染）
  - 对 Obsidian/Dataview 交互使用 mock（`__mocks__/` 与 `src/test-utils/`）
  - 避免把 UI/DOM 行为测试做成脆弱的快照；更倾向验证关键输出/关键副作用

### Git Workflow
- **版本管理**：语义化版本（见 `manifest.json` / `package.json` / `versions.json`），发布用 tag 标记
- **版本提升**：使用 `npm run version`（脚本会更新版本文件并 `git add` 对应清单）
- **分支习惯**：`master` 为主线；复杂功能可用 feature 分支（例如 `feature-multline-block`）
- **提交信息**：历史上中英混合均存在；建议后续优先用「动词开头 + 影响范围」描述（便于从 log 归类到 OpenSpec change）

## Domain Context
- **块引用与格式**：
  - 常规块链接：`[[file#^blockId]]`
  - 嵌入块：`![[file#^blockId]]`
  - 可编辑嵌入：`!![[file#^blockId]]`（依赖 basics/flow 的渲染与交互）
  - Obsidian URI：`obsidian://...`（用于外部跳转/跨端）
- **多行块引用**：使用范围式 block id（例如 `^abc123-abc456`）表示一段连续行的引用，渲染与解析需要额外的定位/解析逻辑
- **Timeline（`blp-timeline`）**：
  - 用户在 Markdown 代码块中通过 YAML 配置查询范围、标题级别、过滤器（links/tags）等
  - 插件依赖 Dataview API 执行查询，并将结果写回到文件中指定的动态区域（使用 `%% blp-timeline-start ... %%` / `%% blp-timeline-end %%` 标记）

## Important Constraints
- **Obsidian 兼容性**：需兼容 `manifest.json:minAppVersion` 所声明的最低版本；尽量避免依赖桌面端专属能力
- **依赖约束**：Timeline 功能依赖 Dataview 插件；应做好缺失时的提示/降级
- **性能与稳定性**：面向大库/高频编辑场景，避免频繁重算与频繁写入（防抖、哈希比对）
- **内容安全**：对用户笔记的自动写入必须可预测、可回滚（使用明确的区域标记，避免覆盖用户非生成内容）

## External Dependencies
- **Obsidian Plugin API**：命令、右键菜单、Vault 文件读写、渲染与编辑器扩展
- **Dataview Plugin**：Timeline 查询与数据访问
- **Make.md / Obsidian-Basics**：可编辑嵌入与 flow 相关基础设施（在 `src/basics/` 内集成）
- **MkDocs + Material + i18n**：文档构建与多语言站点
- **GitHub Actions**：发布/构建检查与自动化流程（见 `.github/workflows/`）
