## ADDED Requirements
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