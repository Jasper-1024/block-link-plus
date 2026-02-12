# Proposal: update-file-outliner-view-display-interactions

## Why
In File Outliner View (v2), block display content is rendered via `MarkdownRenderer.render(...)`, but:
- Internal links (e.g. `[[note|alias]]`, `[[note#^id|alias]]`) render visually yet are not navigable.
- Range embeds (e.g. `![[note#^id-id]]`) can render multi-line content, but cannot be edited in-place even when inline edit is enabled.

These gaps break the “Logseq-like block workflow” in outliner files.

## What Changes
- Add a view-level click router for `.internal-link` anchors rendered inside outliner block displays to call `workspace.openLinkText(...)`.
- Add an outliner-specific inline-embed editor mount:
  - When inline edit is enabled, clicking an embed inside outliner block display mounts an inline editor (via `InlineEditEngine`) into that embed container.
  - This is opt-in to outliner view only and does not change MarkdownView behavior.

## Non-Goals
- No changes to outliner normalization, engine/protocol, or system line format.
- No attempt to reproduce full Obsidian “preview view” behavior; only link navigation and embed inline edit.

## Impact
- Touches: `src/features/file-outliner-view/view.ts`, `src/features/inline-edit-engine/InlineEditEngine.ts`
- Adds CDP (9222) regressions for link navigation and embed inline edit in outliner display.

