# File Outliner (v2) 编辑器集成调查

目标：解释 *为什么* `blp-file-outliner-view` 里的 block 编辑缺少 Obsidian 原生编辑器能力（`[[` 补全、`/` 指令建议、右键 editor-menu 等），并把“可行方案族”用 9222 实验验证清楚，给后续架构决策提供硬证据。

约束（本文件仅记录调查结论）：
- 不改插件源码（允许 CDP/9222 runtime patch 做验证）。
- 能验证的点必须先验证，再下结论。
- 语言压缩；只记“证据/结论/坑”。

## 现象
- `[[` 不触发 Obsidian 的文件/链接建议。
- 右键菜单不是原生 editor-menu（依赖 `workspace.on("editor-menu")` 的插件功能失效）。
- `/` 不触发原生 slash commands 建议。
- 其它“绑定 MarkdownView/editor 的能力”也缺失（命令补全、editor extensions、生态插件对 editor 的注入等）。

## 根因（已确认）
Outliner 不是 `MarkdownView`，其编辑器是 BLP 自己创建的独立 CM6 `EditorView`（最小化 `basicSetup`），不在 Obsidian 原生的 `MarkdownView + Editor` 管线内，因此：
- `view.editor` 不存在：大量 Obsidian/插件生态的“编辑器能力”天然接不到。
- Obsidian 为 Markdown editor 注入的 CM6 extensions（suggest/menu/slash 等）不会加载到这个 `EditorView` 上。

代码证据：
- `src/features/file-outliner-view/view.ts:392` 创建独立 `new EditorView(...)`
- `src/features/file-outliner-view/view.ts:402` 的 `createEditorState()` 仅用 `basicSetup + 自己的 keymap/updateListener`，没有 Obsidian markdown editor 的 extensions 栈

## 9222 实验记录（硬证据）

### E1：`editor-menu` 事件（Outliner 不触发；Markdown 触发）
做法：装一个全局计数器监听 `workspace.on("editor-menu")`，分别在 Outliner 和 Markdown editor 上 dispatch `contextmenu`。

安装计数器（CDP `Runtime.evaluate`）：
```js
(()=>{window.__blpMenuHits=0; window.__blpMenuOff?.(); const off=app.workspace.on('editor-menu', ()=>{window.__blpMenuHits++;}); window.__blpMenuOff=()=>app.workspace.offref(off); return {installed:true};})()
```

观测：
- Outliner（右键 bullet）：`window.__blpMenuHits` 不增长（=0）
- Markdown（右键 `.cm-content`）：`window.__blpMenuHits` 增长（=1）

结论：Outliner 的右键菜单不在 Obsidian editor-menu 管线内；即使用户“看到菜单”，生态插件也完全接不到。

### E2：CM6 view plugins 数量对比（Outliner 明显更少）
做法：读取 CM6 `EditorView.pluginMap.size`。

观测：
- Outliner：`pluginMap.size = 6`
- Markdown：`pluginMap.size = 15`

结论：Outliner 的 CM6 extensions 栈是“最小编辑器”，与 Obsidian Markdown editor 差距大；`[[`、`/` 等能力大概率就是缺失的 extensions/插件导致。

### E3：可行性验证——把“真实 MarkdownView”嵌到 Outliner（detached leaf + reparent）
做法：按 InlineEditEngine 的思路在运行时创建一个 detached `WorkspaceLeaf`，打开 MarkdownView，然后把 `leaf.view.containerEl` reparent 到 Outliner DOM 内；再右键触发 `editor-menu`。

验证代码（关键点：`leaf[Symbol.for("block-link-plus.detachedLeaf")] = true` 用来绕开 outliner routing）：
```js
(async()=>{
  const p='_blp_tmp/_cdp_suggest_test.md';
  const f=app.vault.getAbstractFileByPath(p);
  const host=document.querySelector('.workspace-leaf.mod-active .blp-file-outliner-view');
  const mount=host.createDiv({cls:'__cdp_detached_md_mount'});

  const LeafCtor=app.workspace.activeLeaf.constructor;
  const leaf=new LeafCtor(app);
  leaf[Symbol.for('block-link-plus.detachedLeaf')]=true;
  await leaf.openFile(f,{state:{mode:'source'}});

  mount.replaceChildren(leaf.view.containerEl);
  mount.querySelector('.cm-content')?.dispatchEvent(new MouseEvent('contextmenu',{bubbles:true,cancelable:true}));

  return {
    detachedLeafViewType: leaf.view?.getViewType?.(),
    detachedHasEditor: Boolean(leaf.view?.editor),
    menuHits: window.__blpMenuHits,
  };
})()
```

