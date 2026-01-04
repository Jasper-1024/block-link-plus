# Proposal: Update Multiline Range Marker Insertion

## Summary
Adjust how BLP generates multiline range markers (`^id-id`) so they behave like normal block IDs whenever possible, while keeping range resolution stable:
- Default: append `^id-id` to the end of the end insertion line (inline), enabling text like `bbb ^id-id`.
- Fallback: when inline append is unsafe, insert a standalone `^id-id` marker line after the selection's containing Markdown block boundary (auto-expand).
- In standalone-marker mode, insert a blank line after the marker only when needed (e.g. the following line is plain text that would otherwise join the marker paragraph).
- Fail fast with a Notice and leave the document unchanged when the selection is invalid (e.g. crosses frontmatter / empty-file start) or when either insertion point already ends with a block ID (range markers do not reuse/copy existing IDs).
- The operation is atomic: on any failure, no partial markers remain.

## Why
- Users expect `^id-id` to be placeable like `^id` (e.g. `bbb ^id-id`) without being forced onto a new line.
- The current "marker must be its own line" rule is over-restrictive and complicates authoring.
- In standalone-marker mode, the marker must terminate a Markdown block to be parsed as a block ID; this requires conditional separation from following plain text.

## What Changes
- Multiline range creation chooses inline end-marker insertion by default, with a deterministic fallback strategy and "only when needed" blank-line insertion.
- Selection boundaries are treated as expandable to the containing Markdown block boundary for insertion purposes (e.g. list / blockquote), to avoid inserting a standalone marker inside structures that would prevent it from being recognized.
- Range creation fails (with a Notice) when it would need to reuse an existing block ID at either insertion point.

## Impact
- Affected spec: `multiline-block-references`
- Affected code (expected): `src/features/link-creation/index.ts`, `src/features/command-handler/index.ts`, `src/ui/EditorMenu.ts`, docs/i18n strings describing multiline blocks.
