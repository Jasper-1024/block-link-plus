# Journal Feed（日记连续流）

Journal Feed 是一个 **anchor-only**（仅锚点文件触发）的视图：在 Obsidian 中用一个“锚点文件”打开类似 Logseq Journals 的**连续日记流**，一次性查看/编辑多天日记；但每一天仍然保存为**独立的 Daily Note 文件**。

## 前置条件

- 已启用 Obsidian 核心插件 **Daily Notes**
- 已配置 Daily Notes 的 folder + date format（设置 → Daily Notes）

Journal Feed **只读取**这些设置，不会接管/替换 Daily Notes 的模板、命令或创建流程。

## 启用方式（锚点文件）

创建任意 Markdown 文件（不需要是日记文件），在 frontmatter 写：

```yaml
---
blp_journal_view: true

# 可选：
blp_journal_initial_days: 3   # 默认 3
blp_journal_page_size: 7      # 默认 7
---
```

之后正常打开这个文件：当检测到 `blp_journal_view: true` 时，Block Link Plus 会把它路由到 Journal Feed 视图。

## 行为说明

- 日记来源完全跟随 Obsidian core **Daily Notes** 配置（folder + format）
- 按日期**倒序**展示已有的 daily note 文件
- 初始只加载最近 N 天；向下滚动时再懒加载更早的 N 天（不会一次性加载全部日记文件）
- 每一天是一个独立区块：
  - header + **Open** 按钮（用普通方式打开该天原文件）
  - 内嵌编辑器，编辑内容直接写入该天文件

## V1 限制 / 非目标

- 不会创建日记文件、不接管模板/命令
- 直接打开某一天的日记文件仍然是普通 Markdown 视图（不会被强制路由到 Journal Feed）
- 仅支持 core Daily Notes（V1 不支持 Periodic Notes）
- 不提供跨文件操作（跨天移动 block、跨文件统一撤销/重做等）

## 排错

- 提示 Daily Notes disabled：到 设置 → 核心插件 → Daily Notes 启用
- 提示 “No Daily Notes files found”：先按 Daily Notes 配置创建一些日记文件
- 通过 **Open Anchor** 按钮可把锚点文件用普通 Markdown 源码视图打开

