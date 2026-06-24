# Proposal: update-file-outliner-view-arrow-navigation

## Why
File Outliner View(v2) 目前 `ArrowUp` / `ArrowDown` 只能在单个 block 内移动光标，无法像在普通文件里一样跨 block 连续上下移动，打断键盘流操作。

同时，在 block 顶/底按方向键时，Obsidian/CM6 可能会出现“水平 head 漂移但没有垂直移动”的行为；如果直接据 selection 是否变化判断边界，会造成误判与不稳定体验。

## What Changes
- 在 Outliner block editor 内，为“纯 `ArrowUp` / `ArrowDown`”（无修饰键）提供跨 block 的连续光标移动：
  - `ArrowUp`：当光标到达当前 block 顶部时，跳到“上一个可见 block”的最后一行
  - `ArrowDown`：当光标到达当前 block 底部时，跳到“下一个可见 block”的第一行
  - 不创建新 block；没有 prev/next 可见 block 时不做任何移动（包括不产生水平漂移）
- 跳转时尽量保持列偏移（goal column），并在跨短行 clamp 后保持“视觉连续”（sticky goal column）
- prev/next 计算基于“当前可见序”：考虑折叠状态（collapsedIds）与 zoom scope（render root）

## Non-Goals
- 不改变 Outliner 的协议/system line 设计（`date/updated/blp_sys/blp_ver/^id` 等）
- 不覆盖 `Shift+ArrowUp/Down` 等组合键行为
- 不尝试复刻 Obsidian MarkdownView 的完整 CM6 extension 栈（继续遵循 S3 最小桥接路线）

## Impact
- 涉及代码：`src/features/file-outliner-view/view.ts`（editor keymap / 导航逻辑）
- 新增少量纯函数与单测（可见序、cursor 落点计算、goal column 状态机）
- 增加 CDP(9222) 回归脚本，确保真实 Obsidian 环境下行为稳定

