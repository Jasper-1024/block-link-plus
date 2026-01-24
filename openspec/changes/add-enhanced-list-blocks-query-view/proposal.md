# Proposal: Add Enhanced List Blocks Query/View

## Summary
This change adds a new capability: treat Obsidian list items as addressable "blocks" (via native `^id`) with a required system datetime field (`date`), and provide a `blp-view` YAML-driven Query/View layer backed by Dataview.

Key outcomes:
- A minimal YAML schema (`source/filters/group/sort/render/columns`) that is easy to copy/paste.
- `expr:` escape hatch for advanced column logic (evaluated by Dataview, not a new DSL).
- Optional managed materialization mode (dynamic region) that is fully plugin-owned and always overwritten.
- On-save detection+repair for duplicate `^id` inside the same file (duplicates get a new `^id` and `date` is rewritten to the repair time).

## Why
- Obsidian lacks block-first query/view primitives; Dataview has strong indexing, but raw Dataview usage is too high-friction for the "block = list item" workflow we want.
- BLP already has stable block reference and inline editing primitives; this change leverages them to create a Roam/Logseq-like block query/view experience in Obsidian.

## Goals
- Provide a `blp-view` code block that renders:
  - embed lists (`![[path#^blockId]]`) by default
  - tables with configurable columns
  - optional managed materialization region (no user edits preserved)
- Make `date` mandatory for Query/View candidates (missing `date` or `blockId` => skip).
- Make ID conflicts safe: on save, repair duplicate `^id` within a file deterministically.
- Keep the user-facing surface area small and stable; avoid re-implementing Dataview query language.

## Non-Goals
- Block Ops (zoom/backlinks/move/reindent/cross-file moves).
- A full custom DQL/DSL; only structured YAML + `expr` escape hatch.
- Migrating existing `blp-timeline` to this engine in this change (can be a later refactor).

## User-Facing Design (high level)
- Code block name: `blp-view`
- YAML schema: `source/filters/group/sort/render/columns`
- Defaults:
  - `source` omitted => global scope
  - `render.type` omitted => `embed-list`
  - `render.type: table` with no `columns` => default columns `File` and `Date`

## Impact
- Adds a new rendering primitive to notes (`blp-view`).
- Adds a save-time safety mechanism which may rewrite note content to repair duplicate IDs (with no-op optimization to avoid unnecessary writes).

## Validation Plan
- Unit tests for:
  - YAML parsing + defaults
  - duplicate `^id` repair (keep first occurrence; rewrite others; rewrite `date`)
  - Query/View filtering and grouping (at least one representative scenario per filter family)
  - materialize region overwrite + hash/no-op behavior
