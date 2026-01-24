# Memo：Enhanced List Blocks（BLP × Dataview）已确定内容

## 目标

- 把 Obsidian 的 list item 作为“最小 block 单元”，补齐 Roam/Logseq 式的 block-first：可引用（ID）→ 可索引（字段）→ 可聚合/筛选/查询（View）。
- Timeline 退化为某个 View 的 preset；本阶段只讨论 Query/View，不讨论 Block Ops（zoom/backlinks/move/reindent/跨文件移动等）。

## 事实基础（已验证）

- Obsidian 原生 block 引用支持 `[[file#^id]] / ![[...]]`；并且 `^id` 可以在 list item 内部单独成行，仍被识别为该 list item 的 block id（`_research/obsidian-docs/en/Linking notes and files/Internal links.md:116`）。
- Dataview 的 `file.lists/file.tasks` 暴露 `blockId`，来源是 Obsidian `metadata.listItems[].id`；并把 list item 的 `link` 指向 `Link.block(path, id)`（`_research/obsidian-dataview/src/data-import/markdown-file.ts:221`、`_research/obsidian-dataview/src/data-import/markdown-file.ts:242`）。
- Dataview 对 list item 的字段提取，稳定入口是 inline field：`[key:: value]` / `(key:: value)`；full-line `Key:: Value` 在 list item 场景不作为契约（`_research/obsidian-dataview/docs/docs/annotation/add-metadata.md:70`、`_research/obsidian-dataview/src/data-import/markdown-file.ts:259`）。
- Dataview 的 inline field 值若要被解析为 DateTime，需要 `YYYY-MM-DDTHH:mm:ss`（`T` 分隔）；`YYYY-MM-DD HH:mm:ss`（空格分隔）会落为普通字符串（`_research/obsidian-dataview/src/expression/parse.ts:314`、`_research/obsidian-dataview/src/expression/parse.ts:325`）。

## 契约 1：增强 list item 的尾部格式（写入约定）

- 身份：只使用 Obsidian 原生 `^id`（不引入 BLP 私有 id），并要求 `^id` 落在该 list item 的内容范围内。
- 尾部固定两段（自上而下）：
  - 可选：用户字段行（仅当用户确实写了字段/标签时存在，位置固定为“倒数第二行”）。
  - 必选：系统行：`[date:: <YYYY-MM-DDTHH:mm:ss>] ^<id>`，且 `^id` 必须是该行最后一个 token。
- 范围约束：增强 list item 内部不允许空行（用于稳定边界与可修复性）。

为什么：`^id`+`date` 固定在尾部，才能让“解析/修复/隐藏/索引/合并”都有唯一锚点；禁止空行是为了避免 list item 边界不稳定（尤其是多行/子列表）。

## 契约 2：展示/隐藏（渲染约定）

- 系统行必须在 Live Preview + Reading mode 下隐藏，且用户不可直接编辑（避免误改导致引用漂移、查询失效）。
- 用户字段行是否默认隐藏：待定（倾向“默认隐藏 + 可切换显示”，以减少噪音）。

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
  - `render: { type: embed-list|table, mode?: render|materialize, columns?: Column[] }`
    - `Column: { name, field? , expr? }`（二选一；`expr` 为 Dataview 表达式）

默认值（降低上手成本）：
- `source` 省略：默认全局（等价于 Dataview 的全库 pages/lists 范围，后续再由 filters 收敛）。
- `render.type` 省略：默认 `embed-list`。
- `render.type: table` 且 `columns` 省略：默认列为 `File`（文件名/文件链接）与 `Date`（系统字段 `date`）；用户显式写了 `columns` 则完全按用户配置渲染。

## 待定项（下一轮需要拍板）

- YAML 的默认值与必填项（目标：用户复制最小模板即可用）：
  - `render.mode` 默认 `render`
  - `sort.by/order` 的默认策略（建议：`date desc` + `file.path` + `line` 的稳定排序）
  - `source` 为空时的默认（是否默认为当前文件夹 / 当前文件反链等）
