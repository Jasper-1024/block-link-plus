# enhanced-list-blocks Specification

## Purpose
TBD - created by archiving change add-enhanced-list-blocks-query-view. Update Purpose after archive.
## Requirements
### Requirement: Process `blp-view` code blocks with YAML config
插件 SHALL 解析并处理 Markdown 中的 `blp-view` 代码块，并依据 YAML 配置渲染 Query/View 结果。

#### Scenario: Parse config with defaults
- **WHEN** `blp-view` 代码块省略 `source` 与 `render.type`
- **THEN** 插件使用默认值：`source = enabled files`，`render.type = embed-list`

### Requirement: Enhanced List Blocks is opt-in and scoped
增强 list 块能力 MUST 默认不启用；插件 SHALL 仅在显式启用的文件内启用增强，并仅对启用文件执行 Query/View 候选扫描、系统行隐藏、以及保存时重复 `^id` 修复。

文件被视为“启用”当且仅当满足以下任一条件：
- 位于插件设置指定的文件夹/文件范围内
- 文件 frontmatter 含 `blp_enhanced_list: true`

#### Scenario: Skip non-enabled files even when `source` is provided
- **WHEN** 用户在 `blp-view` 中显式配置 `source`，且该 `source` 会命中未启用文件
- **THEN** 插件显示明确提示（包含命中的未启用文件路径）并停止执行（不写入/不渲染结果）

### Requirement: Require Dataview for Query/View execution
插件 SHALL 在 Dataview 可用时执行 Query/View；当 Dataview 不可用时，插件 SHALL 提示错误并停止执行（不写入/不渲染结果）。

#### Scenario: Dataview is missing
- **WHEN** 用户在笔记中使用 `blp-view`，但 Dataview 未安装或未启用
- **THEN** 插件显示明确提示并不产生任何输出

### Requirement: Define enhanced list item system tail line
插件 SHALL 以 Obsidian 原生 `^id` 作为 list item 的唯一身份，并要求增强 list item 末尾包含系统行：
`[date:: <YYYY-MM-DDTHH:mm:ss>] ^<id>`，且 `^<id>` MUST 是该行最后一个 token。

系统行 MUST 放置在该 list item 的“正文内容”之后、任何子列表（nested list）之前，以确保 Obsidian 将 `^id` 关联到父 list item（而不是子项）。
对于不包含子列表的 list item，系统行即为该 list item 的最后一行。

#### Scenario: System line format is stable
- **WHEN** 插件为 list item 生成系统行
- **THEN** 系统行使用 `date` key，日期为 `YYYY-MM-DDTHH:mm:ss`（带 `T`）
- **AND** `^id` 位于系统行末尾

#### Scenario: System line is inserted before child list
- **WHEN** 一个 list item 存在子列表
- **AND** 插件为该父 list item 生成系统行
- **THEN** 系统行位于父 list item 的正文之后、第一条子列表项之前

### Requirement: Auto-generate system line on list item completion (Live Preview)
在启用 Enhanced List Blocks 的文件内，插件 SHALL 在 Live Preview 下自动补齐系统行。
当用户创建“下一条” list item（例如按 Enter 产生新的同级/子级 list item）时，插件 MUST 确保上一条 list item 拥有系统行；若缺失则插入。

若系统行存在但位于子列表之后（导致 Obsidian 无法将 `^id` 关联到父项），插件 SHOULD 将该系统行移动到子列表之前（保留原 `date` 与 `^id`）。

#### Scenario: Auto-generate without saving
- **GIVEN** 当前文件已启用 Enhanced List Blocks
- **WHEN** 用户在 Live Preview 中创建下一条 list item
- **THEN** 上一条 list item 立即拥有系统行（无需等待保存）

#### Scenario: Do nothing when already present
- **WHEN** 上一条 list item 已存在且位置正确的系统行
- **THEN** 插件不修改该 list item

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
- `fields`: `has | = | != | > | >= | < | <= | in | contains`（比较语义与类型规则以 Dataview 为准）
- `tags`: any/all/none
- `outlinks`: any/all/none 与 `link_to_current_file`
- `section`: any/all/none（以 Dataview 计算的 list item.section 为准，按 heading/section 名称匹配；`all` 与 `any` 等价）

