# Proposal: Add Enhanced List Block Handle Affordances

## Why
- Enhanced list + built-in outliner already supports folding/dragging, but the interaction target is visually subtle (mainly the list marker). This makes the feature hard to discover and hard to hit precisely.
- Logseq-style outliner UX relies on a visible “block handle” affordance to communicate “this is a draggable/clickable block”.

## What Changes
- Add a new Enhanced List Blocks setting: show a list-item “block handle” affordance (visual only; Live Preview only; enabled files only).
- In Live Preview, style unordered list markers as a small “grip” handle with a larger hitbox and hover/active emphasis, improving discoverability.
- Implement as a scoped CodeMirror editor class + CSS (no note content changes; no new actions/menu in this change).

## Non-Goals
- Adding handle menus / block actions (planned as a follow-up change).
- Changing vendored outliner/zoom behavior or scoping them by file.
- Perfect theme parity for every community theme (styles use Obsidian CSS variables and are scoped, but themes vary).

## Impact
- Affects only Live Preview and only Enhanced List Blocks enabled files.
- No file writes; purely UI/interaction affordance changes.
- Works best when built-in Outliner drag-and-drop is enabled (cursor + DnD behavior already implemented by vendored outliner).

## Validation Plan
- `npm.cmd test -- --runInBand`
- Manual smoke in Obsidian (desktop):
  - In an enabled file, list markers render as handles and are easier to click/drag.
  - In a non-enabled file, no visual change.
  - Ordered lists remain unchanged.

