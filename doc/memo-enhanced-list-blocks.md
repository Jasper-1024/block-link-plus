# Memo：Enhanced List Blocks（BLP × Dataview）已确定内容

## 目标

- 把 Obsidian 的 list item 作为“最小 block 单元”，补齐 Roam/Logseq 式的 block-first：可引用（ID）→ 可索引（字段）→ 可聚合/筛选/查询（View）。
- Timeline 退化为某个 View 的 preset；本 memo 主要讨论 Query/View；Enhanced List Blocks Ops（zoom/move/indent/dnd/vertical-lines/threading）现状与参考插件差异见 `doc/compare-enhanced-list-ops-vs-vslinko.md`。

## 事实基础（已验证）

- Obsidian 原生 block 引用支持 `[[file#^id]] / ![[...]]`；并且 `^id` 可以在 list item 内部单独成行，仍被识别为该 list item 的 block id（`_research/obsidian-docs/en/Linking notes and files/Internal links.md:116`）。
- Dataview 的 `file.lists/file.tasks` 暴露 `blockId`，来源是 Obsidian `metadata.listItems[].id`；并把 list item 的 `link` 指向 `Link.block(path, id)`（`_research/obsidian-dataview/src/data-import/markdown-file.ts:221`、`_research/obsidian-dataview/src/data-import/markdown-file.ts:242`）。
- Dataview 对 list item 的字段提取，稳定入口是 inline field：`[key:: value]` / `(key:: value)`；full-line `Key:: Value` 在 list item 场景不作为契约（`_research/obsidian-dataview/docs/docs/annotation/add-metadata.md:70`、`_research/obsidian-dataview/src/data-import/markdown-file.ts:259`）。
- Dataview 的 inline field 值若要被解析为 DateTime，需要 `YYYY-MM-DDTHH:mm:ss`（`T` 分隔）；`YYYY-MM-DD HH:mm:ss`（空格分隔）会落为普通字符串（`_research/obsidian-dataview/src/expression/parse.ts:314`、`_research/obsidian-dataview/src/expression/parse.ts:325`）。

## 启用范围（显式开启）

- 默认不启用；只有满足以下任一条件的文件才启用增强：
  - 位于插件设置指定的文件夹/文件
  - 文件 frontmatter 含 `blp_enhanced_list: true`
- Query/View 的 `source`（即便显式配置）也只能落在启用范围内；命中未启用文件则明确报错并停止渲染。
- 仅对启用文件执行：系统行隐藏、保存时重复 `^id` 修复、Query/View 候选扫描。

## 契约 1：增强 list item 的尾部格式（写入约定）

- 身份：只使用 Obsidian 原生 `^id`（不引入 BLP 私有 id），并要求 `^id` 落在该 list item 的内容范围内。
- “正文尾部”固定两段（自上而下；不包含子列表）：
  - 可选：用户字段行（仅当用户确实写了字段/标签时存在，位置固定为“正文倒数第二行”）。
  - 必选：系统行：`[date:: <YYYY-MM-DDTHH:mm:ss>] ^<id>`，且 `^id` 必须是该行最后一个 token。
- 系统行必须位于父 list item 的正文内容之后、任何子列表（nested list）之前；否则 Obsidian 无法将 `^id` 关联到父项。
- 范围约束：增强 list item 内部不允许空行（用于稳定边界与可修复性）。

为什么：`^id`+`date` 固定在尾部，才能让“解析/修复/隐藏/索引/合并”都有唯一锚点；禁止空行是为了避免 list item 边界不稳定（尤其是多行/子列表）。

## 契约 2：展示/隐藏（渲染约定）

- 系统行必须在 Live Preview + Reading mode 下隐藏，且用户不可直接编辑（避免误改导致引用漂移、查询失效）。
- 用户字段不隐藏（用户可见、可编辑）。
- 实现备注：
  - Live Preview：通过 CodeMirror 行装饰隐藏整行。
  - Reading mode：若 Dataview 将 `[date:: ...]` 渲染为 `dataview inline-field`，插件会移除该 `date` 字段节点（`^id` 在 Reading mode 下通常已被 Obsidian 自带隐藏）。

## 契约 3：ID / date 生成与复制粘贴

- `date` 只在首次生成 `^id` 时写入一次，之后永不更新（immutable）。
- 同文件复制/粘贴会制造重复 `^id`：必须提供检测 + 修复机制。
- 触发时机：**保存时**自动检测并修复重复 `^id`。
  - 建议策略：同一文件内，保留“首次出现”的 `^id` 不变；后续重复项重写为新 `^id`。
  - `date` 处理：对“被重写 `^id` 的重复项”同时重写 `date` 为修复时刻（视为新 block 创建）。

## 契约 4：Query/View（已达成部分）