过滤语义对齐 Logseq/Roam：上述过滤条件默认只作用于**当前 list item**（不从祖先继承，也不从子树聚合）。

可选增强：插件 SHOULD 支持 `filters.tags.none_in_ancestors`（排除祖先链上带任一指定 tag 的后代 list item）。

#### Scenario: Filter by tags and date window
- **WHEN** 用户配置 `filters.tags.any` 与 `filters.date.within_days`
- **THEN** 结果仅包含同时命中标签与时间窗口的 list item

#### Scenario: Tag filter does not inherit from parent list item
- **WHEN** 父 list item 含 `#tag1` 且其子 list item 不含 `#tag1`，并且二者均满足候选门槛（具备 `blockId` 与 `date`）
- **AND** 用户配置 `filters.tags.none = ["#tag1"]`
- **THEN** 父 list item 被排除
- **AND** 子 list item 仍可被纳入结果集

### Requirement: Date filters use Dataview parsing and strict bounds
插件 SHALL 使用 Dataview 的日期解析规则解析 `filters.date` 的输入值（例如通过 `dv.date(...)`）；若输入不可解析，插件 SHALL 报错并停止执行（不写入/不渲染结果）。

对于可解析的日期，插件 SHALL 使用严格边界（exclusive）：
- `after`: `item.date > after`
- `before`: `item.date < before`
- `between`: `after < item.date < before`

#### Scenario: Date filter boundaries are strict
- **WHEN** 用户配置 `filters.date.after` 为可解析的时间点 `T`
- **THEN** `date == T` 的 list item 不命中 `after`

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
插件 SHALL 默认在 Live Preview 与 Reading mode 下隐藏系统行（`[date:: ...] ^id`）。
插件 MUST 提供设置开关允许用户显示系统行（用于调试/排障/迁移），当用户关闭“隐藏系统行”后插件 MUST NOT 隐藏系统行。

#### Scenario: System line is hidden by default
- **GIVEN** 当前文件已启用 Enhanced List Blocks
- **AND** 用户保持默认设置（隐藏系统行=开启）
- **WHEN** 笔记处于 Live Preview 或 Reading mode
- **THEN** 系统行不显示

#### Scenario: User can show system line for debugging
- **GIVEN** 当前文件已启用 Enhanced List Blocks
- **WHEN** 用户在设置中关闭“隐藏系统行”
- **THEN** 系统行在 Live Preview 与 Reading mode 下可见

### Requirement: Optional list-handle actions in Live Preview
When Enhanced List Blocks is enabled for a file, the plugin SHALL provide optional list-item handle actions in Live Preview to improve discoverability of outliner-like interactions.

The handle actions:
- MUST be scoped to Enhanced List Blocks enabled files.
- MUST be configurable via a plugin setting.
- MUST operate only in Live Preview.

#### Scenario: Clicking the handle toggles folding
- **WHEN** a file is Enhanced List Blocks enabled
- **AND** the user enables the handle actions setting
- **AND** the editor is in Live Preview
- **AND** the user left-clicks the unordered-list handle of a list item
- **THEN** the plugin toggles folding for that list item (fold/unfold)

#### Scenario: Dragging does not trigger folding
- **WHEN** the user drags a list item by its handle
- **THEN** the plugin MUST NOT trigger click-to-fold as a side effect

#### Scenario: Right-click shows a handle actions menu
- **WHEN** the user right-clicks a list item's handle
- **THEN** the plugin shows a context menu with handle actions for that list item

### Requirement: Copy block link/embed from handle actions
The plugin SHALL support copying a block link and embed link for the target list item from the handle actions menu.

#### Scenario: Copy block link
- **WHEN** the user selects "Copy block link" from the handle actions menu
- **THEN** the plugin copies `[[file#^id]]` for that list item to the clipboard

#### Scenario: Copy block embed
- **WHEN** the user selects "Copy block embed" from the handle actions menu
- **THEN** the plugin copies `![[file#^id]]` for that list item to the clipboard

