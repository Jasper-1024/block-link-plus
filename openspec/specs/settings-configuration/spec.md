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
插件 SHALL 将设置按功能分组（例如块链接、别名、多行块、时间章节、时间线等），并提供足够明确的描述文本。

#### Scenario: Settings are discoverable
- **WHEN** 用户需要调整某个行为（例如别名策略或多行块行为）
- **THEN** 用户能够在对应分组中找到设置项，并从描述中理解其影响范围与默认值

### Requirement: Support localization for user-facing strings
插件 SHALL 为用户可见的设置项、命令与提示文本提供多语言支持（至少包含中文与英文）。

#### Scenario: Switch language
- **WHEN** Obsidian 或插件语言环境切换
- **THEN** 设置项与命令名称以对应语言展示（在可用翻译存在时）