观测（当时返回）：
- `detachedLeafViewType = "markdown"`
- `detachedHasEditor = true`
- `menuHits` 从 1 变 2（说明 editor-menu 管线生效）

结论：用 “detached MarkdownView 作为编辑器内核” 是可行路径；它能天然恢复 `editor-menu` 等原生/生态注入点。

## 方案族（按“接近原生能力/可维护性”排序）

### S1（推荐）：编辑时复用真实 `MarkdownView`（detached leaf + reparent）
核心：Outliner 负责“结构/块树 UI”，编辑阶段把一个 detached MarkdownView（复用同一个 leaf）挂到当前 block 的编辑容器里。

收益：
- 原生能力自然回归：`[[` suggest、`/` slash commands、右键 editor-menu、生态插件的 editor 扩展。
- 不需要猜 Obsidian 私有模块/内部 extensions 栈。

代价/风险：
- 需要做“块范围 ↔ 文件位置”的映射（否则无法只编辑一个 block）。
- 需要处理 focus、滚动、leaf 生命周期（InlineEditEngine 里已有成熟范式可复用）。
- 必须保证 detached leaf 不被 outliner routing 劫持（本仓库已有 symbol 标记机制，E3 已验证可用）。

### S2：在自建 `EditorView` 上“补齐局部能力”（自研 suggest/menu/slash）
核心：继续用现在的 outliner `EditorView`，逐个补：
- `[[` completion：自己实现 completion source（vault 文件名、标题、block 引用等）
- `/`：自己实现命令建议 UI（基于 `app.commands.commands`）
- 右键：自己构建 menu；必要时手动触发 `workspace.trigger('editor-menu', ...)`（但需要伪造 Editor/View，兼容性不可控）

收益：不动现有编辑器/engine，性能可控。
代价：长尾巨大；生态插件无法自然接入；会走向“不断打补丁”。

### S3：尝试“复制 Obsidian Markdown editor 的 CM6 extensions 栈”到自建 EditorView
核心：让 outliner EditorView 直接加载 Obsidian 同款 extensions（含 suggest/slash/menu）。

问题：
- Obsidian 内部 extensions 不公开；不同版本变动大；很难稳定获取/复用。
- 即便勉强搞到 extension，仍缺 `MarkdownView/editor` 语义环境，生态插件仍可能接不到。

结论：高风险，不建议作为主路径。

### S4：接受差异 + 提供“打开为 Markdown”逃生门
现状已经有（pane menu 里的 open as markdown/source）。
结论：只能兜底，无法满足“Logseq-like block 编辑体验”。

## 当前阶段建议（只到方案结论，不进入实现）
- 以 S1 为主线收敛：detached MarkdownView 作为编辑器内核（Outliner 只做结构/选择/引导）。
- S2 只作为“临时补齐”或“移动端/性能兜底”的备选（必要时再做）。

## S1 风险详评（model-first：MarkdownView 仅当“高级输入框”）
定义：Outliner 的 block model/文件规范化仍是唯一真相；MarkdownView 只在“某个 block 进入编辑态”时被挂载为输入框，用来获得原生编辑体验（suggest/commands/IME/生态扩展）。

关键分岔（实现前必须定）：
- S1a（风险更高）：MarkdownView 直接打开真实文件，限制用户只能编辑某个 range（block）
- S1b（风险更低，model-first 更纯）：MarkdownView 编辑“block 片段文档”（不直连 vault 文件），确认/退出编辑时再由 Outliner 把结果写回 model → 文件

主要风险点（按“能把系统拖进泥潭”的优先级）：
- 双写/竞态：同一时刻 file watcher / 其它 leaf / 其它插件可能改文件；若 MarkdownView 也在改真实文件（S1a）会出现“model ↔ 文件 ↔ editor”三方竞态，最难排查。
- Undo/redo 语义：block 结构操作（indent/outdent/merge/drag）与 block 文本编辑（MarkdownView history）会出现两套撤销栈；需要明确“撤销粒度”与“跨 block 的撤销边界”。
- 映射复杂度：若走 S1a，必须维护 block ↔ 文本 range 的稳定映射；任何规范化/清理策略都会改变 range，导致映射漂移。
- Leaf 生命周期与泄漏：detached leaf + reparent 若处理不严，容易出现未卸载的 view/component/event listener；长时间编辑/频繁切换 block 会放大。
- Focus/IME/选择：reparent 会改变 DOM 层级与事件冒泡路径；需验证中文 IME、组合输入、复制粘贴、拖拽选择的稳定性。
- 多窗口/弹窗：Obsidian 支持 popout window；suggest/menu 等定位依赖 `containerEl.win`，跨 window reparent 会直接破。
- 性能：创建 MarkdownView/加载 editor extensions 的成本高；必须“复用单个 leaf”，不能每次编辑新建。
- 生态副作用：哪怕不改文件（S1b），加载 MarkdownView 仍会触发一些插件对 leaf/view 的观察逻辑（状态栏、统计、自动格式化等）；需要隔离标记与最小化可见性。

