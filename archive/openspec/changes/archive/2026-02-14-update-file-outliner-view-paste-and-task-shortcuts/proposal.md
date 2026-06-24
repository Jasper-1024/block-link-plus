# Proposal: update-file-outliner-view-paste-and-task-shortcuts

## Why
The v2 File Outliner View aims to feel Logseq-like while keeping an Obsidian-native Markdown file format.
Two usability gaps remain:

1) Paste semantics: users expect `Mod+Shift+V` to paste as a single block (multiline preserved), even when normal paste is configured to split into blocks.
2) Task authoring: users need a quick way to create/toggle Obsidian-native tasks (`- [ ]`, `- [x]`) without introducing Logseq-specific keywords.

## What Changes
- Paste:
  - `Mod+V` continues to follow the existing “Paste multiline” setting (`split` vs `multiline`).
  - `Mod+Shift+V` MUST bypass the split behavior and paste as multiline text within the current block.
- Task shortcut:
  - `Mod+Enter` toggles a block-level task marker on the first line:
    - no marker -> `[ ] `
    - `[ ] ` -> `[x] `
    - `[x] ` / `[X] ` -> `[ ] `

## Non-Goals
- No interactive checkbox UI or task-state rendering.
- No block-internal list/heading structural rendering (still validated/sanitized elsewhere).

## Impact
- Affected capability: `file-outliner-view`.
- Affected code: `src/features/file-outliner-view/view.ts` (+ small pure helpers + tests), CDP regression snippet.

