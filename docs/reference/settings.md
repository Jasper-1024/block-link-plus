# 设置参考

所有配置选项的详细说明。

## 设置页导航（Tabs + 搜索）

从 v1.9.0 起，Block Link Plus 的设置页提供 Tabs 分组与跨 Tab 搜索：
- Tabs：`基础` / `增强列表` / `内置插件`
- 搜索：在顶部输入关键词（如 `zoom` / `handle` / `blp-view`）即可跨 Tab 过滤设置项；点击 Tab 或按 `Esc` 退出搜索模式。

## 多行块行为

**mult_line_handle**
- `0` - 默认处理
- `1` - 添加新标题
- `2` - 添加多个块
- `3` - 添加多行块

## 块链接

### 右键菜单
- **enable_right_click_block** - 启用常规块链接菜单
- **enable_right_click_embed** - 启用嵌入链接菜单
- **enable_right_click_url** - 启用URI链接菜单

### 通知设置
- **enable_block_notification** - 复制块链接时显示通知
- **enable_embed_notification** - 复制嵌入链接时显示通知
- **enable_url_notification** - 复制URI时显示通知

### 别名配置
- **alias_type** - 别名类型 (0=无, 1=前X字符, 2=标题, 3=选中文本)
- **alias_length** - 别名长度 (1-100)

## 块ID

- **enable_prefix** - 启用自定义前缀
- **id_prefix** - 块ID前缀
- **id_length** - 块ID长度 (3-7)
- **heading_id_newline** - 标题块ID换行 (实验性)

## Enhanced List Blocks

- **enhancedListEnabledFolders** - 启用的文件夹列表（vault 相对路径）
- **enhancedListEnabledFiles** - 启用的文件列表（vault 相对路径）
- **enhancedListHideSystemLine** - 在 Live Preview/Reading mode 隐藏系统行
- **enhancedListHandleAffordance** - 显示列表手柄（仅 Live Preview + 启用文件）
- **enhancedListHandleActions** - 启用列表手柄动作（仅 Live Preview + 启用文件）
- **enhancedListHandleClickAction** - 手柄左键动作（`toggle-folding` | `menu` | `none`）
- **enhancedListIndentCodeBlocks** - 缩进嵌套围栏代码块（仅 Live Preview + 启用文件）
- **enhancedListDeleteSubtreeOnListItemDelete** - 删除列表项时是否连带删除子项
- **blpViewAllowMaterialize** - 允许 `render.mode: materialize` 写回
- **blpViewMaxSourceFiles** - 最大扫描文件数（`0` = 不限制）
- **blpViewMaxResults** - 最大输出结果数（`0` = 不限制）
- **blpViewShowDiagnostics** - 输出下方显示诊断信息（计数 + 耗时）

## Built-in Outliner / Zoom

- **builtInObsidianOutlinerEnabled** - 启用内置 Outliner（vendored `obsidian-outliner@4.9.0`）
- **builtInObsidianOutlinerSettings** - 内置 Outliner 的设置对象（保持与上游一致）
- **builtInObsidianZoomEnabled** - 启用内置 Zoom（vendored `obsidian-zoom@1.1.2`）
- **builtInObsidianZoomSettings** - 内置 Zoom 的设置对象（保持与上游一致）
- **builtInVslinkoScopeToEnhancedList** - 将内置列表交互限定到 Enhanced List 启用文件（仅 Live Preview）

## 内嵌编辑 (Inline Edit)

- **inlineEditEnabled** - 内嵌编辑总开关
- **inlineEditFile** - 允许 `![[file]]` 在 Live Preview 中可编辑
- **inlineEditHeading** - 允许 `![[file#Heading]]` 在 Live Preview 中可编辑
- **inlineEditBlock** - 允许 `![[file#^id]]` / `![[file#^id-id]]` 在 Live Preview 中可编辑

## 默认值

```json
{
  "mult_line_handle": 0,
  "alias_type": 0,
  "alias_length": 20,
  "enable_right_click_block": true,
  "enable_right_click_embed": true,
  "enable_right_click_url": false,
  "enable_prefix": false,
  "id_prefix": "",
  "id_length": 4,
  "heading_id_newline": false,
  "enable_block_notification": true,
  "enable_embed_notification": true,
  "enable_url_notification": true,
  "enhancedListEnabledFolders": [],
  "enhancedListEnabledFiles": [],
  "enhancedListHideSystemLine": true,
  "enhancedListHandleAffordance": true,
  "enhancedListHandleActions": true,
  "enhancedListHandleClickAction": "toggle-folding",
  "enhancedListIndentCodeBlocks": true,
  "enhancedListDeleteSubtreeOnListItemDelete": false,
  "blpViewAllowMaterialize": true,
  "blpViewMaxSourceFiles": 0,
  "blpViewMaxResults": 0,
  "blpViewShowDiagnostics": false,
  "builtInObsidianOutlinerEnabled": false,
  "builtInObsidianOutlinerSettings": {
    "styleLists": true,
    "debug": false,
    "stickCursor": "bullet-and-checkbox",
    "betterEnter": true,
    "betterVimO": true,
    "betterTab": true,
    "selectAll": true,
    "listLines": false,
    "listLineAction": "toggle-folding",
    "dnd": true,
    "previousRelease": null
  },
  "builtInObsidianZoomEnabled": false,
  "builtInObsidianZoomSettings": {
    "debug": false,
    "zoomOnClick": true,
    "zoomOnClickMobile": false
  },
  "builtInVslinkoScopeToEnhancedList": false,
  "inlineEditEnabled": true,
  "inlineEditFile": false,
  "inlineEditHeading": true,
  "inlineEditBlock": true,
  "lastSeenVersion": ""
}
```
