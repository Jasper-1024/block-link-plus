## 1. OpenSpec
- [x] 1.1 为 `file-outliner-view` 增加 V1 结构 history 的 spec delta
- [x] 1.2 补充最小实现设计与非目标边界
- [x] 1.3 运行 `openspec validate update-file-outliner-view-structural-history-v1 --strict --no-interactive`

## 2. Implementation
- [x] 2.1 为 File Outliner 增加 view-local 结构 undo/redo 状态与快照 helper
- [x] 2.2 将 V1 范围内的结构编辑统一接入 history 提交边界
- [x] 2.3 为编辑态增加 `Mod+Z` / `Mod+Y` / `Mod+Shift+Z` 的结构 history 路由与文本 fallback
- [x] 2.4 为非编辑态增加 root 级结构 undo/redo 路由，覆盖 drag/drop 之后的场景
- [x] 2.5 为关键场景补回归测试，确保不吞掉普通文本 undo/redo

## 3. Verification
- [x] 3.1 运行最小 Jest 回归：history / paste / editor-state / DnD 相关测试
- [x] 3.2 运行 `npm run build-with-types`
- [x] 3.3 用 `9222` 验证 V1 场景：split、多行 paste、indent/outdent、merge、drag/drop、文本 fallback
- [x] 3.4 更新草案与 change 中的验证结论，确认 V1 边界仍保持最小闭环
