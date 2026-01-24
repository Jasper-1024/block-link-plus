# 日记应用

使用 Block Link Plus 优化日记工作流。

## 基础设置

### Enhanced List Blocks 配置
```
启用范围: 在设置中添加日记文件夹/文件，或在日记文件 frontmatter 写入 blp_enhanced_list: true
Dataview: 需要安装并启用（用于 blp-view 查询/视图）
```

### 多行块配置
```
多行处理: 添加新标题
别名类型: 前20个字符
启用前缀: 是
ID前缀: diary
```

## 日记模板

```markdown
---
blp_enhanced_list: true
---

# 2024-01-15

## 晨间规划
- [ ] 回顾昨日总结
- [ ] 安排今日重点

## Log
- 09:00 晨会 [[项目A]] #项目/A
- 14:30 客户沟通 [[项目A]] #客户/重点
  - 客户反馈整理...

## 18:00 日结
今日完成：
今日问题：
明日重点：
```

## 使用 blp-view 聚合（替代时间线）

在月度或项目总结中创建 View：

````markdown
# 项目A - 一月总结

## 关键时间点

```blp-view
source:
  folders:
    - "日记/2024-01"
filters:
  date:
    within_days: 30
  outlinks:
    any:
      - "[[项目A]]"
group:
  by: day(date)
sort:
  by: date
  order: desc
render:
  type: embed-list
```
````

## 快速操作

### 创建重要内容块
1. 选中重要段落
2. 右键 → "复制块链接"
3. 在项目笔记中引用

### 跨日期引用
```markdown
昨天的重要决定：![[2024-01-14#^diary-abc123]]
```

## 进阶技巧

### 标签体系
```markdown
- 09:00 项目会议 #项目/A #会议/重要
- 14:30 客户沟通 #客户/重点 #状态/待跟进
```

### 链接网络
```markdown
- 09:00 [[项目A]] 进度同步
- 与 [[张三]] 讨论 [[技术方案]]
```

### 多维度 Query/View（示例）

````markdown
```blp-view
filters:
  tags:
    any:
      - "#项目/A"
render:
  type: table
```
````
