## ADDED Requirements

### Requirement: Process `blp-view` code blocks with YAML config
插件 SHALL 解析并处理 Markdown 中的 `blp-view` 代码块，并依据 YAML 配置渲染 Query/View 结果。

#### Scenario: Parse config with defaults
- **WHEN** `blp-view` 代码块省略 `source` 与 `render.type`
- **THEN** 插件使用默认值：`source = global`，`render.type = embed-list`

### Requirement: Require Dataview for Query/View execution
插件 SHALL 在 Dataview 可用时执行 Query/View；当 Dataview 不可用时，插件 SHALL 提示错误并停止执行（不写入/不渲染结果）。

#### Scenario: Dataview is missing
- **WHEN** 用户在笔记中使用 `blp-view`，但 Dataview 未安装或未启用
- **THEN** 插件显示明确提示并不产生任何输出

### Requirement: Define enhanced list item system tail line
插件 SHALL 以 Obsidian 原生 `^id` 作为 list item 的唯一身份，并要求增强 list item 末尾包含系统行：
`[date:: <YYYY-MM-DDTHH:mm:ss>] ^<id>`，且 `^<id>` MUST 是该行最后一个 token。

#### Scenario: System line format is stable
- **WHEN** 插件为 list item 生成系统行
- **THEN** 系统行使用 `date` key，日期为 `YYYY-MM-DDTHH:mm:ss`（带 `T`）
- **AND** `^id` 位于系统行末尾

### Requirement: Candidate gating for Query/View
插件 SHALL 仅把同时具备 `blockId` 与可解析为 Dataview DateTime 的 `date` 的 list item 作为 Query/View 候选；不满足条件的 list item MUST 被跳过。

#### Scenario: Skip list items missing `blockId` or `date`
- **WHEN** Dataview `file.lists` 中存在缺失 `blockId` 或缺失/不可解析 `date` 的 list item
- **THEN** 插件不将其纳入 Query/View 结果集

### Requirement: Dataview-backed list item query pipeline
插件 SHALL 使用 Dataview 作为索引来源，读取 `file.lists` 并以 flatten 模式收集候选 list item，然后对候选应用过滤/分组/排序。

#### Scenario: Flatten all list items
- **WHEN** 用户执行 Query/View
- **THEN** 插件对 Dataview 返回的页面集合读取 `file.lists` 并 flatten 为 list item 流

### Requirement: Filtering capabilities
插件 SHALL 支持以下过滤能力（作用于 list item，缺失字段视为不命中）：
- `date`: `after/before/between/within_days`
- `fields`: `has | = | != | > | >= | < | <= | in | contains`
- `tags`: any/all/none
- `outlinks`: any/all/none 与 `link_to_current_file`
- `section`: any/all/none（按 list item 所属 heading/section 名称）

#### Scenario: Filter by tags and date window
- **WHEN** 用户配置 `filters.tags.any` 与 `filters.date.within_days`
- **THEN** 结果仅包含同时命中标签与时间窗口的 list item

### Requirement: Grouping and stable sorting
插件 SHALL 支持分组：`none | day(date) | file | field`，并提供稳定排序（至少可按 `date` + `file.path` + `line` 保证确定性）。

#### Scenario: Multi-value field grouping uses scheme A
- **WHEN** `group.by = field` 且字段为多值
- **THEN** 同一 list item 允许出现在多个分组（scheme A）

### Requirement: Embed-list renderer (pure render)
插件 SHALL 支持 `render.type: embed-list` 并以纯渲染方式输出每个结果为 `![[path#^blockId]]`。

#### Scenario: Render embed list
- **WHEN** `render.type` 为 `embed-list`
- **THEN** 插件渲染 `![[<filePath>#^<blockId>]]` 列表

### Requirement: Table renderer with defaults and `expr` escape hatch
插件 SHALL 支持 `render.type: table`，并支持列定义：
- `field:<key>`（取 list item 字段）
- `expr:<dataview-expression>`（用 Dataview 引擎求值）

若 `columns` 省略，插件 SHALL 默认输出 `File` 与 `Date` 两列。

#### Scenario: Table defaults to File and Date columns
- **WHEN** `render.type: table` 且未配置 `render.columns`
- **THEN** 插件输出默认列：`File`（文件名/文件链接）与 `Date`（系统字段 `date`）

### Requirement: Managed materialization mode overwrites output
插件 SHALL 支持 `render.mode: materialize`，将渲染结果写入代码块后方的受控区域，并在后续更新时覆盖该区域全部内容（不保留用户手动修改）。

#### Scenario: Materialize region is fully managed
- **WHEN** 用户在受控区域内手动编辑内容
- **THEN** 插件下一次更新会覆盖该区域并恢复为插件生成的输出

### Requirement: On-save repair for duplicate `^id`
插件 SHALL 在文件保存时检测同一文件内的重复 `^id` 并自动修复：
- 保留首次出现的 `^id` 不变
- 后续重复项重写为新的 `^id`
- 对被重写的重复项，同时将 `date` 重写为修复时刻

#### Scenario: Duplicate IDs are repaired on save
- **WHEN** 用户在同一文件内复制/粘贴导致重复 `^id`
- **THEN** 保存后插件修复重复，并确保每个 list item 的 `^id` 唯一

### Requirement: Hide system line in preview
插件 SHALL 在 Live Preview 与 Reading mode 下隐藏系统行（用户不可直接编辑系统行）。

#### Scenario: System line is hidden
- **WHEN** 笔记处于 Live Preview 或 Reading mode
- **THEN** 系统行不显示且不可直接编辑
