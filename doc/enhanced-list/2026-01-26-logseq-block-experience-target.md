# Logseq/Roam Block Experience Target (BLP, list-item only)

> Status (2026-02 / v2.0.0): Historical notes. The Enhanced List + vendored vslinko implementation referenced here was removed; current Outliner + `blp-view` live under `src/features/file-outliner-view/`.

目标：在 Obsidian 中以“本地化、低侵入”的方式复现 80%~90% 的 Logseq/Roam block-first 体验；块单元坚持只做 **list item**（不把普通段落当块）。

本文是备忘与评估，不是实现计划。

## 背景与现状（BLP 已经有的地基）

BLP 当前在“块体验”相关的关键资产：

- Enhanced List Blocks：把 list item 作为 block 单元，并用隐藏 system line（如 `[date:: ...] ^id`）补齐“块身份 + 元数据”。
- 内置 Outliner/Zoom（vendored vslinko）：提供缩进、折叠、拖拽、zoom 等核心编辑操作；并已做 scope gating（只在指定范围生效）。
- Inline Edit Engine：对 `![[file#^id]]`（以及 range）提供更一致的嵌入编辑体验。
- `blp-view`（Dataview-backed Query/View）：查询结果可渲染为 embed-list/table，是“query 结果即块”的入口。
- Handle actions：在 list handle 上挂载菜单/动作（复制块链接/嵌入、折叠、zoom），是“块交互入口”的天然载体。

相关代码入口（便于后续定位）：

- Handle 菜单/动作：`src/features/enhanced-list-blocks/handle-actions-extension.ts`
- `blp-view`：`src/features/enhanced-list-blocks/blp-view.ts`
- Inline Edit Engine：`src/features/inline-edit-engine/InlineEditEngine.ts`
- Built-in vslinko scope：`src/features/built-in-vslinko/scope-extension.ts`

## 约束（为什么坚持 list item only）

坚持 list item 作为唯一 block 单元，主要是为了：

- 低侵入：不改 Obsidian 的文件/段落范式，保持 Markdown 可读可迁移。
- 更稳定：Obsidian/CM6 对 list item 有较多结构语义；段落“块化”会显著放大渲染/选择/事务一致性风险。
- 可控范围：通过 Enhanced List enable scope（文件/文件夹/frontmatter）实现“只在需要的地方像 Logseq”。

## 核心差距（不是功能数量，而是块语义是否统一）

Logseq/Roam 的“流畅”来自三件事闭环：

1) Block Kernel：稳定的块树/块范围/块身份（所有功能共用同一套块模型）
2) Block Mode：鼠标/键盘的肌肉记忆都以“块”为单位（选择、移动、缩进、复制粘贴、Enter/Backspace 语义一致）
3) Block Context：引用/嵌入/回链/上下文永远在手边（不需要离开编辑器）

BLP 已经覆盖了 1) 的一部分（身份与部分操作），也覆盖了 3) 的一部分（inline edit / zoom / embed）；主要欠缺是 **2) Block Mode 的统一语义**，以及 **3) 回链与上下文闭环**。

## 80% / 90% 的“体验验收”拆解（面向 BLP）

### 80%：Block Mode + Context 的最小闭环（编辑器内）

- 块选择语义：单块选中、多块选中（连续为主），并能做块级复制/剪切/粘贴（保持子树）
- 块移动语义：上下移动、缩进/反缩进、拖拽重排（落点正确、子树不丢）
- 块结构语义：Enter/Backspace 的块级规则（新建同级块、合并/拆分块）保持一致
- 上下文随手：对任意块都能“peek context / zoom into context”，最少包含父链 + 同级前后若干块

备注：你之前遇到的拖拽/错位类问题，本质都是“块范围计算 + CM6 渲染测量时机 + 事务”没有完全统一造成的短暂不一致。

### 90%：块引用/嵌入/回链 + Query 结果即块

- 块引用/嵌入入口统一：对当前块，一键插入引用/嵌入，并可预览上下文
- 块级回链：能看到“哪些位置引用了该块”（先做轻量：文件+命中位置附近几行；再做强：回链项可操作）
- Query 结果当块用：`blp-view` 的 embed-list 默认可 inline-edit，并继承同一套块菜单（复制/上下文/zoom）
- 任务/属性的块级快捷操作（轻量）：优先复用 Obsidian task 语法（`- [ ]`），做“cycle/toggle + 少量通用属性写入 system line”，避免自造一整套任务系统

## A/B/C 三方向评估（都看，但建议落地顺序）

### A) 块上下文 + 块级回链（Context/Backlinks）

收益：极高（从“像插件效果叠加”变成“像块系统”）。

与 BLP 现状咬合点：

- Handle actions 已是块入口：可以扩展为 `Peek context / Show backlinks / Open context (zoom)`。
- 依赖 block identity：Enhanced List system line 的 `^id` 是天然主键。

主要风险：

- 性能与一致性：需要构建 `file#^id` 的反向索引（不能全依赖 Obsidian 默认 backlink）。
- UI 形态：必须保持“轻量、编辑器内、不割裂”（优先 popover/hover/inline panel，而不是新视图体系）。

### B) 块任务/属性（Tasks/Properties）

收益：高（长期粘性）；但更容易与生态冲突。

建议边界：

- 优先支持 task cycle（`TODO`/`DOING`/`DONE` 等）和少量通用属性（如 `date`, `due`, `tags`）。
- 元数据继续落在 system line（Dataview 可索引），避免引入独立数据库。

### C) `blp-view` 结果即块（Query-as-block）

收益：很高，且能放大 BLP 的 inline edit 差异化。

建议分层：

- 低风险：查询结果项可 inline-edit、可复制引用/嵌入、可打开上下文/zoom。
- 高风险（可选实验开关）：拖拽“写回”（把结果块移动/插入到某处），需要定义冲突处理与撤销策略。

### 建议落地顺序（最大化体感、最小化割裂）

1) A：Context/Backlinks 闭环（先轻量）
2) C：`blp-view` embed-list 结果继承块菜单 + inline-edit
3) B：task cycle + 少量属性（与 `blp-view` 查询立即联动）

## 风险清单（实现时需要提前设计的点）

- CM6/Live Preview 的渲染重建：任何“对齐/缩进/高亮”的 DOM 计算都要考虑事务时机，避免短暂错位。
- 块范围与子树：拖拽/移动/粘贴必须以“块树”为单位，否则很容易吞掉换行或子项。
- Scope：所有“像 Logseq 的行为”必须可限定范围（文件/文件夹/frontmatter），默认不干扰普通笔记。
- 兼容性：任务/高亮/装饰类插件多，必须以“最小 CSS 与最少 DOM 改写”为原则。

## 下一步（如果要进入实现）

- 把 80%/90% 拆成可测试的验收用例表（Block Mode 20 条、Context 10 条、Query/Task 10 条）。
- 然后再进入 OpenSpec：为 2.0 相关能力创建 change proposal（避免边做边改导致发散）。

