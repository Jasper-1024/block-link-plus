# Design: Enhanced List Block Handle Actions

## Approach
- Implement handle actions as a **scoped CodeMirror ViewPlugin** using DOM event handlers:
  - `click` on `.cm-formatting-list-ul` to toggle folding
  - `contextmenu` on `.cm-formatting-list-ul` to show an Obsidian `Menu`
- Keep existing vendored outliner behavior intact:
  - Do not change drag-and-drop implementation
  - Avoid interfering with drag by detecting `dragstart` after `mousedown` on the handle and skipping click-to-fold when a drag happened

## Scope gating
- Gate behavior by:
  - Live Preview only (`editorLivePreviewField`)
  - Enhanced List Blocks enabled files only (`isEnhancedListEnabledFile()`)
  - User setting toggle (`enhancedListHandleActions`)

## Folding
- Use CM6 folding effects (via the vendored outliner editor wrapper) to fold/unfold at a specific line.
- Respect Obsidian "Fold indent" setting; if disabled, show a notice and do nothing.

## Block link/embed actions
- When copying a block link/embed, ensure the list item has a system line `^id`:
  - Move cursor to the clicked list item line
  - Use existing `ensureEnhancedListSystemLineForActiveListItem()` to insert/move a system line when needed
  - Copy `[[file#^id]]` (or embed variant) to clipboard via existing clipboard utilities

