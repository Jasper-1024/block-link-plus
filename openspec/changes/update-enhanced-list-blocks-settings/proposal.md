# Proposal: Update Enhanced List Blocks settings (system line visibility + blp-view guardrails)

## Why
- Enhanced List Blocks 当前默认隐藏系统行（`[date:: ...] ^id`），但在排查/迁移/对齐 Dataview 行为时，用户需要能够临时显示系统行。
- Enhanced List Blocks 的系统行与 `^id` 需要始终与对应的 list item 绑定；当前用户删除 list item 时可能留下“孤儿系统行”或导致子列表被错误地重新归属，需要补齐删除语义以保证一致性。
- 但 Obsidian/Markdown 用户可能希望更“纯文本”的编辑体验；当用户删除父节点时，是否应一并删除子列表存在使用习惯差异，因此需要提供可配置开关。
- `blp-view`（Query/View）属于 Dataview 驱动的查询能力，存在两类用户诉求：
  - 安全护栏：例如允许在设置中禁用 `render.mode: materialize`（避免自动写回笔记）。
  - 性能护栏：例如限制一次 Query/View 扫描的文件数、或限制渲染输出的最大结果数，避免大库卡顿/生成过长输出。
- 上述设置仅应影响 Query/View（`blp-view`）相关行为；系统行生成/重复 `^id` 修复等增强 list 行为不依赖 Dataview。

## What Changes
- Enhanced List Blocks：
  - 新增设置：是否隐藏系统行（默认隐藏；关闭后可显示系统行用于调试）。
  - 删除语义（Live Preview）：当用户删除一个 list item 时，插件会清理该 list item 的系统行，避免孤儿系统行与错误的子项归属。
  - 新增设置：是否在删除父 list item 时一并删除子列表（Logseq/Roam 风格；默认关闭）。
- `blp-view`（Query/View，依赖 Dataview）：
  - 新增设置：是否允许 `render.mode: materialize` 写回（默认允许）。
  - 新增设置：单次执行最多扫描文件数（`0` 表示不限制；默认 `0`）。
  - 新增设置：最大输出结果数（`0` 表示不限制；默认 `0`；超过时截断并提示）。
  - 新增设置：是否显示诊断信息（默认关闭）。
- 设置页展示规则：
  - Enhanced List Blocks 的系统行设置始终可见（与 Dataview 无关）。
  - `blp-view` 相关设置仅在 Dataview 可用时显示；Dataview 不可用时仅展示状态提示，不展示 `blp-view` 设置项。

## Impact
- 默认行为保持不变（默认仍隐藏系统行；`blp-view` 默认不限制扫描/结果；materialize 默认可用）。
- 用户可通过设置获得更好的可控性与排障手段。
- 对于启用 Enhanced List Blocks 的文件：默认仅清理系统行，避免“隐藏垃圾行”；用户可选择开启“删父即删子树”的 Roam/Logseq 风格，获得更强的一致性（代价是更具破坏性的删除操作）。
