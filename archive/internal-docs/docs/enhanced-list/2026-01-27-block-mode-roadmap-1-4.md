# Enhanced List Block Mode Roadmap (1-4)

> Status (2026-02 / v2.0.0): Historical roadmap. The "Enhanced List + vendored vslinko" approach was removed; current Outliner lives under `src/features/file-outliner-view/`.

目标：在 **Enhanced List scope 内**把 Obsidian 的 list item 编辑体验尽量推进到 Logseq/Roam 的 “block-first 流畅感” 8~9 成。

本文只描述路线图与实现落点；具体实现以 OpenSpec change 为准。

## 约束（必须遵守）

1. **只在 Enhanced List 启用范围生效**（文件/文件夹/frontmatter）；不影响普通笔记。
2. **不做持久化索引**（不落盘、不写 cache 文件）；最多允许短期内存缓存（随重载丢失）。
3. **不把段落当 block**：block 单元坚持只做 list item。
4. **尽量不改动用户文本**：除 system line（`[date:: ...] ^id`）相关的必要修复外，避免自动写入；任何标准化仅在 save 且仅 touched 范围内生效。
5. **Live Preview 优先**：核心交互只在 Live Preview 做；Source mode/Reading mode 做安全降级。
6. **归属优先（该改内置就改内置）**：凡是明显属于 Outliner/Zoom 的“列表编辑语义”（选择/移动/缩进/剪贴板等），优先修改 vendored vslinko 内置实现；BLP 侧只做 scope gating、system line 与 BLP 特有能力的集成，避免把应由内置插件负责的逻辑硬塞进 BLP。

## 现有基础（BLP 已经有的）

- block identity：list item 的 system line（`[date:: ...] ^id`）+ save-time repair/normalize（仅 scope + touched）。
- block mode（部分）：vendored vslinko outliner/zoom（缩进/移动/折叠/拖拽/zoom）+ handle affordance/actions。
- block context（部分）：`blp-view`（query-as-block 的渲染入口）+ inline edit（`![[file#^id]]`）。

## 1) 块选择语义（最优先）

“像 Logseq/Roam”的第一步不是更多命令，而是 **块选择模型**统一：

### 体验目标（验收）

- 点击 list handle（bullet）= 选中一个 block（视觉高亮是 block，而不是文本 selection）。
- Shift + 点击 handle = 连续多块选中（以块为粒度）。
- Esc 退出块选择（回到正常文本编辑）。
- 不触发内容写入；不依赖持久化数据；不影响非 scope 文件。

### 落点（建议实现方式）

- 新增一个 **Block Selection State**（CM6 StateField 或 ViewPlugin 内部状态）：
  - 存储选中的块集合（优先用 doc position；必要时用 `^id` 做稳定锚点）。
  - 负责把“选中块”渲染为 decorations（高亮整块/整棵子树）。
- 复用现有 handle click 入口（`handle-actions-extension.ts`）：
  - 新增 clickAction：`select-block`
  - 解决与拖拽冲突：拖拽后 suppress click（沿用已有 DnD 抑制逻辑）。

### 参考（已有插件的实现思路）

- `blorbb/obsidian-blockier`：实现了 “Select Block”（覆盖 Ctrl/Cmd+A），可参考其“排除前缀的块范围计算”。
- `vslinko/obsidian-outliner`：已有 “Ctrl/Cmd+A 在 list 内循环选择范围” 的语义，可参考其 block-range 计算与 operation 结构。

## 2) 子树级剪贴板（copy/cut/paste 保持块树）

目标：让 “多块选中” 产生真实生产力闭环。

### 体验目标（验收）

- 在 block selection 模式下：
  - Copy/Cut/Paste 以 **块树**为单位（保持子树结构）。
  - Cut/Paste：尽量保持原 `^id`（移动语义）。
  - Copy/Paste：允许产生重复 `^id`，但需在 paste 后即时修复或依赖 save-time duplicate repair（需权衡体验与一致性）。
- 与系统行隐藏共存：用户剪贴板默认不应携带隐藏 system line 噪音（否则外部粘贴体验很差）。

### 落点（建议实现方式）

- 拦截 copy/cut/paste（CM6 DOM handler 或 keymap commands）：
  - 若存在 block selection：用块范围序列化为剪贴板文本；必要时携带内部 mime（自定义类型）以便“内部粘贴保真”。
  - Paste 时解析内部 mime（若存在）恢复块树；否则按普通文本 paste。

## 3) 块引用插入体验（“(( 搜索块并插入引用/嵌入”）

目标：把“复制块链接”提升为 **编辑器内的引用插入工作流**。

### 体验目标（验收）

- 在当前光标处打开 “block picker”：
  - 搜索：按 text + file + 最近编辑排序（可选）。
  - 插入：`[[file#^id]]` 或 `![[file#^id]]`（可切换）。
  - 预览：展示命中块的上下文（父链/相邻若干块）。

### 参考插件

- `tyler-dot-earth/obsidian-blockreffer`：已实现“搜索并嵌入 `^block`”，可参考其索引/搜索与 UI 形态。
- `digvijay-s-todiwal/phrasesync`：中途输入链接/块引用的建议，可参考其 suggestion pipeline。

## 4) 块级 backlinks + peek context（编辑器内闭环）

目标：不离开编辑器就能看到“谁引用了我/我在上下文中的位置”。

### 体验目标（验收）

- 对任意块：一键/hover 打开 peek：
  - 显示父链 + 同级前后若干块（context）。
  - 显示 block-level backlinks（轻量：按需扫描 + 短期缓存；不持久化）。
- 与 `blp-view` 结果项一致：在 query 结果里也能 peek/context。

### 落点（建议实现方式）

- 构建 `file#^id` 的反向引用（按需扫描；可做 LRU 内存缓存）。
- UI 优先 popover/inline panel；避免新视图体系。

## 建议落地顺序（本路线图对应 OpenSpec changes）

1. Block selection model（本文件对应的第一个 change）
2. Subtree clipboard（依赖 1）
3. Block reference insertion（依赖 1，可与 2 并行）
4. Backlinks + peek context（依赖 1，且最好与 3 配套）
