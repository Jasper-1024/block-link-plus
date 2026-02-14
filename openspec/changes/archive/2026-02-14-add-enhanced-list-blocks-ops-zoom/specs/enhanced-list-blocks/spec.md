## ADDED Requirements

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
