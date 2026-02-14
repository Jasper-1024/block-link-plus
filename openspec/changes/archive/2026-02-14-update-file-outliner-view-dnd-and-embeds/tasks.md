## 1. Spec & Guardrails
- [x] 1.1 Add spec deltas for `file-outliner-view` and `inline-editing-embeds`
- [x] 1.2 Run `openspec validate update-file-outliner-view-dnd-and-embeds --strict` and fix all issues

## 2. File Outliner View Drag-and-Drop
- [x] 2.1 Add a pure engine operation to move a block subtree (before/after/inside)
- [x] 2.2 Add Jest coverage for move operation (reorder, inside, invalid descendant move)
- [x] 2.3 Wire pointer-based drag-and-drop from the bullet handle in the Outliner View
- [x] 2.4 Add a minimal drop indicator + suppress click-to-zoom immediately after drag
- [x] 2.5 Add CDP snippet to validate DnD in a running Obsidian (9222)

## 3. Embed Hygiene (Routing + System Tail Lines)
- [x] 3.1 Mark InlineEditEngine embed leaves as detached and skip Outliner View routing for detached leaves
- [x] 3.2 Hide Outliner v2 system tail lines in inline-edit embeds (CM6 selective editor)
- [x] 3.3 Hide Outliner v2 system tail lines in MarkdownRenderer output inside Outliner View block display
- [x] 3.4 Ensure clicking embeds inside Outliner View does not enter host edit mode
- [x] 3.5 Add Jest coverage for CM6 system-line hiding
- [x] 3.6 Add CDP snippets to validate routing + system-line hiding (9222)

## 4. Validation
- [x] 4.1 `npm test`
- [x] 4.2 `npm run build-with-types`
- [x] 4.3 Run CDP snippets:
  - `scripts/cdp-snippets/file-outliner-drag-drop.js`
  - `scripts/cdp-snippets/file-outliner-inline-embed-routing.js`
  - `scripts/cdp-snippets/file-outliner-inline-embed-hide-system-lines.js`

