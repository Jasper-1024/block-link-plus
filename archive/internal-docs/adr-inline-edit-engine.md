# ADR：Inline Edit 引擎替换（Basics → sync-embeds 风格）
*状态：已接受 | 日期：2025-12-19*

## 背景
- BLP 当前 inline edit/范围裁剪来自 vendored `Obsidian-Basics`（`src/basics/*`），上游停更，关键缺陷难以修复。
- [`sync-embeds`](https://github.com/uthvah/sync-embeds/) 证明了更稳的底层路径：真实 `MarkdownView`/editor leaf + re-parent + focus + 命令/热键路由。
- BLP 必须保留 `^id-id` 多行范围语法，并让其行为尽量等同 `#Heading/#^id`。

## 约束/共识
- 不支持 `!![[...]]`：不作为开关、不做容错、不做清理；按原样文本/原生渲染处理。
- Inline edit 是否可编辑仅由设置控制：全局开关 + 3 个子开关（`整页(file)`、`Heading`、`Block`）。其中 `Block` 覆盖 `#^id` 与 `#^id-id`。
- Reading 强制只读：普通 `![[...]]` 走 Obsidian 原生嵌入；`#^id-id` 由 BLP 额外渲染以对齐 `#^id`（原生不支持范围）。
- Live Preview 是否可编辑取决于设置；默认策略为“可见即加载”（最小 lazy），不提供激活方式/最大并发等复杂配置。
- 初版不递归（不在嵌入 editor 内再创建嵌入 editor）。
- 行级只读规则：
  - `#Heading` 的标题行必须“可见但只读”（不纳入可编辑范围）。
  - `#^id-id` 的末尾 marker 行必须“可见但只读”（不纳入可编辑范围）。
  - `#^id-id` 首行的 `^id` token 暂不加固（可被编辑），避免完美主义；若出现真实问题再加固。
- `![[file#ref|alias]]` 的 `|alias` 对嵌入无意义，解析时忽略。
- 整页 `![[file]]` 必须支持，但默认关闭。
- 删除 `editorFlowStyle` 与所有 `!!` 相关的命令/设置/描述/文档；Timeline 不再提供 `embed_format`，统一输出 `![[...]]`。

## 决策

### D0：交付形态
- 决定：在分支完成重构；release 仅保留新引擎，不维护“旧引擎/新引擎”双轨。
- 理由：避免长期分叉与配置爆炸；迁移成本一次性承担。

### D1：替换 Basics 引擎
- 决定：移除 Basics 派生的 inline edit/flow editor 链路，尽量移植 `sync-embeds` 中成熟的 leaf 生命周期、re-parent、focus 与命令路由实现。
- 理由：Basics 路线不可维护；`sync-embeds` 的实现更贴近 Obsidian 原生模型，bug 面更可控。

### D2：触发与配置
- 决定：inline edit 仅由设置控制：全局开关 + 类型开关（`整页(file)`、`Heading`、`Block`）。
- 决定：不支持 `!![[...]]`；也不再存在任何“editable embed”概念（不保留设置/命令/文案）。
- 决定：Timeline 不再支持 `embed_format`，统一输出标准 `![[...]]`。
- 理由：语法/行为解耦；减少用户心智；避免历史包袱拖累新引擎一致性。

### D3：统一范围模型（可见 vs 可编辑）
- 决定：对 `#Heading`、`#^id`、`#^id-id` 统一计算可见行范围 `[startLine,endLine]`，作为跳转/高亮/渲染的唯一输入。
- 决定：在可见范围基础上派生“可编辑范围”，以满足行级只读：
  - `Heading`：可见 `[start,end]`；可编辑 `[start+1,end]`（标题行只读）。
  - `BlockID`（`#^id`）：可见=可编辑 `[start,end]`。
  - `Range`（`#^id-id`）：可见 `[start,end]`；可编辑 `[start,end-1]`（末尾 marker 行只读）。
- 决定：复用 BLP 既有资产：`getLineRangeFromRef()`（含 `^id-id → ^id` 起点映射）与 selective editor 的裁剪能力。
- 理由：语义统一；避免把 `sync-embeds` 的“仅 heading viewport”限制带入 BLP；同时支持“行可见但只读”的细粒度控制。

### D4：分模式行为
- Live Preview：
  - 决定：可编辑时展示真实 `MarkdownView` editor leaf（`sync-embeds` 风格 re-parent）。
  - 决定：`#Heading` 标题行可见但只读；`#^id-id` 末尾 marker 行可见但只读。
  - 决定：`#^id-id` 必须额外渲染（原生不支持范围）；当 inline edit 关闭时，渲染为只读展示 + 跳转/高亮。
- Reading：
  - 决定：强制只读；普通 `![[...]]` 走原生嵌入，不做额外处理；仅 `#^id-id` 走 BLP 自定义渲染补齐范围语义。
  - 决定：`#^id-id` 抽取范围片段并走 preview 渲染管线渲染到原生 embed shell；永远只读，外观尽量等同原生 block embed。
  - 决定：跳转/高亮对齐 `#Heading/#^id`；初版采用 A：高亮边界允许包含 marker 行。
  - 决定：渲染上下文使用源文件 A（被嵌入目标）而非宿主文件 B。
  - 决定：增量刷新：监听 `Vault.on('modify')`/`MetadataCache` 更新信号，按源文件路径索引并 debounce 后重渲染受影响片段。
  - 假设：预览通常隐藏/弱化 `^id` token；若泄露仅做 display-only 修正（不改文件）。

### D5：不递归（初版）
- 决定：检测嵌入 editor 容器并跳过处理，不再创建二级嵌入 editor。
- 理由：避免 editor-in-editor 与引用环；简化 focus/路由/清理。

### D6：动态渲染一致性
- 决定：同一模式下嵌入与原地一致（Live Preview → Live Preview；Reading → Reading），包含 Dataview 等动态 post processor 的表现。
- 理由：用户预期“嵌入即原地”；避免语义分叉。

### D7：命令/热键路由（sync-embeds 风格）
- 决定：以“焦点在嵌入 editor 内”为边界，最小 patch `app.commands.executeCommand` / `workspace.getActiveViewOfType` / `workspace.activeLeaf` 等，使 Obsidian 命令（含用户自定义热键）落到嵌入 editor。
- 理由：让快捷键/命令在嵌入与原地一致；避免为每个命令做特化适配并降低冲突面。

### D8：性能策略
- 决定：仅做局部最小 lazy（可见即创建/挂载），不提供激活方式/最大并发等高级配置；进一步性能兜底后续再议。
- 理由：控制资源成本，同时避免配置膨胀。

## 备选方案与取舍（成本预估）
- Reading 渲染：
  - 方案1（选定）：preview 管线渲染片段 + 增量刷新，预计 ~200–400 LOC，风险中。
  - 方案2：嵌入 preview `MarkdownView`，预计 ~800–1500+ LOC（leaf 生命周期、裁剪、路由、清理），风险高。
- 递归：
  - 不递归（选定）：容器打标 + 跳过扫描，预计 ~10–50 LOC。
  - 限深+防环：额外状态与路径跟踪，预计 ~100–300+ LOC + 额外测试与兼容成本。

## 风险/待确认
- `#^id-id` Reading 刷新信号抖动与重渲染粒度（需 debounce + 局部更新）。
- 多个嵌入 editor 共存时的 focus/命令路由与资源清理稳定性。
- 预览管线对第三方动态插件（Dataview 等）的触发一致性（上下文/`sourcePath` 必须正确）。
