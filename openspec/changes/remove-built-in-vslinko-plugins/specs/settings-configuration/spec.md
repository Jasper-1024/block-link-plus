# settings-configuration Spec Delta

## MODIFIED Requirements

### Requirement: Organize settings with clear categories and descriptions
插件 SHALL 将设置按功能分组并保持可发现性；当设置项较多时，插件 SHOULD 提供更强的导航能力（例如 Tabs 与搜索）。

当前实现约束（UI 组织）：
- 设置页提供 2 个顶层 Tabs：`Basics`、`Outliner`
- `Outliner` Tab 聚合 File Outliner View 的相关设置（scope、交互开关、调试等）以及 `blp-view` 的相关设置
- 设置中不再提供任何“Built-in Plugins / 内置插件（vendored outliner/zoom）”相关选项

#### Scenario: User navigates settings by tabs
- **WHEN** 用户打开 Block Link Plus 设置页
- **THEN** 能看到 `Basics` / `Outliner` 两个 Tab
- **AND** 切换 Tab 时只显示对应 Tab 下的设置项

#### Scenario: Built-in plugins settings are not present
- **WHEN** 用户打开 Block Link Plus 设置页
- **THEN** 不存在任何 built-in/vendored outliner/zoom 相关设置项