- 候选集合：以 Dataview `file.lists` 为 block 来源，做 **flatten**（所有 list item 都是候选）。
- 强约束：Query/View **只接受同时满足**以下条件的 list item：
  - 存在 `blockId`
  - 存在 `date`，且可被 Dataview 解析为 DateTime（即 `YYYY-MM-DDTHH:mm:ss`）
- 不满足者：**跳过**（Query/View 阶段不做隐式写回；增强 list 的写入由单独入口负责）。
- 过滤语义（对齐 Logseq/Roam）：`tags/outlinks/fields/section/date` 等过滤**只作用于当前 list item**（不从祖先继承，也不从子树聚合）。
- 可选增强（低成本）：支持“排除带某 tag 的祖先块的所有后代”的过滤（依赖 Dataview `children` 子树结构即可实现）。
- 过滤能力（至少）：
  - `date`（after/before/between/within_days）
  - 用户自定义字段（has / 比较 / in / contains）
  - tags（any/all/none）
  - outlinks（any/all/none，可有 `link_to_current_file` 快捷项）
  - section（按 list item 所属 heading/section 过滤）
- 分组：支持 `group_by: field:<key>`；多值字段采用**方案 A**：同一 block 可拆分进入多个组。
- 输出：
  - 默认 **纯渲染**：不写回文件；主要 renderer 为 embed list（`![[path#^blockId]]`）和 table。
  - table 列值：支持 `field:<key>` 与 `expr:<dataview-expression>`（表达式交给 Dataview 引擎求值，不自研表达式语言）。
  - 可选 **受控区域物化（managed/materialize）**：维护 start/end 标记包裹的区域，带 hash/no-op 优化；区域内容由插件全量生成并覆盖，**不支持用户手动修改**（手动改动会在下次更新被覆盖/丢弃）。

### 配置形态（YAML）

- 配置采用 YAML（放在代码块内，例如 ` ```blp-view `）；复杂逻辑优先用结构化字段表达，`expr` 只作为“逃生舱”。
- 结构（最小集合）：
  - `source.folders: string[]` 或 `source.dv: string`（Dataview source 字符串）
  - `filters.date: { within_days? after? before? between? }`
  - `filters.fields: { field, op, value }[]`（`op` 支持：`has | = | != | > | >= | < | <= | in | contains`）
  - `filters.tags: { any? all? none? }`（值为 tag 列表）
  - `filters.outlinks: { any? all? none? link_to_current_file? }`
  - `filters.section: { any? all? none? }`（值为 heading/section 名称列表）
  - `group: { by: none|day(date)|file|field, field? }`
  - `sort: { by: date|file.path|line, order: asc|desc }`
  - `render: { type: embed-list|table, mode?: materialize, columns?: Column[] }`
    - `Column: { name, field? , expr? }`（二选一；`expr` 为 Dataview 表达式）

默认值（降低上手成本）：
- `source` 省略：默认“启用范围内全部文件”。
- `sort` 省略：默认按 `date desc`（今天/最新在前），并用 `file.path` + `line` 做稳定排序。
- `render.type` 省略：默认 `embed-list`。
- `render.mode` 通常省略（纯渲染，不写回文件）；只有显式配置 `render.mode: materialize` 才启用受控区域写回。
- `render.type: table` 且 `columns` 省略：默认列为 `File`（文件名/文件链接）与 `Date`（系统字段 `date`）；用户显式写了 `columns` 则完全按用户配置渲染。

## 当前实现状态（2026-01-09）

- 已实现：启用范围（文件夹/文件列表/`blp_enhanced_list: true` 任一命中即启用）、系统行隐藏、保存时重复 `^id` 修复、`blp-view`（含 materialize 受控区域写回）、Enhanced List Blocks Ops（仅 Live Preview；仅启用文件；与 `obsidian-zoom/obsidian-outliner` 冲突检测）。
- 已实现：在 Live Preview 中创建“下一条” list item 时自动写入系统行（无需等待保存）。

## 手动测试清单

- Enable scope：仅 frontmatter 启用是否生效；`blp-view` 显式 `source` 命中未启用文件是否明确报错并停止输出。
- 系统行隐藏：Live Preview/Reading mode 下均不显示系统行；Reading mode 重点确认 `date` 不展示。
- 重复 `^id` 修复：同文件复制粘贴制造重复 `^id`，保存后是否重写重复项 `^id` 且 `date` 更新为修复时刻。
- `blp-view` 默认行为：`source` 省略=扫描启用范围；默认 `date desc`；table 默认列 `File/Date`。
- 过滤/分组/排序：`tags`（含 `none_in_ancestors`）、`outlinks.link_to_current_file`、`section`、`fields`、`date`（within_days/after/before/between）。
- materialize：受控区域 marker 正确、hash/no-op 生效；手动编辑受控区域后下次更新会被覆盖。
