
File Outliner block editing uses a single CodeMirror 6 `EditorView` that is re-parented into the active block.
When the user drag-selects with the mouse and the pointer leaves the active block, CM6 selection clamps to the
current block text length, so the selection cannot naturally span multiple blocks.

We want Logseq-like range selection: dragging within a block selects text; dragging across blocks selects whole
blocks as a contiguous range.

## What Changes

- Add a UI-only **block range selection** mode triggered by a left-button drag that crosses block boundaries
  while in edit mode.
- When triggered:
  - Exit edit mode for the anchor block (commit text if changed).
  - Compute the visible block order and mark the inclusive range `[anchor..focus]` as selected.
  - Apply a CSS highlight class to the selected blocks.
- Keep protocol/engine unchanged.

## Non-Goals

- No partial cross-block text selection.
- No multi-block structural ops (move/indent/delete) in this change; selection is a visual foundation.

## Impact

- Mouse range selection works as users expect in outliner-style editors.
- Keeps changes scoped to `FileOutlinerView` event delegation and CSS (minimal architecture impact).
