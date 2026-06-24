
## Goal
Make Outliner block-range selection compatible with the existing bullet context menu:
right-click anywhere on a selected block should open the same menu as right-clicking the bullet.

## Approach
- Add a single capture-phase `contextmenu` handler on `.blp-file-outliner-root` (event delegation).
- Gate behavior:
  - Only when block-range selection is active.
  - Only when the event target is inside `.ls-block.is-blp-outliner-range-selected`.
  - Never intercept inside `.blp-file-outliner-editor` (CM6 host) or `.markdown-source-view` (inline embed editors).
  - Do not intercept `.bullet-container` itself to avoid double-open; keep the existing per-bullet handler.

## Rationale
- Matches existing Outliner design principles:
  - Prefer event delegation and explicit bridges over per-block observers.
  - Keep changes isolated to `FileOutlinerView` DOM.
- Avoids introducing a new menu surface or new multi-select protocol/engine concepts.
