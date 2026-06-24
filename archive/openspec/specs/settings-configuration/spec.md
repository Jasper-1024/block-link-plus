# Capability: Settings Configuration

## Purpose
在 Obsidian 设置页中提供可发现、可理解、可本地化的配置入口，覆盖插件的核心功能与行为开关。
## Requirements
### Requirement: Provide a settings tab in Obsidian
插件 SHALL 在 Obsidian 设置界面提供设置页，允许用户配置链接格式、别名策略、提示行为与功能开关。

#### Scenario: User opens settings tab
- **WHEN** 用户进入 Obsidian 的插件设置并打开 Block Link Plus
- **THEN** 能看到分组清晰的设置项，并可立即生效或在保存后生效（以实现为准）

### Requirement: Organize settings with clear categories and descriptions
插件 SHALL 将设置按功能分组（例如块链接、别名、多行块、内联编辑、Enhanced List Blocks、Built-in Outliner/Zoom 等），并提供足够明确的描述文本。

#### Scenario: Settings are discoverable
- **WHEN** 用户需要调整某个行为（例如别名策略或多行块行为）
- **THEN** 用户能够在对应分组中找到设置项，并从描述中理解其影响范围与默认值

### Requirement: Support localization for user-facing strings
插件 SHALL 为用户可见的设置项、命令与提示文本提供多语言支持（至少包含中文与英文）。

#### Scenario: Switch language
- **WHEN** Obsidian 或插件语言环境切换
- **THEN** 设置项与命令名称以对应语言展示（在可用翻译存在时）

### Requirement: Configure inline edit engine with global + type toggles
插件 SHALL 在设置中提供 inline edit 引擎的开关：
- `inlineEditEnabled`（全局开关）
- `inlineEditFile`（整页 `![[file]]`）
- `inlineEditHeading`（`![[file#Heading]]`）
- `inlineEditBlock`（`![[file#^id]]` 与 `![[file#^id-id]]`）

默认值：
- `inlineEditFile=false`
- `inlineEditHeading=true`
- `inlineEditBlock=true`

#### Scenario: Inline edit settings are configurable
- **WHEN** 用户打开插件设置页
- **THEN** 用户能看到并配置上述 4 个开关，并在保存后生效

### Requirement: Remove legacy editable embed, style, and timeline embed format settings
插件 SHALL 移除所有与 `!![[...]]` / editable embed / `editorFlowStyle` / timeline `embed_format` 相关的设置与描述文本。

#### Scenario: Legacy options are not present
- **WHEN** 用户打开插件设置页
- **THEN** 设置中不再出现任何 `!!`/editable embed、`editorFlowStyle`、或 timeline `embed_format` 相关选项

### Requirement: Configure Enhanced List Blocks handle actions
The plugin SHALL provide a setting to enable/disable Enhanced List Blocks list-handle actions (click-to-fold and handle actions menu).

The setting:
- MUST default to enabled.
- MUST only affect Live Preview and Enhanced List Blocks enabled files.

#### Scenario: Disable handle actions
- **WHEN** the user disables the handle actions setting
- **THEN** clicking/right-clicking list handles does not trigger any handle actions

### Requirement: Configure Enhanced List Blocks handle affordance
The plugin SHALL provide a setting to enable/disable the Enhanced List Blocks list-item “handle” affordance.

The setting:
- MUST default to enabled.
- MUST only affect Live Preview and Enhanced List Blocks enabled files.

#### Scenario: Toggle handle affordance
- **WHEN** the user disables the handle affordance setting
- **THEN** the handle affordance styling is not applied

### Requirement: Configure Enhanced List block selection mode
The plugin SHALL allow users to enable block selection mode for Enhanced List Blocks by configuring the list handle click action to `select-block`.

#### Scenario: Select-block option is available
- **WHEN** the user opens the Enhanced List settings
- **THEN** the handle click action dropdown includes a `select-block` option

#### Scenario: Disable by choosing another click action
- **WHEN** the user changes the handle click action away from `select-block`
- **THEN** clicking list handles no longer triggers block selection behavior

### Requirement: Outliner scope settings are edited via list-based controls
The settings UI MUST provide list-based editors for File Outliner scope configuration:
- Enabled folders (vault-relative)
- Enabled files (vault-relative)

