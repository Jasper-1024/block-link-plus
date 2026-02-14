# Design: Enhanced List Block Selection Mode

## Goals
- Provide Roam/Logseq-like “block selection” within Enhanced List scope:
  - handle click selects blocks as units (not text),
  - shift-click selects a contiguous range of blocks.
- Keep the model **ephemeral** (in-memory only), with no persistence or file writes.
- Avoid leaking hidden system lines into the user's clipboard by not relying on text selection as the primary representation.

## Ownership: Prefer the Built-in Outliner Layer for Outliner Semantics

Many “block mode” behaviors (selection/movement/indent/clipboard as a tree) are fundamentally outliner list editing semantics.

Guideline:
- Prefer implementing core outliner semantics in the vendored vslinko outliner layer when it is the correct owner.
- Keep BLP-specific code focused on: Enhanced List scope gating, system line invariants, and integrating UX entry points (handles/menus) with those semantics.

For this change, the block selection model may be implemented either:
- as a BLP-scoped CM6 extension (fastest to iterate, but risks duplicating list range logic), or
- by extending the vendored outliner operations/root model and wiring it via BLP scope + handle entry points (preferred if the outliner already owns range semantics we need).

## Key Decision: Block Selection is NOT Text Selection

CodeMirror text selections are a poor fit because Enhanced List Blocks uses hidden system lines (`[date:: ...] ^id`):
- If we select text ranges, CodeMirror clipboard serialization will include hidden system line text, which is surprising and harmful.
- Roam/Logseq block selection is a separate UI mode (block containers highlighted), not a text highlight.

Therefore:
- Represent “selected blocks” as a separate selection state (set of block anchors).
- Render selection via decorations (block highlight).
- Clipboard integration is explicitly deferred to the next change (subtree clipboard), which will consume the block selection state.

## Data Model

### Selection Anchor
Use doc positions as the primary anchor:
- Store the **start position** of each selected list item start line (or a stable position inside it).
- Map positions across edits via `tr.changes.mapPos(...)`.

Optional enhancement:
- If a stable block id `^id` is available, it can be stored for debugging/diagnostics, but must not be required.

### Block Range Resolution
Given a block anchor position:
- Resolve the owning list item start line.
- Compute the block subtree end (including children) using Markdown list indentation semantics:
  - indentation parsing MUST treat `\t` as 4-column stops (Markdown semantics).
  - fenced code blocks MUST not terminate the list item early.

This can reuse/extract logic from:
- `src/features/enhanced-list-blocks/normalize-on-save.ts` (list tree + fence handling),
- or vendored vslinko outliner list model if it provides stable range APIs.

## Interactions

### Handle Click Integration
Reuse existing handle click pipeline:
- Extend `enhancedListHandleClickAction` with a `select-block` option.
- When `select-block` is active, handle click updates block selection state instead of folding/menu.

### Multi-Select Semantics
- Plain click: select exactly one block (clear previous selection).
- Shift-click: select a contiguous range from the current “anchor block” to the clicked block.
- Escape: clear selection.

Future (optional):
- Ctrl/Cmd-click: toggle a single block into the selection set (non-contiguous multi-select).

### Drag-and-Drop Safety
Must not select blocks as a side effect of dragging:
- Reuse the existing DnD suppression logic (`body.outliner-plugin-dragging` + cooldown).

## Rendering

Render block selection highlight via CodeMirror decorations:
- Highlight the start line (and optionally the entire subtree lines).
- Ensure decorations are stable across updates and efficient (avoid full-doc rescans):
  - only compute ranges for selected blocks,
  - and/or for visible ranges.

## Compatibility / Risks
- Theme CSS differences: highlight should be subtle and avoid hard-coded pixel offsets.
- Interactions with external outliner plugins: selection should only exist inside Enhanced List scope.
- Performance: avoid O(N) rescans on every selection change for large notes.
