## MODIFIED Requirements

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

## ADDED Requirements

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
