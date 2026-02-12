## Context
Outliner v2 block editor 是自建 CM6 `EditorView`。对 `ArrowUp/ArrowDown` 的“跨 block 连续光标移动”，需要同时满足：
- 行内软换行/视觉行（visual line）一致性
- 仅在到达 block 顶/底时跨 block（不创建新 block）
- 与折叠/zoom scope 的“可见 block 序”一致
- 避免 CM6 在边界处出现 selection/head 的水平漂移导致的误判与闪动
- 在跨 block（尤其是短行 clamp）后保持列偏移的“视觉连续”（sticky goal column）

## Verified Constraints (9222)
这些结论来自 CDP(9222) 实测：
- “selection 不变”不能作为边界判定：在 doc-top/doc-bottom 按方向键，`head/ch` 可能发生水平变化，但没有垂直移动。
- 可行支点：使用 `EditorView.coordsAtPos()` 比较按键前后 caret 的 `top`（dy）。
  - `|dy| < 1px` 视为无垂直移动（到达 block 顶/底边界）
  - `|dy| >= 1px` 视为仍在 block 内部移动
- 在边界处按方向键可能导致水平漂移；实现应避免应用仅水平变化的目标 selection，并在无 prev/next 可见 block 时保持完全不动。

## Decisions
- **Boundary detection**：在 keymap handler 内用 `EditorView.moveVertically(...)` 计算 block 内目标 caret，再用 `coordsAtPos().top` 差值判定是否发生垂直移动。
- **No-op at boundary**：若判定为边界（dy≈0），不应用该 selection（避免水平漂移）；仅在存在 prev/next 可见 block 时跨 block 跳转，否则保持不动。
- **Visible order**：prev/next 基于当前 render root（zoom stack）+ `collapsedIds` 计算出的 DFS 顺序。
- **Sticky goal column**：
  - 第一次 ArrowUp/Down 开启 session，记录 `goalCh = current ch`（按键前）。
  - session 内跨 block 跳转始终使用 `goalCh`，不被短行 clamp 的 `current ch` 覆盖。
  - 任意非 plain ArrowUp/Down 输入（键盘或鼠标定位）重置 session。

## Risks / Trade-offs
- key handler 内“先执行 command 再判定”属于探测式策略，但被 9222 实测证实可稳定覆盖软换行/视觉行边界，且无需复制 Obsidian editor 栈。
- 该策略避免了“先应用 selection 再 restore”的额外 dispatch；整体更接近结构化行为：只在确知需要时才移动。
