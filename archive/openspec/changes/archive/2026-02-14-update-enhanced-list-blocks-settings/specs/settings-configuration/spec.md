## ADDED Requirements

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

