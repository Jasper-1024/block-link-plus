# Enhanced List Blocks Ops：与 vslinko 插件的“效果差异”对比（历史记录）

> 目的：记录 BLP 自研 Enhanced List Blocks Ops 与参考插件（`obsidian-zoom` / `obsidian-outliner`）的**可见效果/交互差异**，用于回溯“为什么要切换路线/做取舍”。

## 路线变更（2026-01-10）

- BLP 不再维护自研 Enhanced List Blocks Ops（Zoom/Move/Indent/Drag&Drop/Vertical lines/Bullet threading）。
- 改为在 BLP 内置（vendor）`obsidian-zoom@1.1.2` 与 `obsidian-outliner@4.9.0`（MIT 保留），以获得与原插件一致的交互手感，并把后续 bugfix 建立在上游实现之上。
- 因此，“剩余差异”从“效果/手感差异”转为“集成差异”：
  - 命令与热键的命名空间不同（BLP 内置的命令 ID 归属于 `block-link-plus:*`）。
  - 设置入口/存储位置不同（集中在 BLP 设置页；检测到外置插件启用时会自动禁用内置版本以避免双注册）。
  - 样式加载方式不同（vendor CSS 由 BLP 统一引入，可能与主题/其他插件的覆盖优先级不同，需要手工校验）。

## 更新（2026-01-09）

- Zoom：已补齐 selection clamp + 越界编辑自动 zoom-out（对齐 `obsidian-zoom` 的 guardrails）。
- Zoom：已加入顶部 breadcrumb header（可点击：zoom out / zoom 到祖先 subtree）。
- Drag & Drop：已补齐 `Escape` 取消、拖拽期间内容变化拒绝 drop、并用 `Platform.isDesktop` 做桌面端 gate。
- Zoom 隐藏实现已改为 StateField 提供 block decorations（避免 CodeMirror 抛 `Block decorations may not be specified via plugins`）。
- 相关测试已补：`src/features/enhanced-list-blocks/ops/__tests__/zoom-guardrails.test.ts`、`src/features/enhanced-list-blocks/ops/__tests__/drag-drop-guardrails.test.ts`。

## 对比基准（参考版本）

- `obsidian-zoom`：`1.1.2`（manifest `id: obsidian-zoom`，描述：Zoom into heading and lists）
- `obsidian-outliner`：`4.9.0`（manifest `id: obsidian-outliner`，描述：Work with your lists like in Workflowy or RoamResearch）

## 0. 总体范围与启用方式

### BLP（Enhanced List Blocks Ops）

- **作用范围**：仅在“启用增强”的文件内生效（启用文件夹/启用文件列表/`blp_enhanced_list: true` 任一命中即启用）。
- **编辑模式**：仅 Live Preview（强制 gate；非 Live Preview 直接 no-op/提示）。
- **默认状态**：所有 Ops 开关默认关闭；用户显式开启才生效。
- **冲突策略**：
  - 检测到 `obsidian-zoom` 启用：**拒绝开启** BLP Zoom。
  - 检测到 `obsidian-outliner` 启用：**拒绝开启** BLP outliner-like 模块（move/indent/dnd/vertical-lines/threading）。

### vslinko 插件（zoom/outliner）

- **作用范围**：插件启用后通常对编辑器全局生效（不依赖 BLP 的“启用增强文件范围”）。
- **共存关系（vslinko 内部）**：`obsidian-outliner` 会检测 `window.ObsidianZoomPlugin`，在部分功能里**可选调用** `obsidian-zoom` 的 API（例如“垂直线点击触发 zoom-in”这类动作）。

## 1. Zoom（聚焦显示）

### BLP Zoom（当前实现）

- **只能 zoom 到 list subtree**：通过 `metadataCache.listItems` 解析当前光标所在 list item 的子树范围（line range），隐藏范围外内容。
- **触发方式**：仅命令触发（`Enhanced List: Zoom in to subtree` / `Enhanced List: Zoom out`）；不提供“点 bullet 触发 zoom”。
- **前置条件**：不要求 Obsidian 开启 fold indent / fold heading。
- **UI 表现**：
  - 隐藏范围外内容（StateField 提供 CodeMirror block decorations）
  - 顶部 breadcrumb header（可点击：zoom out / zoom 到祖先 subtree）
- **交互约束/保护**：已补齐 selection clamp + 越界编辑自动 zoom-out（复用 `obsidian-zoom` guardrails）。

### `obsidian-zoom`（参考效果）

- **zoom 目标更广**：可 zoom 到 heading 或 list（依赖 `language.foldable` 计算折叠范围；如果是 list 行但不可 fold，则 zoom 到单行）。
- **触发方式**：
  - 命令：Zoom in / Zoom out（默认热键 `Mod+.` / `Mod+Shift+.`）
  - 可选：开启 setting 后，点击 list 的 bullet/marker 触发 zoom。
- **前置条件**：要求 Obsidian Editor 设置里开启 `Fold heading` + `Fold indent`（否则 Notice 提示并拒绝 zoom）。
- **UI/保护更强**：
  - 顶部 breadcrumb header（可点击导航/zoom out）
  - 选区限制：zoom 时/zoom 后将 selection clamp 在可见范围内
  - 越界编辑检测：如果编辑同时触达可见区与隐藏区，会自动 zoom out（防止边界被破坏）

## 2. Move subtree up/down（子树上移/下移）

### BLP（当前实现）

