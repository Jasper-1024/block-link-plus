# Proposal: Add Enhanced List Blocks Ops (Zoom/Outliner UI)

## Summary
This change adds an opt-in "Enhanced List Blocks Ops" module that makes working with list-item subtrees feel closer to Roam/Logseq *within explicitly enabled files only* (folder/file scope or frontmatter `blp_enhanced_list: true`).

Key outcomes:
- Zoom in/out to the current list subtree (hide everything else) in Live Preview.
- Basic subtree operations: move up/down, indent/outdent (toggle).
- Drag-and-drop reordering for list subtrees (current file only).
- UI enhancements: vertical indentation lines + bullet threading (highlight active block path), all toggleable.
- Compatibility guardrails: users MUST NOT enable conflicting third-party plugins (`obsidian-zoom`, `obsidian-outliner`) at the same time as BLP's corresponding modules; BLP should detect and refuse with a clear message.

## Why
- Obsidian's native list editing is not optimized for outliner workflows.
- The Enhanced List Blocks model (list item subtree + native `^id`) becomes much more valuable when users can quickly zoom and restructure blocks without breaking the subtree contract.

## Goals
- Only operate within enabled files; default is off.
- Keep operations safe and predictable:
  - preserve list subtree structure
  - preserve enhanced block system lines (and contract invariants)
  - no cross-file moves
- Provide modular toggles so users can enable only what they want.
- Avoid conflicts with popular list/zoom plugins by explicit detection and refusal.

## Non-Goals
- Cross-file moving/splitting/merging of blocks.
- Full keyboard behavior overrides (Tab/Enter/Backspace/etc) beyond the explicitly requested features.
- Guarantee identical visuals across all themes; visual features may be best-effort and toggleable.

## Validation Plan
- Unit tests for:
  - list subtree range detection
  - move/indent/outdent operations preserving subtree boundaries
  - zoom range calculation for list items
  - gating: only enabled files affected
  - conflict detection logic for `obsidian-zoom` / `obsidian-outliner`

