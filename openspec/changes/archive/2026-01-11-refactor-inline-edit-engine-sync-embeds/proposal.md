# Proposal: Refactor Inline Edit Engine (Basics → sync-embeds)

## Summary
本变更用 `sync-embeds` 的 leaf/re-parent/focus/command interception 路线替换当前基于 `src/basics/*` 的 inline edit/flow editor 引擎，并完成一次性的底层清理：
- 彻底移除 `!![[...]]` 语法与所有相关功能入口（设置/命令/文档/Timeline embed_format）
- 让 `![[...]]` 是否可编辑仅由设置决定（全局 + 3 子开关：file/heading/block）
- 保留并强化 `^id-id` 的范围语义：Live Preview 可编辑（行级只读规则），Reading 永远只读但必须可渲染

## Why
- `src/basics/*` 来自上游 `Obsidian-Basics`，停更且关键缺陷难以修复；当前代码已出现多处“防御性修补”与模式切换问题。
- `sync-embeds` 已在真实 Obsidian 模型（`WorkspaceLeaf`/`MarkdownView`）上验证：通过创建独立 leaf 并 re-parent 到 embed 容器，可获得更稳定的编辑体验，并可用最小 patch 让命令/热键自然落到嵌入 editor。
- 本项目的关键差异（`^id-id`）更适合以“统一范围模型 + 行级只读”实现，而不是继续叠加 Basics 的 flow editor 机制。

## Goals
- 正确性优先：行为与 Obsidian 模式一致（Live Preview ↔ Live Preview；Reading ↔ Reading），不产生 DOM/React 生命周期错误。
- 支持 3 类可编辑嵌入：file / heading / block（block 覆盖 `#^id` 与 `#^id-id`）。
- `^id-id` 在 Reading 下必须可渲染且只读；在 Live Preview 下可编辑但 marker 行只读。
- 命令/热键在嵌入 editor 内可用（含用户自定义热键），不为单个命令写特化适配。
- 禁止递归（editor-in-editor）。

## Non-Goals
- 递归/限深/防环的完整体系（初版仅“检测容器并跳过”）。
- 激活式 lazy load、最大并发控制等复杂性能配置（初版“可见即加载”）。
- 对 `^id-id` 首行 `^id` token 做绝对只读加固（若出现真实问题再加固）。

## Decisions (from ADR)
- ADR: `adr-inline-edit-engine.md`
- `!![[...]]`：不支持/不兼容（不清理、不降级、不作为开关）。
- 删除 `editorFlowStyle`；删除 timeline 的 `embed_format`。
- `![[...]]` 是否可编辑仅由设置控制：`inlineEditEnabled` + `inlineEditFile/Heading/Block`。
- 行级只读：Heading 标题行、`^id-id` marker 行“可见但只读”。
- Reading 永不提供可编辑；仅 `^id-id` 走自定义只读渲染补齐范围语义。

## Technical Approach (high level)
- Live Preview inline edit：
  - 为每个可编辑嵌入创建独立 `WorkspaceLeaf` + `MarkdownView`。
  - 将 `view.containerEl` re-parent 到 embed DOM 容器。
  - 使用 BLP 的 `getLineRangeFromRef()` 统一计算可见行范围。
  - 将“可见范围”和“可编辑范围”分离，以实现行级只读（Heading 行、marker 行）。
- Reading：
  - 永远不创建 editor leaf。
  - 普通 `![[...]]` 交给 Obsidian 原生。
  - 仅 `![[file#^id-id]]`：抽取范围片段并走 preview 渲染管线；监听变更信号做 debounce 增量刷新。
- Command routing：
  - 参考 `sync-embeds`，用 `monkey-around` patch `app.commands.executeCommand` / `workspace.getActiveViewOfType` / `workspace.activeLeaf`。
  - 基于 focus tracking 决定命令应落到哪一个嵌入 editor。

## Reference Implementations
- `sync-embeds`（本机路径 `C:\\Users\\stati\\Git\\blp\\sync-embeds`）
  - `src/embed-manager.js`：leaf 创建、openFile、re-parent、detach/cleanup
  - `src/main.js`：focus tracking、command interception patch
  - `src/command-interceptor.js`：示例命令映射（BLP 目标是“尽量不做特化”，仅做路由）
- BLP 现有可复用能力
  - `src/shared/utils/obsidian.ts:getLineRangeFromRef()`：统一范围模型（含 `^id-id → ^id` 起点映射）
  - `src/shared/utils/codemirror/selectiveEditor.ts`：现有 selective editor（需扩展以支持“可见 vs 可编辑”）
  - `src/basics/flow/patchWorkspaceForFlow.ts`：已有 monkey-around 使用经验（将被新引擎替换）

## Breaking Changes
- 删除/不再支持：`!![[...]]`、editable embed 命令/右键入口/设置项/文档描述。
- 删除：`editorFlowStyle`。
- Timeline：删除 `embed_format` 与 `timelineDefaultEmbedFormat`，统一输出 `![[...]]`。

## Risks & Mitigations
- 多个嵌入 editor 并存：严格的 leaf 生命周期管理（detach/unload）、索引清理、focus 状态清理。
- 模式切换（Live Preview ↔ Reading）：保持“只在 Live Preview 挂 editor”，切换时完全卸载 leaf，避免残留 DOM。
- 第三方 post processor（Dataview 等）：Reading 的自定义渲染必须使用源文件 `sourcePath`，并尽量走 Obsidian 的 preview 管线。

## Validation Plan
按 `tasks.md` 的 Milestones 逐步集成；每个 Milestone 必须满足：
- 可编译/可加载插件
- 手动验收用例通过
- 控制台无新增错误