倾向结论（就“稳态可维护”而言）：优先 S1b。S1a 只要涉及 range 限制，基本等同回到 1.9 那种“修一个出一个”的地狱模式（只是战场从 decorations 变成 range/selection/scroll）。

## S3 进一步验证（9222）
目标：验证“不逆向私有模块”的前提下，能否在自建 EditorView 里复用 Obsidian 的核心能力（suggest/slash/menu）。

### E4：复制 Markdown editor 的 `EditorState` 到新 EditorView（仍缺 view-level 注入）
现象：`new EditorView({state: md.cm.state})` 得到的 `pluginMap.size` 约 12，而原生 Markdown editor 为 15；说明有一部分能力来自 EditorView config/view-level extensions（不在 state 里）。
结论：单纯“拷 state”无法完整复刻；要补齐只能继续追 view-level 注入点（属于逆向/高耦合）。

### E5：直接复用 `app.workspace.editorExtensions` 构造新 state 会崩（生态扩展不自洽）
实验：`EditorState.create({extensions: app.workspace.editorExtensions})` 报 `RangeError: Field is not present in this state`，栈来自 `plugin:obsidian-git`（访问 filepath field）。
结论：`workspace.editorExtensions` 不是“可搬运的完整栈”，里面包含依赖 Obsidian 私有 field/facet 的扩展；想靠它复刻必然进入逆向/兼容地狱。

### E6：不复制 extensions 栈，直接桥接 `workspace.editorSuggest`（可行）
实验：在完全自建的 EditorView 上，用自建 editor wrapper（实现 `coordsAtPos({line,ch})`、`getLine`、`containerEl.win` 等）调用 `workspace.editorSuggest` 的 suggest `trigger(...)`，`[[` 与 `/` 都能弹出原生 suggestion-container。
注意：`editorSuggest` 触发链有两个“焦点门槛”：
- manager `trigger(...)` 先检查 `editor.cm.hasFocus`（可在实验中绕过；真实交互里自然满足）
- suggest 在 async suggestions resolve 时会检查 `editor.hasFocus()` 决定 show/close
结论：若目标只覆盖 `[[` / `/` 这类建议系统，S3 的“最小桥接版”可以不靠私有 extensions；但它无法自动恢复 `editor-menu` 等“MarkdownView 管线级”的生态注入点。

### E7：`editor-menu` 的可桥接性（只做可行性提示）
在 Markdown editor 上监听一次 `workspace.on('editor-menu', ...)` 可拿到真实 menu 实例与其 constructor；理论上可以在自建 view 里 new 一个 menu，然后 `workspace.trigger('editor-menu', menu, editor, view)` 让其它插件追加菜单项。
限制：这只能补“插件追加项”；原生菜单（复制/粘贴/段落等）仍需自行构建/复刻。

## S3 最小桥接：对插件生态的覆盖面（关键分界）
S3 的核心前提：不追求“搬完整 CM6 extensions 栈”，只桥接少数 Obsidian 管线入口；其余能力依赖两条主干：
- 编辑态（CM6 EditorView）：默认只有 BLP 自己的最小 extensions；第三方 CM6 插件基本不会自动生效
- 展示态（MarkdownRenderer.render）：会跑 Markdown post processor / code block processor，因此大量“动态渲染类插件”可自然工作

按能力类型划分（能否在 outliner 的 block 内成立）：
- `[[`/`/` 建议：可成立（E6 已验证）；实现依赖 `workspace.editorSuggest` + editor wrapper（`coordsAtPos({line,ch})`、`containerEl.win`、`getLine` 等）
- 右键菜单：
  - BLP 自己的菜单项：可成立（自建 `new Menu()`）
  - 其它插件的 editor-menu 追加项：理论可“best-effort”桥接（E7）
  - 风险：大量插件会假设 `view instanceof MarkdownView` 或依赖 active leaf；因此只能作为可选实验开关，不能当硬保证
- “美化/主题/渲染效果”插件：
  - CSS-only：通常能成立（取决于主题是否写死 `.markdown-preview-view`/`.markdown-source-view` 选择器；必要时可在 outliner 容器补 class 以复用样式）
  - CM6 扩展类（editor decorations/语法高亮/折叠/自定义 gutter）：默认不成立（除非显式搬运/适配该扩展，等同走向 S2/S3+）