### Requirement: Optional list-item handle affordance in Live Preview
When Enhanced List Blocks is enabled for a file, the plugin SHALL provide an optional “block handle” affordance for list items in Live Preview to improve discoverability of outliner-like interactions.

The affordance:
- MUST be purely visual (MUST NOT modify note content).
- MUST be scoped to Enhanced List Blocks enabled files.
- MUST be configurable via a plugin setting.

#### Scenario: Enabled file shows handle affordance
- **WHEN** a file is Enhanced List Blocks enabled
- **AND** the user enables the handle affordance setting
- **AND** the editor is in Live Preview
- **THEN** the list marker renders with a visible handle affordance and a larger hitbox

#### Scenario: Non-enabled file is unaffected
- **WHEN** a file is NOT Enhanced List Blocks enabled
- **THEN** the plugin does not apply the handle affordance styling

#### Scenario: Source mode is unaffected
- **WHEN** the editor is NOT in Live Preview
- **THEN** the plugin does not apply the handle affordance styling

### Requirement: Ordered lists remain readable
The plugin SHALL avoid hiding or altering ordered list numbering when applying handle affordances.

#### Scenario: Ordered list numbering remains visible
- **WHEN** a line is an ordered list item
- **THEN** the numbering remains visible and readable

### Requirement: Block reference picker (insert `[[file#^id]]` / `![[...]]`)
When Enhanced List Blocks is enabled for a file, the plugin SHALL provide an editor workflow to search blocks and insert a reference or embed to a chosen block (`[[file#^id]]` / `![[file#^id]]`).

The block reference picker:
- MUST be scoped to Enhanced List Blocks enabled files.
- MUST operate in Live Preview (safe no-op / no trigger in non-Live Preview).
- MUST NOT persist a vault-wide block index to disk (in-memory only).

#### Scenario: Command opens picker and inserts a reference
- **GIVEN** the active file is Enhanced List Blocks enabled
- **WHEN** the user runs the “Insert Block Reference” command
- **THEN** the plugin opens a block picker modal
- **AND** selecting a block inserts `[[file#^id]]` at the cursor

#### Scenario: Command inserts an embed
- **GIVEN** the active file is Enhanced List Blocks enabled
- **WHEN** the user runs the “Insert Block Embed” command
- **THEN** selecting a block inserts `![[file#^id]]` at the cursor

#### Scenario: Typing `((` triggers picker and replaces the typed token
- **GIVEN** the active file is Enhanced List Blocks enabled
- **AND** the editor is in Live Preview
- **WHEN** the user types `((`
- **THEN** the plugin opens the block picker modal
- **AND** selecting a block replaces the typed `((` with the inserted `[[file#^id]]`

### Requirement: Optional block selection mode (Live Preview)
When Enhanced List Blocks is enabled for a file, the plugin SHALL provide an optional “block selection mode” for list items in Live Preview, so users can select and operate on blocks as units (Roam/Logseq style).

The block selection mode:
- MUST be scoped to Enhanced List Blocks enabled files.
- MUST be configurable via a plugin setting.
- MUST operate only in Live Preview.
- MUST NOT modify note content.

#### Scenario: Click handle selects a block
- **WHEN** a file is Enhanced List Blocks enabled
- **AND** the user sets the handle click action to `select-block`
- **AND** the editor is in Live Preview
- **WHEN** the user clicks the unordered list handle of a list item
- **THEN** the plugin selects that list item as a block (block selection state updates)
- **AND** the editor shows a visual highlight for the selected block

#### Scenario: Shift-click selects a contiguous range of blocks
- **GIVEN** block selection mode is enabled
- **WHEN** the user shift-clicks another unordered list handle
- **THEN** the plugin selects the contiguous block range between the anchor block and the clicked block
- **AND** all blocks in the range are visually highlighted

#### Scenario: Escape clears block selection
- **GIVEN** one or more blocks are selected
- **WHEN** the user presses Escape
- **THEN** the plugin clears the block selection state and removes block highlights

