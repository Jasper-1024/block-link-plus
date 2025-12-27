# ADR：Inline Edit 引擎替换（Basics → Sync-embeds 风格）
*状态：已接受 | 日期：2025-12-19*

## 背景
- BLP 当前 inline edit/范围裁剪来自 vendored `Obsidian-Basics`（`src/basics/*`），上游停更，关键缺陷难以修复。
- `sync-embeds` 证明了更稳的底层路径：真实 `MarkdownView`/editor leaf + re-parent + focus + 命令/热键路由。
- BLP 必须保留 `^id-id` 多行范围语法，并让其行为尽量等同 `#Heading/#^id`。

## 约束/共识
- `!![[...]]` 彻底废弃（仅保留容错）；唯一输入为标准 `![[...]]`。
- Reading 强制只读；普通嵌入交给原生；`^id-id` 需额外渲染以对齐 `#^id`。
- Live Preview 是否可编辑取决于设置；默认策略为“可见即加载”（最小 lazy），不提供激活方式/最大并发等选项。
- 初版不递归（不在内联 editor 内再创建内联 editor）。
- `#Heading` 标题行不允许编辑；`^id-id` marker 行不允许编辑且不纳入编辑范围。
- 不保护首行行尾 `^id` token；出现真实问题再加固。
- `![[file#ref|alias]]` 的 `|alias` 对嵌入无意义，解析时忽略。
- 整页 `![[file]]` 必须支持，但默认关闭。

## 决策

### D0：交付形态
- 决定：在分支完成重构；release 仅保留新引擎，不维护“双引擎/双实现”。
- 理由：避免长期分叉与配置爆炸；迁移成本一次性承担。

### D1：替换 Basics 引擎
- 决定：移除 Basics 派生的 inline edit/flow editor 链路，以 sync-embeds 的 leaf/re-parent/route 方式实现。
- 理由：摆脱不可维护代码；复用成熟的 editor 语义与命令路由思路。

### D2：触发与配置
- 决定：inline edit 仅由设置控制：全局开关 + 类型开关（`整页(file)`、`Heading`、`BlockID(^id)`、`Range(^id-id)`）。
- 决定：`!![[...]]` 仅作兼容：按 `![[...]]` 解析（清理多余 `!`），不再作为开关。
- 理由：语法/行为解耦；减少用户心智；保留旧笔记可用性。

### D3：统一范围模型
- 决定：对 `#Heading`、`#^id`、`#^id-id` 统一计算行范围 `[startLine,endLine]`，作为跳转/高亮/渲染/编辑的唯一输入。
- 决定：复用 BLP 既有资产：`getLineRangeFromRef()`（含 `^id-id → ^id` 起点映射）与 selective editor 的范围裁剪能力。
- 理由：语义统一；避免把 sync-embeds 的“仅 heading viewport”限制带入 BLP。

### D4：分模式行为
- Live Preview：
  - 决定：内联展示真实 `MarkdownView` editor；是否可编辑由 D2 的设置决定。
  - 决定：`#Heading` 标题行只读；`^id-id` 末尾 marker 行只读且不纳入编辑范围（首行 `^id` token 不保护）。
  - 决定：`^id-id` 即使 inline edit 关闭也必须渲染（原生不支持），此时只读展示 + 跳转/高亮。
- Reading：
  - 决定：普通 `![[...]]` 走 Obsidian 原生嵌入，无额外处理；仅为 `^id-id` 补齐渲染。
  - 决定：`^id-id` 抽取范围片段并走 preview 渲染管线渲染到原生 embed shell；永远只读，外观尽量等同原生 block embed。
  - 决定：跳转/高亮对齐 `#Heading/#^id`；初版采用 A：高亮边界允许包含 marker 行。
  - 决定：渲染上下文使用源文件 A（被嵌入目标）而非宿主文件 B。
  - 决定：实现轻量刷新：监听 `Vault.on('modify')`/`MetadataCache` 更新信号，按源文件路径索引并 debounce 后重渲染受影响片段。
  - 假设：预览侧通常隐藏/弱化 `^id` token；若泄露仅做 display-only 修正（不改文件）。

### D5：不递归（初版）
- 决定：内联 editor 容器内跳过扫描，不再创建二级内联 editor（仍允许普通渲染管线工作）。
- 理由：避免 editor-in-editor 与引用环；简化 focus/路由/清理。

### D6：动态渲染一致性
- 决定：同一模式下嵌入区与原地一致（Live Preview ↔ Live Preview；Reading ↔ Reading），包含 Dataview 等动态 post processor 的表现。
- 理由：用户预期“嵌入即原地”；避免维护分叉语义。

### D7：命令/热键路由（sync-embeds 风格）
- 决定：以“焦点在嵌入 editor 内”为边界，最小 patch `app.commands.executeCommand` / `workspace.getActiveViewOfType` / `workspace.activeLeaf` 等，使命令落到嵌入 editor。
- 理由：让快捷键/命令（含用户自定义）在嵌入区与原地一致；避免为每个命令写特化逻辑并降低冲突面。

### D8：性能策略
- 决定：仅内部最小 lazy（可见即创建 leaf/editor），不提供激活方式/最大并发等选项；进一步性能兜底后续再议。
- 理由：控制资源成本，同时避免配置膨胀。

## 备选与取舍（成本预估）
- Reading 渲染：
  - 方案1（选定）：preview 管线渲染片段 + 轻量刷新，预计 ~200–400 LOC，风险中。
  - 方案2：嵌入 preview `MarkdownView`，预计 ~800–1500+ LOC（leaf 生命周期、裁剪、路由、清理），风险高。
- 递归：
  - 不递归（选定）：容器打标记 + 跳过扫描，预计 ~10–50 LOC。
  - 限深+防环：额外状态与路径跟踪，预计 ~100–300+ LOC + 额外测试与兼容成本。

## 风险/待验证
- `^id-id` Reading 刷新信号抖动与重渲染粒度（需 debounce + 局部更新）。
- 多个内联 editor 共存时的 focus/命令路由与资源清理稳定性。
- 预览管线对第三方动态插件（Dataview 等）的触发一致性（上下文/`sourcePath` 需正确）。
