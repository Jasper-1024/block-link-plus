# File Outliner v2 全面 Code Review（2.0-test @ 6f6b36f）

范围：仅 review（不改代码）；聚焦 outliner v2 的架构/质量/风险/测试可信度。  
基线：`npm test` 全绿（27 suites / 140 tests）。

## 架构分层（现状评估）

- **Protocol（解析/规范化/序列化）**：`src/features/file-outliner-view/protocol.ts`
  - 规范化产物：list + system line（Dataview inline fields + `^id`），并保证 system line 在 children 之前（序列化：`src/features/file-outliner-view/protocol.ts:391`）。
  - system line 解析很“严格”：必须是“只有 DV inline fields + 末尾 `^id`”才会被视为 system line（`src/features/file-outliner-view/protocol.ts:108`），从而避免误吞用户内容。
  - 兼容旧 canonical：会移除 legacy v2（tail-after-children）引入的空行（`src/features/file-outliner-view/protocol.ts:256`）。
  - 风险控制：对 body 行中“看起来像 list item”的内容做转义，避免无意结构变化（`src/features/file-outliner-view/protocol.ts:378`）。
  - **优点**：协议边界清晰，可单测，且对 DV 扩展字段（extra）保留（`src/features/file-outliner-view/protocol.ts:127`）。

- **Engine（结构操作）**：`src/features/file-outliner-view/engine.ts`
  - 纯函数式：每次操作 clone 全树（`src/features/file-outliner-view/engine.ts:13`），返回 `{file, selection, dirtyIds}`，view 负责渲染/保存。
  - **优点**：结构操作可测、可推理（`src/features/file-outliner-view/__tests__/engine.test.ts`）。
  - **代价**：每次结构编辑 O(N) clone + rebuildDepths（大文件性能风险，需后续基准验证）。

- **View（UI/交互/保存/渲染）**：`src/features/file-outliner-view/view.ts`
  - 自建独立 CM6 `EditorView`（`src/features/file-outliner-view/view.ts:425`），并通过 keymap 将 Enter/Tab/Backspace/Delete 等映射为 engine 操作（`src/features/file-outliner-view/view.ts:530`）。
  - block display 用 `MarkdownRenderer.render(...)` 异步渲染（`src/features/file-outliner-view/view.ts:1489`），用 seq 防并发乱序（`src/features/file-outliner-view/view.ts:1478`）。
  - 对 display 内 embed 做 DOM normalize 以兼容 inline-edit/range embed（`src/features/file-outliner-view/embed-dom.ts:8`，调用点：`src/features/file-outliner-view/view.ts:1522`）。
  - 通过 capture click router 走 Obsidian 原生 `openLinkText`（internal-link 可点）+ inline-edit mount（`src/features/file-outliner-view/view.ts:470`）。

- **Scope + Routing（文件级接管）**
  - 全局 monkey-patch `WorkspaceLeaf.openFile` 做路由（`src/features/file-outliner-view/routing.ts:9`）。
  - scope 判定：settings files/folders + frontmatter 强制开关：`blp_outliner: true|false`，并支持 legacy alias `blp_enhanced_list`（`src/features/file-outliner-view/scope-manager.ts:1`）。
  - **优点**：文件级接管的边界明确；对 detached leaf 做了保护（`src/features/file-outliner-view/routing.ts:17`）。
  - **高风险点**：openFile 属于全局关键路径；与其它插件 patch 冲突、异常回退链路都需要长期维护。

- **S3 最小桥接（编辑器生态能力）**
  - EditorSuggest bridge：`src/features/file-outliner-view/editor-suggest-bridge.ts:48`，用最小 `Editor` 适配 link suggest / slash commands。
  - 风险：桥接依赖 Obsidian 内部对象形态（`app.workspace.editorSuggest` 等），属于非公开 API；单测覆盖有限（`src/features/file-outliner-view/__tests__/editor-suggest-bridge.test.ts`）。

## 关键风险/缺陷（按严重度排序）

### P0：全局路由 patch（openFile）长期风险
- **证据**：`src/features/file-outliner-view/routing.ts:9` monkey-around `WorkspaceLeaf.prototype.openFile`。
- **风险**：
  - 与其它插件/未来 Obsidian 升级的 monkey patch 冲突不可避免；出现问题时定位困难。
  - 任何 openFile 的异常都会影响全 vault（即便 try/catch 回退）。
- **建议（未验证）**：
  - 维持“最小 patch + 严格回退”原则；补充更多 9222 回归用例覆盖 openState 变体（split/new tab/active=false）。

### P0：保存策略“高频 requestSave”潜在性能风险
- **证据**：
  - docChanged 直接触发 `onEditorDocChanged(...)`（`src/features/file-outliner-view/view.ts:583`）。
  - 每次 docChanged 都 `this.requestSave()`（`src/features/file-outliner-view/view.ts:1776`）。
  - 结构操作也会 `requestSave()`（`src/features/file-outliner-view/view.ts:1733`、`src/features/file-outliner-view/view.ts:1668`、`src/features/file-outliner-view/view.ts:916`）。