#### Scenario: Dragging does not trigger selection
- **WHEN** the user drags a list item by its handle (outliner drag-and-drop)
- **THEN** the plugin MUST NOT toggle or change block selection as a side effect

### Requirement: Built-in `obsidian-outliner` module (vendored)
插件 SHALL 在 BLP 内提供一个可选启用的“Built-in Outliner”模块，其行为 SHOULD 尽可能与 `obsidian-outliner@4.9.0` 一致（命令、键盘行为覆盖、拖拽、垂直线、样式增强等）。

#### Scenario: Built-in Outliner can be enabled/disabled
- **WHEN** 用户在 BLP 设置中启用 Built-in Outliner
- **THEN** outliner 行为在编辑器中生效（与上游插件一致的可见效果/交互）
- **WHEN** 用户在 BLP 设置中关闭 Built-in Outliner
- **THEN** outliner 不再影响编辑器行为（不应再改变 Tab/Enter/Backspace/Drag 等默认交互）

### Requirement: Built-in `obsidian-zoom` module (vendored)
插件 SHALL 在 BLP 内提供一个可选启用的“Built-in Zoom”模块，其行为 SHOULD 尽可能与 `obsidian-zoom@1.1.2` 一致（命令、点击 bullet/marker 触发 zoom、breadcrumb header、selection clamp、越界编辑自动 zoom-out 等）。

#### Scenario: Click bullet/marker zoom works
- **WHEN** Built-in Zoom 已启用且用户点击 list 的 bullet/marker
- **THEN** 插件触发 zoom-in（与上游插件一致的交互）

### Requirement: Upstream settings are persisted inside BLP storage
插件 SHALL 持久化保存 built-in Outliner/Zoom 的设置（作为 BLP 设置数据的一部分），以便重启后保持一致行为。

#### Scenario: Built-in module settings persist
- **WHEN** 用户修改 built-in Outliner/Zoom 的任一设置并重启 Obsidian
- **THEN** 设置值保持不变

### Requirement: Conflict handling with external plugins
当检测到外置插件 `obsidian-outliner` / `obsidian-zoom` 已启用时，插件 SHALL 自动禁用 BLP 内置的对应模块，以避免双重注册导致的不可预测行为。

#### Scenario: External plugin disables built-in counterpart
- **WHEN** 检测到外置 `obsidian-outliner` 已启用
- **THEN** BLP 内置 Outliner 自动禁用（或保持关闭），并提示原因
- **WHEN** 检测到外置 `obsidian-zoom` 已启用
- **THEN** BLP 内置 Zoom 自动禁用（或保持关闭），并提示原因

### Requirement: Subtree clipboard in block selection mode (Live Preview)
When Enhanced List Blocks is enabled for a file, and block selection mode has one or more selected blocks, the plugin SHALL treat clipboard operations (copy/cut/paste) as **block subtree** operations.

The subtree clipboard behavior:
- MUST be scoped to Enhanced List Blocks enabled files.
- MUST operate only in Live Preview.
- MUST NOT persist any index/cache to disk.
- MUST keep `text/plain` external-friendly (system lines removed).
- SHOULD preserve block structure on paste (nested list indentation remains correct).

#### Scenario: Copy serializes selected subtree and strips system lines from text/plain
- **GIVEN** one or more blocks are selected in block selection mode
- **WHEN** the user triggers copy
- **THEN** the plugin writes `text/plain` that excludes system lines (`[date:: ...] ^id`)
- **AND** the plugin writes an internal clipboard payload that includes full text with system lines

#### Scenario: Cut removes selected subtree
- **GIVEN** one or more blocks are selected in block selection mode
- **WHEN** the user triggers cut
- **THEN** the plugin removes the selected blocks and all of their nested children from the document
- **AND** the clipboard payload is written as in copy

#### Scenario: Paste replaces selected subtree using internal payload
- **GIVEN** one or more blocks are selected in block selection mode
- **AND** the clipboard contains an internal subtree payload
- **WHEN** the user triggers paste
- **THEN** the plugin replaces the selected subtree ranges with the pasted subtree
- **AND** the pasted subtree is reindented to the destination block indent level

