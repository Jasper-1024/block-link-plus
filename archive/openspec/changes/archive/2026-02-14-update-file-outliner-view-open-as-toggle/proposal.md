# Proposal: update-file-outliner-view-open-as-toggle

## Why
The file-level Outliner View (v2) takes over scoped Markdown files. When users hit rendering/editing edge cases, they need an in-context way to temporarily switch to the canonical Markdown source.
After switching, returning to the Outliner should be equally discoverable and one-click (matching the common “open as …” toggle pattern used by file takeover plugins such as Excalidraw).

## What Changes
- In the Outliner View pane menu (“more options”), keep providing “Open as Markdown (source)”.
- In the native Markdown pane menu, when the current file is in File Outliner scope, add “Open as Outliner” (and a new-tab variant) to switch the leaf back to the File Outliner View for the same file.
- Best-effort save before switching view types.

## Impact
- Affected capability: `file-outliner-view`.
- Affected code: `src/features/file-outliner-view/*`, `src/shared/i18n.ts`.
- No on-disk format changes.

