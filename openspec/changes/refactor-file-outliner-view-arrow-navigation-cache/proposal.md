# Proposal: refactor-file-outliner-view-arrow-navigation-cache

## Why
Cross-block `ArrowUp`/`ArrowDown` currently rebuilds the visible block order (DFS) and finds neighbors with a linear search on each boundary crossing. Large outlines can make caret navigation jittery.

## What Changes
- Cache a computed visible navigation index per `FileOutlinerView` instance:
  - `order: string[]` (visible DFS order for the current zoom scope)
  - `indexById: Map<string, number>` (O(1) neighbor lookup)
- Invalidate the cache only on scope/structure mutations:
  - file model load/clear (`setViewData`, `applyEngineResult`, `clear`)
  - collapse toggles (`setCollapsed`)
  - zoom scope changes (`zoomInto`, `zoomOut`, zoom stack pruning)

## Non-Goals
- No user-visible behavior changes to arrow navigation semantics.
- No incremental cache maintenance; rebuild on invalidation only.

## Impact
- Touches: `src/features/file-outliner-view/view.ts`, `src/features/file-outliner-view/arrow-navigation.ts`
- Updates unit tests for the helper and neighbor lookup.