#### Scenario: Copy-paste remaps ids
- **GIVEN** the internal subtree payload was produced by copy (not cut)
- **WHEN** the user pastes into an Enhanced List Blocks file
- **THEN** the plugin SHOULD generate new `^id` system line IDs for pasted blocks to avoid duplicates

### Requirement: Built-in Outliner/Zoom respect Enhanced List Blocks scope
When built-in Outliner (`obsidian-outliner`) and/or built-in Zoom (`obsidian-zoom`) are enabled, the plugin SHALL be able to scope their list-related interactions and styling to Enhanced List Blocks enabled files.

When scoped:
- List interactions (e.g. click-to-zoom, drag-and-drop) MUST NOT intercept events in non-enabled files.
- List styling (vendored CSS) MUST NOT visually affect non-enabled files.
- Behavior MUST apply only in Live Preview.

#### Scenario: Enabled file uses built-in outliner/zoom list UX
- **WHEN** a file is Enhanced List Blocks enabled
- **AND** built-in Outliner/Zoom are enabled
- **AND** scoping to Enhanced List is enabled
- **THEN** built-in list interactions and styling are active in that file

#### Scenario: Non-enabled file is unaffected
- **WHEN** a file is NOT Enhanced List Blocks enabled
- **AND** built-in Outliner/Zoom are enabled
- **AND** scoping to Enhanced List is enabled
- **THEN** built-in list interactions and styling are not active in that file

### Requirement: `blp-view` respects plugin-level guardrails
插件 SHALL 提供 `blp-view`（Query/View）的安全/性能护栏设置，用于控制写回、扫描规模与输出规模；这些护栏 SHALL 仅影响 `blp-view` 的执行，不影响系统行生成、重复 `^id` 修复等增强 list 行为。

#### Scenario: Materialize can be disabled in settings
- **GIVEN** 用户在设置中关闭“允许 materialize 写回”
- **WHEN** `blp-view` 代码块配置 `render.mode: materialize`
- **THEN** 插件停止执行并提示错误
- **AND** 插件不写回/不修改当前文件内容

#### Scenario: Limit scanned files per execution
- **GIVEN** 用户在设置中配置了“最大扫描文件数”为正整数 `N`
- **WHEN** 一次 `blp-view` 执行需要扫描的文件数大于 `N`
- **THEN** 插件停止执行并提示用户收窄 `source` 或提高该上限

#### Scenario: Limit output result size
- **GIVEN** 用户在设置中配置了“最大输出结果数”为正整数 `N`
- **WHEN** `blp-view` 的匹配结果数大于 `N`
- **THEN** 插件输出前 `N` 条结果并提示“已截断”

### Requirement: List item deletion cleanup is configurable (Live Preview)
在启用 Enhanced List Blocks 的文件内，插件 SHALL 在 Live Preview 下对“删除 list item”补齐删除语义，并提供设置项控制是否删除子列表：
- 插件 MUST 在删除 list item 时清理其系统行，避免孤儿系统行或错误的子项归属。
- 插件 MUST 提供设置项允许用户选择：删除父 list item 时是否同时删除其子列表（Logseq/Roam 风格）。该开关默认关闭。

#### Scenario: Deleting list marker removes system line (default behavior)
- **GIVEN** 当前文件已启用 Enhanced List Blocks
- **AND** 用户保持默认设置（不删除子列表）
- **WHEN** 用户删除某父 list item 的 list marker（仅删除父节点本身，不显式选中子节点内容）
- **THEN** 插件删除该父 list item 的系统行
- **AND** 插件不删除其子列表内容

#### Scenario: Deleting parent list item removes children when enabled
- **GIVEN** 当前文件已启用 Enhanced List Blocks
- **AND** 用户在设置中开启“删除父节点时一并删除子列表”
- **WHEN** 用户删除某父 list item（仅删除父节点本身，不显式选中子节点内容）
- **THEN** 插件删除该父 list item 的整棵子树（包含系统行与所有子列表）

