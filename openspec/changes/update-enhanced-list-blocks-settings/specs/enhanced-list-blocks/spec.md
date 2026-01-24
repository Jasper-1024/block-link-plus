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

