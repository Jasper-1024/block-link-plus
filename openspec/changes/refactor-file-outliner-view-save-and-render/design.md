# Design Notes: Save Entry Point + Lazy Block Display Rendering

## Save

Goal: keep the same persistence semantics, but make them auditable.

Proposed shape:
- `markDirtyAndRequestSave({ dirtyIds?, reason? })`
  - optionally merges `dirtyIds` into `dirtyBlockIds`
  - calls `requestSave()` (Obsidian `TextFileView` debounce)
- `flushSave({ reason })`
  - `await this.save()` (used at hard boundaries like "open as markdown")

Notes:
- Do not introduce additional debouncing/throttling yet.
- Keep `getViewData()` as the only serialization point.

## Render

Goal: avoid eager `MarkdownRenderer.render(...)` for offscreen blocks.

Proposed shape:
- Keep DOM structure for all blocks (no virtual scroll).
- For each block, maintain:
  - `isVisible` (derived from viewport scan + buffer)
  - `isDirty` (model changed since last display render)
  - `hasRenderedMarkdown` (whether MarkdownRenderer ran at least once)
- When a block becomes visible:
  - if `hasRenderedMarkdown` is false, render
  - else if `isDirty`, re-render
- When a block is not visible:
  - show/update a plain-text placeholder (cheap) and defer MarkdownRenderer

Scheduling:
- Use a simple queue with a small per-tick budget (e.g. 8-16 renders), yielding via `setTimeout(0)`.
- Refresh visibility:
  - after the view (re)renders its DOM
  - on scroll (debounced)

