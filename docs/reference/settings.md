# 设置参考

这里汇总 Block Link Plus 2.0 的主要设置项（以代码实现为准）。

## 设置页导航（Tabs + 搜索）

Block Link Plus 的设置页提供 Tabs 分组与跨 Tab 搜索：

- Tabs：`基础` / `Outliner`
- 搜索：在顶部输入关键词（如 `outliner` / `blp-view` / `zoom`）即可跨 Tab 过滤设置项；点击 Tab 或按 `Esc` 退出搜索模式

## 基础（Basics）

### 多行块

**mult_line_handle**

- `0` - 默认处理（多行选区视为一个块）
- `1` - 添加新标题（用特殊标记的 heading 包住选区）
- `2` - 添加多个块（按段落/列表项等批量生成多个 `^id`）
- `3` - 添加多行块（范围块：`^id-id`，如 `^abc123-abc123`）

### 块链接（Block Link）

- **enable_right_click_block** - 启用右键菜单：Copy Block Link
- **enable_block_notification** - 复制块链接后显示通知
- **alias_type** - 别名类型（0=无，1=前 X 字符，2=父标题，3=选中文本）
- **alias_length** - 别名长度（1-100）
- **heading_id_newline** - 标题块 ID 换行（实验性）

### 嵌入链接（Embed Link）

- **enable_right_click_embed** - 启用右键菜单：Copy Block as Embed
- **enable_embed_notification** - 复制嵌入链接后显示通知

### Obsidian URI

- **enable_right_click_url** - 启用右键菜单：Copy Block as Obsidian URI
- **enable_url_notification** - 复制 URI 后显示通知

### 块 ID（Block ID）

- **id_length** - 随机 ID 长度（3-7；默认 4）
- **enable_prefix** - 启用自定义前缀
- **id_prefix** - 块 ID 前缀（最终形如 `prefix-rand`）

### 内联编辑（Inline Edit）

- **inlineEditEnabled** - 内联编辑总开关
- **inlineEditFile** - 允许 `![[file]]` 在 Live Preview 中可编辑
- **inlineEditHeading** - 允许 `![[file#Heading]]` 在 Live Preview 中可编辑
- **inlineEditBlock** - 允许 `![[file#^id]]` / `![[file#^id-id]]` 在 Live Preview 中可编辑

## Outliner

### 总开关

- **fileOutlinerViewEnabled** - 启用 Outliner 路由：启用后，范围内文件默认用 Outliner 视图打开

### 启用范围

- **fileOutlinerEnabledFolders** - 启用文件夹列表（vault 相对路径；递归匹配）
- **fileOutlinerEnabledFiles** - 启用文件列表（vault 相对路径）
- **frontmatter 覆盖** - 每文件：`blp_outliner: true/false`

### 显示与交互

- **fileOutlinerHideSystemLine** - 在阅读模式隐藏带 `[blp_sys:: 1]` 的协议尾行
- **fileOutlinerEmphasisLineEnabled** - 强调当前块左侧连接线
- **fileOutlinerDragAndDropEnabled** - 拖拽圆点移动块子树
- **fileOutlinerZoomEnabled** - 点击圆点 Zoom 进入块子树

### 编辑行为

- **fileOutlinerChildrenOnSplit** - Enter 拆分块时子块处理（`keep` | `move`）
- **fileOutlinerPasteMultiline** - 粘贴多行文本（`split` | `multiline`）
- **fileOutlinerBackspaceWithChildren** - 行首 Backspace（有子块）（`merge` | `outdent`）

### 编辑器右键菜单（高级）

- **fileOutlinerEditorContextMenuEnabled** - 在 Outliner 编辑模式中使用 BLP 的右键菜单
- **fileOutlinerEditorContextMenuAllowedPlugins** - 允许向该菜单注入项的插件 ID 白名单（添加 `core` 以包含核心菜单项）

### 调试

- **fileOutlinerDebugLogging** - 将 Outliner 内部错误输出到 DevTools 控制台

## blp-view（Query/View）护栏

- **blpViewAllowMaterialize** - 允许 `render.mode: materialize` 写回
- **blpViewMaxSourceFiles** - 最大扫描文件数（`0` = 不限制）
- **blpViewMaxResults** - 最大输出结果数（`0` = 不限制）
- **blpViewShowDiagnostics** - 输出下方显示诊断信息（计数 + 耗时）

## 默认值

```json
{
  "mult_line_handle": 0,
  "alias_type": 0,
  "enable_right_click_block": true,
  "enable_right_click_embed": true,
  "enable_right_click_url": false,
  "alias_length": 20,
  "enable_prefix": false,
  "id_prefix": "",
  "id_length": 4,
  "heading_id_newline": false,
  "enable_block_notification": true,
  "enable_embed_notification": true,
  "enable_url_notification": true,

  "fileOutlinerEnabledFolders": [],
  "fileOutlinerEnabledFiles": [],
  "fileOutlinerHideSystemLine": true,
  "fileOutlinerViewEnabled": true,
  "fileOutlinerDragAndDropEnabled": true,
  "fileOutlinerZoomEnabled": true,
  "fileOutlinerEmphasisLineEnabled": true,
  "fileOutlinerDebugLogging": false,
  "fileOutlinerChildrenOnSplit": "keep",
  "fileOutlinerPasteMultiline": "split",
  "fileOutlinerBackspaceWithChildren": "merge",
  "fileOutlinerEditorContextMenuEnabled": true,
  "fileOutlinerEditorContextMenuAllowedPlugins": [],

  "blpViewAllowMaterialize": true,
  "blpViewMaxSourceFiles": 0,
  "blpViewMaxResults": 0,
  "blpViewShowDiagnostics": false,

  "inlineEditEnabled": true,
  "inlineEditFile": false,
  "inlineEditHeading": true,
  "inlineEditBlock": true,

  "lastSeenVersion": ""
}
```
