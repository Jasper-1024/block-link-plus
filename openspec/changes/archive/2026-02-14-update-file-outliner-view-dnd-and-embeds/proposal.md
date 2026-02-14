# Proposal: update-file-outliner-view-dnd-and-embeds

## Why
The v2 file-level Outliner View is missing a core Logseq/Roam affordance: drag-and-drop block moves. Reordering and restructuring currently requires keyboard-only structural ops.

Additionally, the Outliner View routing can accidentally affect internal embed leaves created by InlineEditEngine. This breaks inline-edit embeds when routing is enabled and can leak Outliner v2 system tail lines into embed rendering.

## What Changes
- Add bullet-handle drag-and-drop in the Outliner View:
  - move a block subtree before/after another block (reorder)
  - move a block subtree inside another block (append as child) when dragging horizontally
  - show a minimal drop indicator and suppress click-to-zoom after a drag gesture
- Prevent Outliner View routing from affecting internal/detached WorkspaceLeaf instances used by InlineEditEngine embeds.
- Hide Outliner v2 system tail lines (`[blp_sys:: 1] ...`) in:
  - InlineEditEngine embeds (CodeMirror surface)
  - MarkdownRenderer renders inside the Outliner View (embeds inside block display)
- Clicking within embedded blocks inside the Outliner View does not enter host block edit mode.

## Non-Goals
- Cross-file drag-and-drop.
- Full Logseq-style multi-variant drop zone UI (only before/after/inside).
- Persisted fold/zoom/drag state.

## Impact
- Affected capabilities: `file-outliner-view`, `inline-editing-embeds`.
- Affected code: `src/features/file-outliner-view/*`, `src/features/inline-edit-engine/*`, `src/shared/utils/codemirror/*`, `src/ui/MarkdownPostOutliner.ts`, `src/css/custom-styles.css`.
- Adds CDP regression snippets for Obsidian (9222).

