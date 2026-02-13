# Proposal: Refactor File Outliner v2 Save + Lazy Display Rendering

## Why
- `FileOutlinerView` currently calls `requestSave()` from many code paths (doc change, structural ops, edit exit, task toggles). This is correct but hard to audit and easy to regress.
- Initial render can eagerly call `MarkdownRenderer.render(...)` for many blocks, which scales poorly with file size and plugin post-processors.

## What Changes
- **Save (no behavior change):**
  - Introduce a single view-level entrypoint for “mark dirty + request save”.
  - Introduce an explicit “flush save now” wrapper for hard boundaries (e.g., open-as-markdown).
- **Render (behavior change, UI-only):**
  - Lazy-render block display surfaces only for visible blocks (plus a small prefetch buffer).
  - Non-rendered blocks show a plain-text placeholder until they become visible.
  - No virtual scrolling; DOM structure stays intact.

## Impact
- Lower risk of save regressions (centralized semantics).
- Faster initial open and scrolling on large outliner files by reducing `MarkdownRenderer` work.

## Testing / Validation
- Jest unit tests for save scheduler helpers and render scheduling behavior (queueing / dirty handling).
- 9222/CDP validation:
  - Instrument `MarkdownRenderer.render` call counts before/after scroll.
  - Verify visible-area blocks render; offscreen blocks remain placeholders until revealed.
  - Verify `Ctrl+S` (save command) flushes to disk immediately.

