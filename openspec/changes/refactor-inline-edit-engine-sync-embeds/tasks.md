# Tasks: Refactor Inline Edit Engine (Basics → sync-embeds)

> 目标：单个 OpenSpec change + 一个长期 feature 分支；按 Milestone 逐步集成，每一步都保持可编译/可加载并可手动验收。

## Milestones

### Milestone 0: OpenSpec (spec-first)
- [x] 0.1 创建 change 脚手架（`proposal.md` / `tasks.md` / spec deltas）。
- [x] 0.2 编写并自检 spec deltas：
  - [x] `inline-editing-embeds`
  - [x] `block-link-generation`
  - [x] `multiline-block-references`
  - [x] `settings-configuration`
  - [x] `timeline-aggregation`

### Milestone 1: Settings migration (no engine switch)
- [x] 1.1 新增设置：`inlineEditEnabled` + `inlineEditFile/Heading/Block`（默认：file=false，heading=true，block=true；global 由旧值迁移）。
- [x] 1.2 迁移并移除旧设置：`editorFlow` → `inlineEditEnabled`；删除 `editorFlowStyle`。
- [x] 1.3 Settings UI：替换旧 FlowEditor 区块为新 4 个 toggle（无 style）。
- [x] 1.4 Timeline 设置：删除 `timelineDefaultEmbedFormat` 与任何 `embed_format`/`!!` 相关描述。

验收（手动）：设置页不再出现 `!!` / editable embed / `editorFlowStyle`；新 4 个开关可保存并在重启后保持。

### Milestone 2: New engine scaffold (safe no-op)
- [x] 2.1 新模块骨架：InlineEditEngine / EmbedLeafManager / FocusTracker（可空跑）。
- [x] 2.2 Leaf 生命周期：create/open/re-parent/detach/cleanup（参考 `sync-embeds/src/embed-manager.js`）。
- [x] 2.3 防递归：对 inline edit 根容器打标，扫描命中则跳过。
- [x] 2.4 禁止 `!![[...]]` 兼容：识别并跳过，不做 DOM 清理或降级。

验收（手动）：开启开关后不接管渲染也不报错；关闭开关不残留 DOM。

### Milestone 3: Live Preview takeover (BlockID)
- [x] 3.1 仅在 Live Preview 生效（Reading 不创建 editor）。
- [x] 3.2 `![[file#^id]]`：创建 leaf/editor 并裁剪到可见/可编辑范围（可见=可编辑）。
- [x] 3.3 卸载与切换：关闭文件/切换 leaf/关闭设置时正确 detach。

验收（手动）：Live Preview 下 `![[file#^id]]` 可编辑；控制台无错误。

### Milestone 4: Live Preview takeover (Heading + line-level read-only)
- [x] 4.1 `![[file#Heading]]`：可见范围 `[start,end]`。
- [x] 4.2 标题行“可见但只读”：实现“可见范围 vs 可编辑范围”分离（heading 行不可编辑）。

验收（手动）：标题行显示正常但无法改；正文可改。

### Milestone 5: Live Preview takeover (Range `^id-id` + marker read-only)
- [x] 5.1 `![[file#^id-id]]`：可见范围 `[start,end]`。
- [x] 5.2 marker 行“可见但只读”：末尾 `^id-id` 行不可编辑但仍显示。
- [x] 5.3 `inlineEditEnabled=false` 时仍必须渲染 `^id-id` 多行范围（只读）。

验收（手动）：marker 行可见但无法编辑；其余行可改。

### Milestone 6: Command / hotkey routing (sync-embeds style)
- [x] 6.1 focus tracking：维护“当前聚焦 embed”。
- [x] 6.2 `monkey-around` patch：`executeCommand` / `getActiveViewOfType` / `activeLeaf`（参考 `sync-embeds/src/main.js`）。

验收（手动）：在 embed editor 内，常用快捷键与用户自定义热键作用于 embed。

### Milestone 7: Reading mode (Range-only readonly rendering)
- [x] 7.1 Reading 永不创建 editor leaf。
- [x] 7.2 仅 `^id-id`：抽取片段走 preview 渲染管线渲染到原生 embed shell。
- [x] 7.3 增量刷新：按源文件路径索引 + debounce（监听 Vault/MetadataCache 信号）。

验收（手动）：Reading 下 `^id-id` 正确显示范围并随源文件更新；其它 embed 不被接管。

### Milestone 8: Final switch & cleanup
- [x] 8.1 移除旧 FlowEditor/Basics 接入与相关 CSS/patch。
- [x] 8.2 全仓清理 `!!`：代码/设置/i18n/docs/tests/Timeline YAML 文档。
- [ ] 8.3 回归：Live Preview/Reading、多种引用、无控制台错误。

验收（手动）：用户文档（README、docs/）中不再出现 `!![[`；功能按新设置模型运行。
