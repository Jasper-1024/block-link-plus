# 2026-01-12：Enhanced List Blocks 本轮对话重点与决策纪要

> 状态（2026-02 / v2.0.0）：本文为历史纪要。2.0 已移除 vendored vslinko outliner/zoom，并以 Outliner（`src/features/file-outliner-view/`）+ `blp-view` 为主线；涉及 Enhanced List / 内置 vslinko 的部分请勿再按“当前实现”理解。

> 目的：把本轮对话中已经确认的“原则/决策/已完成事项/遗留问题”记录下来，便于后续继续迭代与回归验证。

## 已确认的核心决策

### 1) Enhanced List Blocks 的 “Ops” 不再自研
- **结论**：Enhanced List Blocks 的第三部分（Ops：Zoom / Move / Indent / Outdent / Drag&Drop / 垂直缩进线等）不再由 BLP 自研实现。
- **执行方式**：在 BLP 内 **vendor/fork** vslinko 插件源码并保持原汁原味（保留 MIT）：
  - `obsidian-outliner@4.9.0`
  - `obsidian-zoom@1.1.2`
- **BLP 责任边界**：
  - 启用开关、设置存储、样式引入/隔离
  - 检测到外置同名插件启用时，自动禁用内置版本，避免“双重注册”
  - 仅在 vendor 代码与集成层做必要 bugfix（规格内对齐上游行为，不做 1:1 复刻扩展）
- **作用范围**：内置 outliner/zoom **全局生效**，不走 Enhanced List Blocks 的启用范围 gate。

> 相关历史对比文档：`doc/compare-enhanced-list-ops-vs-vslinko.md`

### 2) Timeline / Time Section 功能移除
- **结论**：原“时间线/时间区块”相关能力移除。
- **原因**：BLP 已有更完整的 Query/View（`blp-view`）查询体系；timeline 只是可被覆盖的一小部分子集。
- **用户侧表现**：`blp-timeline` 等不再被处理（回退为普通代码块）。

### 3) Dataview gate 仅作用于 Query/View（`blp-view`）
- **结论**：Dataview 的“缺失/不可用”只影响 `blp-view` 的执行与设置区展示。
- **不受影响的增强**（与 Dataview 无关）：
  - 系统行自动生成/补齐
  - 系统行隐藏（Live Preview + Reading）
  - 保存时重复 `^id` 修复

### 4) Enhanced List Blocks 新增/明确的设置项方向
- `enhancedListHideSystemLine`：系统行默认隐藏（可切换显示）
- `blp-view` guardrails（仅 Dataview 正常时展示）：
  - 允许/禁止 `render.mode: materialize`
  - 最大源文件数（超出即报错）
  - 最大结果数（超出截断并提示）
  - 可选 diagnostics 输出（便于排查）

## 本轮已完成的关键实现（供回溯）
- 移除 timeline / time section 代码与设置
- `blp-view source.files` 路径解析增强（vault 相对路径、basename fallback、missing/ambiguous 明确报错）
- 修复 Inline Edit 场景下 embed 重复渲染（渲染版 + CM 编辑器版同时出现）
- 新增 Enhanced List Blocks 设置项与 `blp-view` guardrails
- 推送缺失的 release tag：`1.8.1`
- `dev-list` 分支版本号已提升到 `1.9.0`（用于继续测试，暂不合并到 master）

## 本轮新发现问题与处理结论

### 已修复：Live Preview 隐藏系统行导致行号重叠
- **现象**：隐藏系统行后，行号（如 28/29）出现重叠。
- **根因**：系统行使用 `display:none` 折叠后，CodeMirror 对应 gutter element 高度变成 `0`；部分主题/样式下 gutter element 仍 `overflow: visible`，导致“0 高度”的行号文本溢出覆盖下一行。
- **处理**：对 LP 行号 gutter element 增加 `overflow: hidden`，避免溢出叠字。

### 延后：回车新建 list 项后光标位置不对
- **现象**：按 Enter 新建 list item 后，系统行被插入后，光标落在 `  - ` 开头，而不是 `-` 后面。
- **当前判断（待验证）**：可能与“系统行插入使用了额外 sequential transaction”有关，触发 Obsidian/HyperMD 的 list continuation 二次处理导致 selection 被重置。
- **状态**：已记录，后续再排查与修复（不在本轮修）。

## 关于“未保存也能 CopyID”的讨论结论（记录分歧点）
- **讨论点**：是否可以把“系统行生成”推迟到保存时执行，以减少编辑过程中的干预与边界处理。
- **关键分歧**：
  - 观点 A：不保存会导致 CopyID 拿不到 `^id`（依赖文件内容/缓存），因此需要在编辑过程中立即生成/补齐。
  - 观点 B（本轮用户反驳）：只要 BLP 能在编辑态按增强格式生成并拿到 id，即使未保存也可以 CopyID（BLP 可以直接基于编辑器状态生成 link/id）。
- **当前状态**：本轮不改策略；后续如要把“系统行生成”改成保存时/按需生成，需要同步更新 OpenSpec（属于行为变化）。

