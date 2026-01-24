# Design: Enhanced List Blocks Ops (Zoom/Outliner UI)

## Scope rules (hard)
- All behaviors in this change only apply to **enabled files**:
  - enabled via plugin settings (folders/files), or
  - enabled via frontmatter `blp_enhanced_list: true`
- No cross-file operations.

## Compatibility
- BLP ops modules are opt-in and MUST be off by default.
- If `obsidian-zoom` is enabled, BLP MUST refuse enabling BLP zoom (clear message).
- If `obsidian-outliner` is enabled, BLP MUST refuse enabling BLP outliner-like modules (move/indent/dnd/vertical-lines/threading).

## CM6 integration strategy
- Use Obsidian's `editorInfoField` to access `file` and `editor` from an `EditorState`, so UI and ops can be scoped per-file.
- Zoom implementation can follow the proven pattern:
  - compute a `{from,to}` range for the current heading or list subtree
  - hide content outside the range using `Decoration.replace({ block: true })`
  - optional breadcrumbs panel for navigation

## Zoom range for list subtree
- For a list item line, treat the zoom target as:
  - the current list item line, plus
  - its children subtree (based on foldable/list indentation boundary).

## List subtree ops (move/indent/outdent)
- Operations MUST treat a list subtree as atomic:
  - move up/down reorders the subtree among siblings
  - indent/outdent moves the subtree into/out of adjacent siblings (toggleable)
- Enhanced block contract MUST be preserved:
  - system line remains the last content line of the list item
  - no empty lines introduced within enhanced list blocks

## Drag and Drop
- Dragging the bullet/handle moves the list subtree.
- Drops are allowed only inside the same file and only into list contexts.
- Drop positions MAY change hierarchy (indent/outdent by dropping as child/parent).
- Provide clear visual drop zones; behavior should be no-op if target is invalid.

## Vertical lines + bullet threading
- Vertical lines render indentation guides for list structure.
- Bullet threading highlights the active block path (current block + its ancestor chain).
- Visual features are best-effort across themes and MUST be toggleable.
