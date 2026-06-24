# Proposal: update-file-outliner-view-source-view-menu

## Why
The file-level Outliner View (v2) is still experimental and may hit rendering or editing edge cases.
Users need an easy, in-context escape hatch to open the underlying Markdown source so they can inspect the canonical on-disk representation and diagnose issues.

## What Changes
- Add a pane "more options" (top-right) menu item in the Outliner View to open the current file in the native Obsidian Markdown editor in **source** mode (bypassing outliner routing).

## Impact
- Affected capability: `file-outliner-view`.
- Affected code: `src/features/file-outliner-view/view.ts`.

