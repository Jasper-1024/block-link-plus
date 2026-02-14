# Proposal: Add Enhanced List Block Handle Actions

## Why
- The handle affordance makes it easier to *see* where folding/dragging exists, but it still does not provide a clear, direct interaction surface.
- Logseq-style outliners use the block handle as the primary interaction point: click to fold/select, and a small action menu for block-level actions.

## What Changes
- Add a new Enhanced List Blocks setting: enable list-item handle actions (Live Preview only; enabled files only).
- In Live Preview, treat the unordered list handle as an interaction surface:
  - Left-click toggles folding for the list item (if fold indent is enabled).
  - Right-click opens a handle menu with common actions:
    - Toggle folding
    - Copy block link
    - Copy block embed
    - (Optional) Zoom in/out if ObsidianZoom API is available
- Actions are implemented via a scoped CodeMirror ViewPlugin (DOM event handlers) and Obsidian Menu; no global editor behavior changes.

## Non-Goals
- Full Logseq/Roam block menu parity.
- Replacing or rewriting vendored outliner drag-and-drop.
- Adding handle actions for ordered lists (may be added later).

## Impact
- Affects only Live Preview and only Enhanced List Blocks enabled files.
- Folding actions do not modify note content.
- Copy-link/embed actions MAY insert a missing system system-line `^id` for the target list item (only when needed to produce a stable block reference).

## Validation Plan
- `npm.cmd test -- --runInBand`
- Manual smoke in Obsidian (desktop):
  - Enabled file: clicking the handle toggles folding; right-click shows the handle menu.
  - Drag-and-drop on the handle still works and does not trigger folding.
  - Non-enabled file: no handle actions.
  - Source mode: no handle actions.

