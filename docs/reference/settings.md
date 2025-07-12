# 设置参考

所有配置选项的详细说明。

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
- **enable_right_click_editable_embed** - 启用可编辑嵌入菜单
- **enable_right_click_url** - 启用URI链接菜单

### 通知设置
- **enable_block_notification** - 复制块链接时显示通知
- **enable_embed_notification** - 复制嵌入链接时显示通知
- **enable_editable_embed_notification** - 复制可编辑嵌入时显示通知
- **enable_url_notification** - 复制URI时显示通知

### 别名配置
- **alias_type** - 别名类型 (0=无, 1=前X字符, 2=标题, 3=选中文本)
- **alias_length** - 别名长度 (1-100)

## 块ID

- **enable_prefix** - 启用自定义前缀
- **id_prefix** - 块ID前缀
- **id_length** - 块ID长度 (3-7)
- **heading_id_newline** - 标题块ID换行 (实验性)

## 时间章节

- **enable_time_section** - 启用时间章节功能
- **enable_time_section_in_menu** - 在右键菜单中显示
- **time_section_format** - 时间格式 (如 "HH:mm")
- **time_section_title_pattern** - 标题匹配模式
- **time_section_plain_style** - 预览中使用纯文本样式
- **insert_heading_level** - 启用自动标题级别
- **daily_note_pattern** - 日记文件名模式
- **daily_note_heading_level** - 日记中的标题级别 (1-6)

## 时间线

- **enableTimeline** - 启用时间线功能
- **timelineDefaultHeadingLevel** - 默认标题级别 (1-6)
- **timelineDefaultEmbedFormat** - 默认嵌入格式 ('!![[]]' 或 '![[]]')
- **timelineDefaultSortOrder** - 默认排序 ('asc' 或 'desc')

## 流式编辑器

- **editorFlow** - 启用嵌入块编辑
- **editorFlowStyle** - 编辑样式 ("minimal" 或 "seamless")

## 默认值

```json
{
  "mult_line_handle": 0,
  "alias_type": 0,
  "alias_length": 20,
  "enable_prefix": false,
  "id_prefix": "",
  "id_length": 4,
  "enable_time_section": true,
  "time_section_format": "HH:mm",
  "daily_note_heading_level": 2,
  "enableTimeline": true,
  "timelineDefaultHeadingLevel": 4,
  "editorFlow": true,
  "editorFlowStyle": "minimal"
}
```