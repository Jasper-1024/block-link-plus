# Proposal: update-file-outliner-view-logseq-affordances

## Why
The v2 file-level Outliner View has converged on a stable core (canonical file protocol + functional-core engine + CM6 editor surface), but it still lacks several Logseq-like affordances that make block editing discoverable and efficient:
- mouse-driven insertion of new blocks
- folding/collapsing subtrees
- zooming into a block subtree
- a block "bullet" context menu for copy/cut/delete and reference links

There is also a noticeable vertical spacing drift when a block contains callouts, caused by default callout margins that don't match other normalized Markdown elements in the outliner surface.

## What Changes
- Add a "new block here" insert affordance on hover to create a new sibling block with the mouse.
- Add a fold indicator for blocks with children; click toggles collapse/expand (ephemeral state).
- Add zoom navigation: clicking the bullet zooms into a block + its subtree, with a simple zoom-out control.
- Add a bullet context menu (right click) with a minimal set of Logseq-inspired actions:
  - Copy block reference / embed / URL
  - Copy / Cut / Delete
  - Collapse / Expand
- Normalize callout margins within the outliner block display to avoid extra vertical spacing.

## Non-Goals
- No persistence of fold/zoom state to disk.
- No task/checkbox structural semantics; task markers remain plain text.
- No subtree paste parser (copy/cut emits Markdown list text without BLP system tail lines, but pasting remains the existing v2 behavior).

## Impact
- Affected capability: `file-outliner-view`.
- Affected code: `src/features/file-outliner-view/*`, `src/css/custom-styles.css`, CDP snippets under `scripts/`.
- Requires new engine operations (insert-after, delete) and a clipboard serializer for subtree copy/cut that excludes protocol system tail lines.