- **定位子树**：基于 `metadataCache.listItems` 的 `startLine/endLine/parent` 推导“当前光标所在的最小包含子树”。
- **移动策略**：仅在“同父节点兄弟 list item”之间交换连续行区间（文本层面 swap），属于 best-effort。
- **有意限制**：仅当前文件、仅启用增强文件、仅 Live Preview。
- **与 outliner 的关键体验差异**：
  - 不做“有序列表数字重排”（移动后 `1./2./3.` 等数字保持原样）。
  - 缩进单位使用推断值（从父子缩进差异推断；失败时用 tab/两空格 fallback），不直接读取 Obsidian 的“默认缩进字符”设置。

### `obsidian-outliner`（参考效果）

- **更接近“结构化移动”**：内部 parser 把 list 解析为节点树，然后执行 move。
- **默认热键**：`Move list and sublists up/down`（默认 `Mod+Shift+ArrowUp/Down`）。
- **更强的配套行为**：
  - 会重算 numeric bullets（保证有序列表编号更一致）
  - 拖拽/移动过程中有“内容变更保护”（拖拽开始与结束之间内容变化会拒绝 apply 并提示）

## 3. Indent / Outdent subtree（子树缩进/反缩进）

### BLP（当前实现）

- **Indent**：
  - Roam/Logseq 风格：只有存在 prev sibling 才允许 indent（变为 prev sibling 的 child）。
  - 缩进单位同上（推断值）。
- **Outdent**：
  - 反缩进 1 级，并把子树**移动到 parent subtree 之后**（避免“捕获后续兄弟为子项”的常见问题）。
  - 为保证 undo 原子性，使用“整篇替换”的方式提交变更（而不是只 patch 局部）。

### `obsidian-outliner`（参考效果）

- **Indent**：同样要求存在 prev sibling；indentChars 的选择更贴近实际文档（优先从相邻结构推断，否则 fallback 到 Obsidian 默认缩进字符）。
- **Outdent**：将当前 list 从 parent 移到 grandparent 下，顺序上表现为“parent subtree 之后”（同样避免捕获兄弟）；并重算 numeric bullets。

## 4. Drag & Drop（拖拽移动/改变层级）

### BLP（当前实现）

- **触发区域**：每条 list line 左侧会渲染一个拖拽把手（`⋮⋮`），hover 时显示；通过 HTML5 drag events 实现。
- **拖拽范围限制**：
  - 仅桌面端（`Platform.isDesktop` gate；移动端不启用）。
  - 不支持跨文件（gate 要求同一 filePath）。
  - 仅在“启用增强文件 + Live Preview”内启用 UI 与事件监听。
  - 额外做了“同 list group”限制：通过 `metadataCache.listItems` 沿 `parent` 向上找到顶层祖先后计算 `groupKey`，拖拽与目标 `groupKey` 不一致则拒绝。
    - 注：该 `groupKey` 的区分能力取决于 Obsidian listItems 的 `parent` 语义；对“多个顶层 list 分组”的隔离可能并不严格（需要手动验证）。
- **安全护栏**：`Escape` 可取消拖拽；拖拽期间内容变化会拒绝 drop 并提示。
- **放置逻辑（影响体验的核心差异）**：
  - 默认：根据鼠标 y 与目标行中点，决定 above/below。
  - `Shift`：强制 drop 为 child（目标层级 +1）。
  - `Alt`：强制 drop 为 outdent（目标层级 -1，最小为 0）。
  - 不能像 outliner 那样通过左右拖动选择任意层级（目前只有“相对目标 +1 / -1”两种层级变化）。
- **可视化**：用 line decoration 高亮 drop target，并用 border（实线/虚线）区分 placement。

### `obsidian-outliner`（参考效果）

- **触发区域**：直接按住 bullet/折叠指示器/checkbox 拖拽（命中 `.cm-formatting-list` / `.cm-fold-indicator` / `.task-list-item-checkbox` 等）。
- **放置逻辑**：
  - 基于“候选 dropVariants”集合，结合鼠标 **y 选最近行** + 鼠标 **x 选最近层级**。
  - 支持 before/after/inside，并且层级可通过水平移动连续选择（更接近 Roam/Workflowy 的手感）。
- **拖拽取消**：`Escape` 可取消。
- **平台限制**：拖拽特性本身带 `Platform.isDesktop` gate（移动端直接不启用）。
- **可视化**：body overlay 的 drop zone（含“缩进预览虚线”）+ dragging/dropping 行高亮。

## 5. 垂直缩进线（Indentation guides）

### BLP（当前实现）

- **实现方式**：纯 CSS，在 `.cm-indent::before` 画线（非交互）。
- **范围**：仅 Live Preview + 启用增强文件。
- **主题兼容性**：best-effort（依赖 `.cm-indent` 的布局与主题变量）。

### `obsidian-outliner`（参考效果）

- **实现方式**：在编辑器 DOM 中插入 overlay container，并渲染可点击的竖线元素（`.outliner-plugin-list-line`）。
- **范围**：全局（不依赖 BLP 启用范围）。
- **额外能力**：竖线点击可触发 action（如 toggle folding；或在检测到 `window.ObsidianZoomPlugin` 时触发 zoom-in）。
- **主题约束**：只在“Obsidian 默认主题启用”时工作（源码里有 gate）。

## 6. Bullet Threading（active path 高亮）

- **BLP（当前实现）**：高亮“当前 list item + 祖先链”行（左侧竖条），类似 Logseq bullet threading 的“active path”概念，但目前仅做最小 UI（不做更复杂的侧边高亮/交互）。
- **vslinko 插件**：`obsidian-zoom` / `obsidian-outliner` 均不提供同等的 bullet-threading 样式；`obsidian-outliner` 的“竖线 overlay”更偏向结构提示与折叠/zoom 操作入口。