Each list editor MUST support:
- Adding a new row
- Removing a row
- Reordering rows
- Path suggestions (best-effort) to reduce typos

#### Scenario: User adds an enabled folder via list UI
- **GIVEN** the user opens the Outliner settings tab
- **WHEN** the user adds a new enabled folder row and selects a folder suggestion
- **THEN** the folder path is persisted to `fileOutlinerEnabledFolders`

### Requirement: Editor-menu allowlist is edited via list-based controls with suggestions
The settings UI MUST provide a list-based editor for `fileOutlinerEditorContextMenuAllowedPlugins`.

The editor SHOULD provide plugin id suggestions from the installed plugin manifests, and MUST include `core` as an option.

#### Scenario: User adds an allowlisted plugin id
- **GIVEN** the user opens the Outliner settings tab
- **WHEN** the user adds a plugin id row and selects an installed plugin id suggestion
- **THEN** the plugin id is persisted to `fileOutlinerEditorContextMenuAllowedPlugins`

### Requirement: Outliner settings are grouped by functional headings
The settings UI MUST group File Outliner settings into multiple headings so users can scan them quickly.

#### Scenario: User finds settings by scanning group headings
- **GIVEN** the Outliner settings tab is open
- **WHEN** the user scans the headings
- **THEN** scope, editing, integrations, and debug-related items are visually separated

### Requirement: Remove Timeline and Time Section settings groups
插件 MUST NOT 在设置页中暴露 Timeline 或 Time Section 的设置分组；相关功能已移除。

#### Scenario: No timeline/time-section groups in settings
- **WHEN** 用户打开 Block Link Plus 设置页
- **THEN** 不存在 Timeline 或 Time Section 的设置分组

### Requirement: Surface Dataview availability for `blp-view`
插件 SHALL 在 Enhanced List Blocks 相关设置区域展示 Dataview 插件可用性，以便用户理解 `blp-view` 的依赖关系。

#### Scenario: Dataview status is visible in settings
- **WHEN** 用户打开 Enhanced List Blocks 设置区域
- **THEN** 能看到 Dataview 可用/不可用状态提示

### Requirement: Configure built-in Outliner/Zoom scope
The plugin SHALL provide settings to scope built-in Outliner/Zoom list interactions and styling to Enhanced List Blocks enabled files.

The settings:
- MUST be user-configurable in the settings tab.
- MUST be opt-in (to avoid changing behavior for existing users).

#### Scenario: User enables scoping
- **WHEN** the user enables built-in Outliner/Zoom
- **AND** the user enables the "scope to Enhanced List" option
- **THEN** built-in list UX only applies to Enhanced List Blocks enabled files

### Requirement: Built-in Outliner list visuals support community themes
The plugin SHALL allow built-in Outliner list visuals (better list styling, vertical indentation lines) to work even when a community theme is enabled.

#### Scenario: Community theme still shows list visuals
- **WHEN** the user enables a non-default Obsidian theme
- **AND** the user enables built-in Outliner list visuals
- **THEN** the list visuals are still applied

### Requirement: Configure Enhanced List Blocks system line visibility
插件 SHALL 在 Enhanced List Blocks 设置区域提供“隐藏系统行”开关，供用户在隐藏/显示系统行之间切换。

#### Scenario: User can toggle system line visibility
- **WHEN** 用户打开 Block Link Plus 设置页的 Enhanced List Blocks 区域
- **THEN** 用户能看到并配置“隐藏系统行”开关

### Requirement: Configure `blp-view` guardrails and gate them by Dataview availability
插件 SHALL 在设置页提供 `blp-view`（Query/View）相关护栏设置（materialize 写回、扫描/输出上限、诊断信息）。
当 Dataview 不可用时，插件 MUST 隐藏这些 `blp-view` 设置项（仅保留 Dataview 状态提示）。

#### Scenario: Dataview missing hides `blp-view` settings
- **GIVEN** Dataview 未安装或未启用
- **WHEN** 用户打开 Enhanced List Blocks 设置区域
- **THEN** 用户只能看到 Dataview 状态提示
- **AND** 看不到任何 `blp-view` 护栏设置项

#### Scenario: Dataview available shows `blp-view` settings
- **GIVEN** Dataview 已安装且启用
- **WHEN** 用户打开 Enhanced List Blocks 设置区域
- **THEN** 用户可以看到并配置 `blp-view` 护栏设置项

