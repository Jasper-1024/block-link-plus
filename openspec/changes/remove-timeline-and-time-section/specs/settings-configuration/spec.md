## MODIFIED Requirements
### Requirement: Organize settings with clear categories and descriptions
插件 SHALL 将设置按功能分组（例如块链接、别名、多行块、内联编辑、Enhanced List Blocks、Built-in Outliner/Zoom 等），并提供足够明确的描述文本。

#### Scenario: Settings are discoverable
- **WHEN** 用户需要调整某个行为（例如别名策略或多行块行为）
- **THEN** 用户能够在对应分组中找到设置项，并从描述中理解其影响范围与默认值

## ADDED Requirements
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

