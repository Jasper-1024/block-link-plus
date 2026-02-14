# Proposal: add-settings-tabs-and-search

## Why
Block Link Plus 的设置项数量持续增长，当前“从上到下的长列表”在可发现性与可维护性上都开始吃力：
- 用户难以快速定位某个设置（尤其是内置 outliner/zoom 与 Enhanced List 相关的长段设置）。
- 新增设置会进一步拉长页面并增加误触/误配置成本。

## What Changes
- 在 BLP 设置页引入 **Tabs** 分组：
  - `Basics`（常用：块链接/嵌入/URI/BlockId/Inline Edit 等）
  - `Enhanced List`（实验/演研中的增强 list 能力）
  - `Built-in Plugins`（内置 vslinko 的 outliner / zoom 及其 scope）
- 在设置页顶部加入 **Search**（跨 Tab）：
  - 进入搜索模式后展示跨 Tab 的匹配设置项，并显示对应 Tab 标题作为分组提示。
  - 点击 Tab 退出搜索模式并回到常规浏览。

## Impact
- 纯 UI/UX 改造：不改变任何设置 key、默认值或核心行为。
- 新增样式类与少量 DOM 逻辑；需要补齐单测以确保基础交互稳定。

