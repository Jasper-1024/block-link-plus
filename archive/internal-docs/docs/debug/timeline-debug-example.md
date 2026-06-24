# Timeline Debug 功能使用指南

> 状态（2026-02 / v2.0.0）：Timeline（`blp-timeline`）已从主线移除。本文仅用于历史排查记录，2.0 不再适用。

## 概述

Timeline 功能现在支持 debug 模式，可以帮助调查筛选问题。当启用 debug 模式时，插件会在预览面板显示详细的 JSON 调试信息，而不是执行正常的时间线处理。

## 输出格式

从版本 1.5.3 开始，Timeline 的输出格式已更新为更加结构化的格式：

```
%% blp-timeline-start data-hash="..." %%
[[文件路径1]]

![[文件路径1#标题1]]

![[文件路径1#标题2]]

---
[[文件路径2]]

![[文件路径2#标题1]]
%% blp-timeline-end %%
```

新格式的特点：
- 每个文件有一个普通链接作为入口
- 文件之间用 `---` 分隔
- 每个内容行之间有空行
- 用户对嵌入链接的自定义修改会被保留

## 使用方法

在 blp-timeline 代码块中添加 `debug: true` 配置：

```yaml
```blp-timeline
debug: true
source_folders: ["Daily Notes", "Projects"]
within_days: 30
heading_level: 4
filters:
  relation: AND
  tags:
    relation: OR
    items: ["#meeting", "#task"]
  links:
    relation: AND
    link_to_current_file: true
```
```

## Debug 输出结构

启用 debug 模式后，预览面板会显示如下结构的 JSON 信息：

### 1. 解析配置 (parsedConfig)
显示最终合并的时间线配置，包括默认值和用户覆盖的值：
```json
{
  "parsedConfig": {
    "source_folders": ["Daily Notes", "Projects"],
    "within_days": 30,
    "sort_order": "desc",
    "heading_level": 4,
    "embed_format": "!![[]]",
    "time_pattern": null,
    "debug": true,
    "filters": {
      "relation": "AND",
      "tags": {
        "relation": "OR", 
        "items": ["#meeting", "#task"]
      },
      "links": {
        "relation": "AND",
        "link_to_current_file": true
      }
    }
  }
}
```

### 2. 解析筛选器 (resolvedFilters)
显示经过解析和规范化的筛选器：
```json
{
  "resolvedFilters": {
    "tags": ["#meeting", "#task"],
    "links": [
      {"path": "/Daily Notes/2024-12-26.md", "type": "file"}
    ]
  }
}
```

### 3. Dataview 查询结果 (dataviewQueryResults)
显示 Dataview 查询返回的页面数据（限制显示前10个）：
```json
{
  "dataviewQueryResults": {
    "totalPages": 15,
    "pages": [
      {
        "path": "/Daily Notes/2024-12-26.md",
        "name": "2024-12-26.md",
        "tags": ["#meeting", "#daily"],
        "cday": "2024-12-26T00:00:00.000Z",
        "outlinks": ["/Projects/Project A.md"]
      }
    ]
  }
}
```

### 4. 提取的 Sections (extractedSections)
显示从页面中提取的相关标题 sections（限制显示前20个）：
```json
{
  "extractedSections": {
    "totalSections": 8,
    "sections": [
      {
        "file": {
          "path": "/Daily Notes/2024-12-26.md",
          "name": "2024-12-26.md",
          "basename": "2024-12-26"
        },
        "heading": {
          "text": "10:30 Meeting with Team",
          "level": 4,
          "line": 15
        }
      }
    ]
  }
}
```

### 5. 筛选统计 (filteringStats)
显示筛选效率和数据转换情况：
```json
{
  "filteringStats": {
    "candidateFiles": 15,
    "sectionsAfterExtraction": 8,
    "filterEfficiency": "8/15 sections extracted"
  }
}
```

## 调试流程

使用 debug 输出来诊断时间线筛选问题：

### 1. 检查配置解析
- 确认 `source_folders` 是否正确
- 检查 `filters` 配置是否符合预期
- 验证 `heading_level` 和其他设置

### 2. 检查筛选器解析
- 确认 `tags` 是否正确解析和规范化
- 检查 `links` 是否正确解析到文件路径
- 验证前置元数据标签提取是否正常

### 3. 检查 Dataview 查询
- 确认返回的页面数量是否合理
- 检查页面的 `tags` 和 `outlinks` 数据
- 验证 `within_days` 筛选是否生效

### 4. 检查 Section 提取
- 确认从页面中提取的标题数量
- 检查标题级别是否匹配 `heading_level`
- 验证 `time_pattern` 筛选是否生效

### 5. 分析筛选效率
- 比较候选文件数和最终提取的 sections 数
- 如果筛选效率过低，检查筛选条件是否过于严格
- 如果没有提取到 sections，检查标题级别和时间模式

## 常见问题诊断

### 问题：没有找到任何时间线项目
**检查步骤**：
1. 查看 `dataviewQueryResults.totalPages` 是否为 0
2. 如果为 0，检查 `source_folders` 配置
3. 如果不为 0，查看 `extractedSections.totalSections`
4. 如果为 0，检查 `heading_level` 和筛选条件

### 问题：筛选结果不符合预期
**检查步骤**：
1. 查看 `resolvedFilters` 是否包含预期的标签和链接
2. 检查 `dataviewQueryResults.pages` 中的页面数据
3. 验证页面的 `tags` 和 `outlinks` 是否包含目标筛选器
4. 检查筛选关系（AND/OR）是否正确

### 问题：时间模式筛选不工作
**检查步骤**：
1. 确认 `time_pattern` 在 `parsedConfig` 中是否正确
2. 查看 `extractedSections.sections` 中的标题文本
3. 验证正则表达式是否匹配标题格式

## 注意事项

- Debug 模式会阻止正常的时间线处理，仅用于调试
- JSON 输出限制了显示的数据量以避免过大的输出
- 使用完 debug 后记得移除 `debug: true` 配置
- Debug 输出仅在预览模式下可见 