- **影响**：长文档/慢盘/移动端可能出现写盘抖动、元数据/索引更新压力上升、输入卡顿。
- **建议（待验证）**：引入 view 内部的统一“节流/合并保存”层（仅合并 requestSave 调用，保证 blur/结构编辑时强制 flush），并用 9222 基准对比确认真实写盘次数下降且无数据丢失。

### P1：渲染管线重（每个 dirty block 走 MarkdownRenderer）
- **证据**：`src/features/file-outliner-view/view.ts:1473` 每次 `renderBlockDisplay` 都 `MarkdownRenderer.render`（`src/features/file-outliner-view/view.ts:1489`）。
- **风险**：
  - 大文件 + 多 dirtyIds 时，渲染/GC 压力高；且渲染是异步，可能出现“延迟显示/闪烁/迟到更新”。
  - 目前没有虚拟滚动/分段渲染；性能上限依赖 Obsidian/插件生态处理器成本。
- **建议（未验证）**：为 display 引入“可见区优先渲染 + 空闲时补齐”的调度策略（先跑 9222/人工基准验证瓶颈是否在 MarkdownRenderer）。

### P1：CDP/9222 回归脚本可信度（当前观测到失败/不稳定）
- **证据（已复现）**：
  - 运行 `scripts/cdp-snippets/file-outliner-smoke.js` 报错：`newlineRendered=false: "hello"`（9222 输出）。
  - synthetic 键盘事件存在特殊限制：`KeyboardEvent('keydown', {ctrlKey:true, key:'Enter'})` 在部分路径下不触发监听（可导致脚本不得不 fallback 直接调用私有方法）。
- **影响**：如果 9222 是主要验收手段，脚本 flake 会直接拖慢迭代；“看似回归”可能是假阴性/假阳性。
- **建议（未验证）**：统一把 CDP 脚本的“等待条件”改成更确定的 DOM/模型状态（更长 timeout + 明确的 `view.outlinerFile` / `editingId` / block text 断言），并记录环境假设（焦点/窗口状态/插件数量）。

### P2：i18n 覆盖不完整（UI/命令存在硬编码英文）
- **证据**：右键菜单大量硬编码（`src/features/file-outliner-view/view.ts:971`），命令名硬编码（`src/features/file-outliner-view/commands.ts:19`）。
- **影响**：中文环境下体验割裂；后续新增项容易漏翻译。
- **建议（未验证）**：为 outliner 菜单/命令补齐 i18n key，并加一个“新增文案必须走 i18n”的轻量 lint/单测约束（可参考现有 settings tab i18n 测试：`src/ui/__tests__/settings-tabs.test.ts`）。

### P2：`view.ts` 过大 + 大量吞异常 try/catch（可维护性/可观测性风险）
- **证据**：`src/features/file-outliner-view/view.ts` 单文件承载 UI、输入法/键盘、渲染、DND、zoom、保存、路由 click 等。
- **影响**：后续修复容易“牵一发动全身”；吞异常会把真实错误变成“偶现 UI 怪异”。
- **建议（未验证）**：按职责拆分（render/saving/dnd/menu/navigation），并引入一个可控 debug logger（仅在 debug 开关启用时输出）。

## 已验证的正确性要点（靠单测/代码不变量）

- 协议层：system line 严格识别 + extra DV 字段保留（`src/features/file-outliner-view/protocol.ts:108`、`src/features/file-outliner-view/protocol.ts:127`；单测：`src/features/file-outliner-view/__tests__/protocol.test.ts`）。
- 引擎层：结构编辑语义（split/indent/outdent/merge/move）单测覆盖（`src/features/file-outliner-view/__tests__/engine.test.ts`）。
- task marker 解析/切换纯函数单测覆盖（`src/features/file-outliner-view/task-marker.ts:12`；单测：`src/features/file-outliner-view/__tests__/task-marker.test.ts`）。
- block 内部 list/heading 只做渲染期 sanitize（不做结构化），单测覆盖（`src/features/file-outliner-view/block-markdown.ts:46`；单测：`src/features/file-outliner-view/__tests__/block-markdown.test.ts`）。
- scope/frontmatter 强制开关（含 legacy alias）单测覆盖（`src/features/file-outliner-view/__tests__/feature-toggles.test.ts`）。

## 待补的“必须做验证”（建议下轮优先）

- `requestSave` 节流方案：真实输入（非脚本 dispatch）下的写盘次数/卡顿对比（移动端/慢盘尤其）。
- 大文件（>5k blocks）下：render/scroll/edit 的帧率与内存曲线（确认瓶颈在 clone、render 还是保存）。
- openFile 路由在复杂 workspace（多 pane + pinned + backlinks pane 等）下的兼容性回归用例。
- CDP 回归脚本：稳定性改造后再作为“可写入 doc 的硬证据”来源。

