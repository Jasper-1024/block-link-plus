# Proposal: Add Enhanced List Block Selection Mode

## Why
- The biggest remaining gap vs Logseq/Roam is not “more commands”, but a **unified block selection model**: click a block handle to select blocks, shift-click to select a contiguous range, and operate on blocks as units.
- A block selection model is a prerequisite for:
  - subtree clipboard (copy/cut/paste as a tree),
  - block reference insertion (search + insert `[[file#^id]]`),
  - block-level backlinks + peek context.

## What Changes
- Add an optional **Block Selection Mode** for Enhanced List Blocks (enabled files only; Live Preview only):
  - Clicking the unordered list handle selects a block (list item as a block unit).
  - Shift-click selects a contiguous range of blocks (block-granular multi-select).
  - Visual highlight shows selected blocks (block highlight, not text selection).
  - Escape clears the selection and returns to normal text editing.
- Integrate with the existing “handle click action” setting by adding a new option: `select-block`.

## Non-Goals
- Subtree clipboard (copy/cut/paste) support (planned as the next change).
- Block reference insertion UI (planned as the next changes).
- Block backlinks / peek context UI (planned as the next changes).
- Ordered list handle support (may be added later; start with unordered list handles only).

## Impact
- Affects only Live Preview and only Enhanced List Blocks enabled files.
- Does not modify note content and does not persist data.
- Must not interfere with vslinko outliner drag-and-drop (dragging must not accidentally select blocks).
- Implementation ownership: when a behavior is clearly “outliner list editing semantics”, we may implement it in the vendored vslinko outliner layer (built-in) and keep BLP as the scoped integration layer.

## Prior Art / References
- `vslinko/obsidian-outliner`: list/tree operations and “select all content” behavior override.
- `blorbb/obsidian-blockier`: “Select block” range calculation that avoids block prefixes (bullets/checkboxes/headings).

## Validation Plan
- Unit tests:
  - scope gating (only enabled files; Live Preview only),
  - selection state mapping across edits,
  - shift-click range selection semantics,
  - “drag does not select” suppression.
- Manual smoke (Obsidian desktop):
  - Click handle selects a block and highlights it.
  - Shift-click selects a block range.
  - Drag-and-drop via handle does not create a selection.
  - Non-enabled file / Source mode: no block selection behavior.
