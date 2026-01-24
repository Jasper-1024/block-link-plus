## MODIFIED Requirements

### Requirement: Organize settings with clear categories and descriptions
插件 SHALL 将设置按功能分组并保持可发现性；当设置项较多时，插件 SHOULD 提供更强的导航能力（例如 Tabs 与搜索）。

当前实现约束（UI 组织）：
- 设置页提供至少 3 个顶层 Tabs：`Basics`、`Enhanced List`、`Built-in Plugins`
- `Built-in Plugins` Tab 聚合内置（vendored）插件的相关设置（例如 outliner/zoom 与 scope）
- `Enhanced List` Tab 聚合 Enhanced List Blocks 的相关设置（scope、渲染、交互等）

#### Scenario: User navigates settings by tabs
- **WHEN** 用户打开 Block Link Plus 设置页
- **THEN** 能看到 `Basics` / `Enhanced List` / `Built-in Plugins` 三个 Tab
- **AND** 切换 Tab 时只展示该 Tab 下的设置项

#### Scenario: User searches settings across tabs
- **WHEN** 用户在设置页的搜索框中输入关键词（例如 `zoom`）
- **THEN** 设置页进入搜索模式并展示跨 Tab 的匹配设置项
- **AND** 若无匹配结果，则显示明确的空态提示

