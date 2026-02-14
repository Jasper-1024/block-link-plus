# Design: refactor-file-outliner-view-arrow-navigation-cache

## Goal
Remove O(N) work from each cross-block `ArrowUp`/`ArrowDown` boundary navigation by caching the computed visible order and an index map for neighbor lookup.

## Approach
- `computeVisibleBlockNav(...)` builds:
  - `order`: visible DFS order (respects `collapsedIds`)
  - `indexById`: a `Map` from id -> index in `order`
- `FileOutlinerView` holds `visibleNavCache: VisibleBlockNav | null`.
- The cache is computed lazily the first time arrow navigation needs it.
- Cache invalidation is explicit and tied to structural/scope mutations.

## Cache Invalidation
- **Model changes:** `clear`, `setViewData`, `applyEngineResult`
- **Collapse changes:** `setCollapsed`
- **Zoom scope changes:** `zoomInto`, `zoomOut`, `pruneZoomStack`

## Tradeoffs
- Cache rebuild is still O(N), but amortized across many arrow key presses.
- Avoids incremental updates to keep correctness simple.

