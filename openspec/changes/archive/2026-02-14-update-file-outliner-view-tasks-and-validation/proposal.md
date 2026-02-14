# Proposal: update-file-outliner-view-tasks-and-validation

## Why
The v2 File Outliner View is meant to be a Logseq-like editor while still producing Obsidian-native Markdown.
Two pain points have emerged:

1) Users want to author Obsidian-native tasks so Dataview/Tasks can query them (`- [ ] ...`, `- [x] ...`).
2) Block-internal Markdown (headings/lists inside a single block body) can appear to render as “real structure” in the Outliner UI even though the outliner protocol treats structure as *only* the outer list-tree. This mismatch creates confusion and increases the risk of accidentally corrupting the canonical file format.

## What Changes
- Define a task marker contract for Outliner v2 blocks:
  - Block text MAY start with `[ ] ` or `[x] ` as a block-level task marker.
  - On disk, the outliner MUST serialize that as Obsidian-native task items (`- [ ] ...`, `- [x] ...`).
- Add render-time validation for block-internal Markdown constructs (lists/headings outside fences):
  - show an inline warning banner (Logseq-like)
  - render a sanitized version that cannot form nested structure (structure remains the outliner tree only)
- Keep the canonical tail-line protocol compatible with Obsidian block indexing:
  - the system tail line MUST be the last continuation line of the block content (immediately before children)

## Non-Goals
- No interactive checkbox UI or task-state toggling (tasks remain editable as text).
- No support for block-internal Markdown lists/headings as real structure.
- No routing/scope setting changes.

## Impact
- Affected capability: `file-outliner-view`.
- Affected code: `src/features/file-outliner-view/protocol.ts`, `src/features/file-outliner-view/view.ts`, `src/css/custom-styles.css`, `src/shared/i18n.ts`.
- Backwards compatible: existing files normalize into the same canonical list-tree protocol; warnings only appear when unsupported constructs are present.

