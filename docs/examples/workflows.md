# 工作流示例

Block Link Plus 在不同场景下的应用方法。

## 项目管理

### 会议记录 → 项目跟踪

**会议记录 (2024-01-15-项目A会议.md)**
```markdown
# 项目A周例会

## 09:30 进度汇报
张三：前端页面完成60% ^meeting-progress
李四：后端API开发中 ^meeting-backend

## 10:00 问题讨论
数据库性能需要优化 ^meeting-issue

## 10:15 下周计划
1. 完成前端剩余页面
2. 性能优化方案确定 ^meeting-plan
```

**项目总览 (项目A.md)**
```markdown
# 项目A总览

## 本周进度
![[2024-01-15-项目A会议#^meeting-progress]]

## 待解决问题
![[2024-01-15-项目A会议#^meeting-issue]]

## 下周安排
![[2024-01-15-项目A会议#^meeting-plan]]
```

### 进度聚合（blp-view）

````markdown
# 项目A - 进度视图

```blp-view
source:
  folders:
    - "团队日报"
filters:
  date:
    within_days: 30
  outlinks:
    any:
      - "[[项目A]]"
  tags:
    any:
      - "#进展"
      - "#问题"
group:
  by: day(date)
sort:
  by: date
  order: desc
render:
  type: embed-list
```
````

## 学习笔记

### 知识点提取

**React学习笔记.md**
```markdown
# React Hooks 学习

## useState 用法
useState返回状态值和更新函数 ^react-usestate

## useEffect 用法  
useEffect处理副作用和生命周期 ^react-useeffect

## 自定义Hook
抽取组件逻辑，实现代码复用 ^react-custom-hooks
```

**项目开发笔记.md**
```markdown
# 前端开发要点

## React最佳实践
![[React学习笔记#^react-usestate]]
![[React学习笔记#^react-useeffect]]

## 性能优化
使用自定义Hook: ![[React学习笔记#^react-custom-hooks]]
```

## 研究工作流

### 文献管理

**论文阅读-AI模型优化.md**
```markdown
# GPT-4 Architecture Analysis

## 核心创新点
Transformer架构的改进 ^paper-innovation

## 训练方法
使用RLHF进行对齐 ^paper-training

## 应用场景
多模态能力扩展 ^paper-application
```

**研究项目.md**
```markdown
# AI模型研究项目

## 理论基础
![[论文阅读-AI模型优化#^paper-innovation]]

## 训练策略
![[论文阅读-AI模型优化#^paper-training]]
```

### 实验记录

使用 list item 记录实验过程（可搭配 Enhanced List Blocks）：

```markdown
---
blp_enhanced_list: true
---

# 实验记录 - 2024-01-15

- 09:00 环境准备
- 10:30 模型训练（batch_size=32）
- 14:00 结果分析（accuracy=85%）
- 16:30 参数调优（lr=0.001）
```

## 团队协作

### 任务分配

**项目分工.md**
```markdown
# 团队任务分配

## 张三 - 前端开发
负责用户界面实现 ^task-frontend
截止时间：1月20日

## 李四 - 后端开发  
负责API接口开发 ^task-backend
截止时间：1月18日

## 王五 - 测试
负责功能测试和集成测试 ^task-testing
截止时间：1月25日
```

### 个人任务看板

每个人的任务文件中引用分配的任务：

**张三任务.md**
```markdown
# 本周任务

## 主要工作
![[项目分工#^task-frontend]]

## 进度跟踪
- [x] 登录页面
- [ ] 用户中心
- [ ] 数据展示页面
```

### 进度汇总

使用 blp-view 汇总团队进度：

````markdown
```blp-view
source:
  folders:
    - "团队日报"
filters:
  date:
    within_days: 7
  tags:
    any:
      - "#完成"
      - "#进展"
group:
  by: file
sort:
  by: date
  order: desc
render:
  type: embed-list
```
````
