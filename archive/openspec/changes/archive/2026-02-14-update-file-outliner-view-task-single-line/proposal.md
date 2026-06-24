# Proposal: File Outliner View Task Blocks (Single-Line + Done Styling)

## Why
- Task blocks are currently editable as multi-line content via `Shift+Enter` and some paste paths, which breaks the intended “one task = one line” UX and makes task rendering inconsistent.
- Done tasks (`[x] ...`) should visually read as completed (strikethrough) in display mode, matching common Markdown task expectations.
- Creating a sequence of tasks is a primary workflow; pressing `Enter` after a task should continue with another task by default.

## What Changes
- Done task blocks render with a strikethrough style in display mode.
- Task blocks are treated as single-line blocks:
  - `Shift+Enter` MUST NOT create an in-block newline for task blocks.
  - Multi-line task content is normalized to preserve the invariant.
- When splitting a task block with `Enter`, the newly created sibling block becomes a task block (prefilled with `[ ] `) and focus lands after the marker.

## Non-Goals
- No change to on-disk representation: tasks remain Obsidian-native Markdown (`- [ ] ...` / `- [x] ...`).
- No advanced task states (e.g. `[-]`, `[>]`, etc.) or task metadata beyond the existing marker prefix.

## Validation Plan
- `npx openspec validate update-file-outliner-view-task-single-line --strict`
- `npm test`
- `npm run build`
- Manual / 9222:
  - Done tasks show strikethrough in display mode.
  - Task blocks cannot become multi-line via `Shift+Enter` or paste.
  - `Enter` on a task continues with a new `[ ] ` task block.

