# 时间线

从多个文件提取时间标题，按时间排序生成聚合视图。

## 基础用法

创建 `blp-timeline` 代码块：

````markdown
```blp-timeline
---
source_folders:
  - "日记"
heading_level: 4
---
```
````

## 核心配置

### 必需配置
```yaml
source_folders:
  - "日记/2024"
  - "会议记录"
```

### 常用选项
```yaml
heading_level: 4              # 提取的标题级别
within_days: 30              # 最近30天
sort_order: desc             # desc/asc
embed_format: '!![[]]'       # !![[]] 或 ![[]]
```

## 过滤器

### 按标签过滤
```yaml
filters:
  tags:
    relation: AND
    items:
      - '#项目/重要'
      - '#状态/进行中'
```

### 按链接过滤
```yaml
filters:
  links:
    relation: OR
    items:
      - "[[项目A]]"
      - "[[会议]]"
    link_to_current_file: true
```

### 组合过滤
```yaml
filters:
  relation: AND
  tags:
    relation: OR
    items:
      - '#重要'
  links:
    relation: AND
    items:
      - "[[项目]]"
```

## 时间匹配

提取标题中的时间用于排序：

```yaml
time_pattern: '(\\d{2}:\\d{2})'
```

匹配标题："#### 14:30 项目会议" → 提取 "14:30"

## 输出格式

生成的时间线格式：

```
%% blp-timeline-start data-hash="..." %%
[[文件1]]

![[文件1#标题1]]

![[文件1#标题2]]

---
[[文件2]]

![[文件2#标题1]]
%% blp-timeline-end %%
```

## 调试模式

添加 `debug: true` 查看详细信息：

```yaml
debug: true
source_folders: ["日记"]
```

显示配置解析、查询结果和过滤统计。

## 依赖要求

时间线功能需要 Dataview 插件，在设置页面可查看状态。