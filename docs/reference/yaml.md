# YAML配置

时间线功能的完整YAML配置参考。

## 基础结构

```yaml
---
# 必需配置
source_folders:
  - "文件夹路径"

# 可选配置
heading_level: 4
within_days: 30
sort_order: desc
embed_format: '!![[]]'
time_pattern: '(\\d{2}:\\d{2})'
debug: false

# 高级过滤
filters:
  relation: AND
  tags: {...}
  links: {...}
---
```

## 配置选项

### source_folders (必需)
指定搜索的文件夹：
```yaml
source_folders:
  - "日记/2024"
  - "会议记录"
  - "项目笔记/重要"
```

### 基础选项

**heading_level** (1-6)
```yaml
heading_level: 4  # 匹配 #### 级别标题
```

**within_days** (数字)
```yaml
within_days: 30   # 最近30天的文件
```

**sort_order** (asc/desc)
```yaml
sort_order: desc  # 最新的在前
```

**embed_format** (!![[]] 或 ![[]])
```yaml
embed_format: '!![[]]'  # 可编辑嵌入
embed_format: '![[]]'   # 普通嵌入
```

### 时间匹配

**time_pattern** (正则表达式)
```yaml
# 匹配 HH:MM 格式
time_pattern: '(\\d{2}:\\d{2})'

# 匹配 H:MM 格式
time_pattern: '(\\d{1,2}:\\d{2})'

# 匹配时间范围
time_pattern: '(\\d{2}:\\d{2}-\\d{2}:\\d{2})'
```

## 过滤器配置

### 标签过滤
```yaml
filters:
  tags:
    relation: AND        # AND 或 OR
    items:
      - '#项目/重要'
      - '#状态/进行中'
    
    # 从frontmatter提取标签
    from_frontmatter:
      key: "tags"
      exclude:
        - "草稿"
```

### 链接过滤
```yaml
filters:
  links:
    relation: OR         # AND 或 OR
    items:
      - "[[项目A]]"
      - "[[重要会议]]"
    
    # 自动包含链接到当前文件的内容
    link_to_current_file: true
```

### 组合过滤
```yaml
filters:
  relation: AND          # 标签和链接都要满足
  
  tags:
    relation: OR         # 标签满足任一个
    items:
      - '#重要'
      - '#紧急'
  
  links:
    relation: AND        # 链接都要满足
    items:
      - "[[项目]]"
      - "[[本周]]"
```

## 调试配置

```yaml
debug: true
source_folders: ["日记"]
heading_level: 4
```

显示调试信息：
- 解析的配置
- 找到的文件数
- 过滤器匹配结果
- 最终生成的链接数

## 完整示例

```yaml
---
# 聚合最近一个月项目相关的时间记录
source_folders:
  - "日记/2024"
  - "会议记录"

within_days: 30
heading_level: 4
time_pattern: '(\\d{2}:\\d{2})'
embed_format: '!![[]]'
sort_order: desc

filters:
  relation: AND
  
  tags:
    relation: OR
    items:
      - '#项目/重要'
      - '#会议'
  
  links:
    relation: OR
    items:
      - "[[项目A]]"
      - "[[客户沟通]]"
    link_to_current_file: true
---
```