- 动态内容渲染（Dataview/Tasks/自定义 code block，如 ```blp-view```）：展示态通常能成立
  - 原因：outliner block display 用 `MarkdownRenderer.render(...)`（见 `src/features/file-outliner-view/view.ts:1258`），会触发 code block processors
  - 风险：少数插件会根据容器 class/父 view 早退；需要逐个用 9222 验证
- `![[file#^id]]`/嵌入：展示态通常能成立（同上；渲染由 MarkdownRenderer 负责）
  - “内联编辑 embed 内容”（BLP inline edit 一类）：编辑态默认不成立（它通常是挂在 MarkdownView/CM6 扩展上的能力）；若要在 outliner 内做到，需要单独做“embed 点击 -> 打开/浮窗/复用某个编辑器内核”的设计

## E8：Outliner block display 的 embed DOM 形态与 InlineEditEngine 不匹配（导致 `^id-id` 多行渲染失败）
复现文件：`_blp_tmp/outliner-plugin-compat.md`（frontmatter `blp_outliner: true`）

观测（9222，outliner view 内部渲染后的 DOM）：
- `.internal-embed.markdown-embed` 存在，但其内部结构是：
  - 有 `.markdown-preview-view.markdown-rendered ...`
  - 没有 `.markdown-embed-content`
- range embed（`src="vpp 简介#^6ucgz9-6ucgz9"`）会被 InlineEditEngine 标记为 active（`blp-reading-range-active`），但不会生成 `.blp-reading-range-host`，最终只显示 end marker 那一行（`x86/64 ARM-AArch64`），而不是 start(`^6ucgz9`) → end(`^6ucgz9-6ucgz9`) 的多行范围。

根因（代码级）：
- `ReadingRangeEmbedChild.render()` 依赖 `embedEl.querySelector(".markdown-embed-content")` 作为 native content 容器；找不到就会持续 retry 并回退到 native embed（最终表现为“只显示 obsidian 原生 block id 行”）。
  - 见 `src/features/inline-edit-engine/InlineEditEngine.ts:2062`（`getNativeContentEl()`）
  - 见 `src/features/inline-edit-engine/InlineEditEngine.ts:2236`（`if (!contentEl) scheduleRetry(...)`）

对照（正常 Markdown 预览）：
- `_blp_tmp/range-embed-preview.md` 的 preview DOM 中能看到两段文本（“支持 …” + “x86/64 …”），说明 `^id-id` 的 range 解析与渲染链本身是成立的；问题出在 outliner display 的 embed DOM 形态。

额外影响：
- outliner 内由其它渲染器产出的 embeds（例如 `blp-view render.type=embed-list` 生成的 `![[...#^id]]`）也会落在同一类“无 `.markdown-embed-content`”的 embed DOM 形态上，因此任何依赖 `.markdown-embed-content` 的后处理（含 inline edit shell）都默认不可用。

## E8.1：运行时补齐 `.markdown-embed-content` 后 `^id-id` 立即恢复（验证修复方向）
证据（9222 runtime patch）：
- 在 outliner view 内，对 `.internal-embed.markdown-embed` 做 DOM normalize：当缺少 `:scope > .markdown-embed-content` 且存在 `:scope > .markdown-preview-view` 时，把 preview view 包一层 `<div class="markdown-embed-content">`。
- 对已“重试用尽”的 `ReadingRangeEmbedChild`，需要重置 `retryCount` 并手动 `render()`（否则它可能已达到上限不再尝试）。

观测：
- normalize + 强制 render 后，range embed 会生成 `.blp-reading-range-host`，并恢复多行范围内容（与 `_blp_tmp/range-embed-preview.md` 的原生 preview 对齐）。

结论：
- 问题是 embed DOM 形态不兼容（缺 `.markdown-embed-content`），不是 range 解析链本身。
- 代码层面的修复只要保证 outliner display 的内部 embeds 具备 `.markdown-embed-content`（或让 InlineEditEngine 对该结构做 fallback）即可。

## E9：动态渲染（Dataview / Tasks / blp-view）在 outliner display 中可工作
复现文件：`_blp_tmp/outliner-plugin-compat.md`

观测（9222）：
- Dataview codeblock：渲染后存在 `.dataview` 输出（列表/表格均可）。
- Tasks codeblock：渲染后存在 `.plugin-tasks-query-result` 输出（示例命中 `TODO test`，backlink 指向 `logseq-compare`）。
- ` ```blp-view`：渲染后存在输出（示例 `render.type=table` 生成 `<table>`；`render.type=embed-list` 会生成多个 `.internal-embed.markdown-embed`）。
