# Design: Enhanced List Block Handle Affordances

## Approach
- Implement the handle as **CSS on existing CodeMirror list marker tokens** (e.g. `.cm-formatting-list-ul`), not as a new DOM widget, to:
  - preserve existing drag-and-drop hit targets from the vendored outliner
  - avoid layout reflows and complex DOM injection
- Gate styles by adding a **scoped class** to the CodeMirror editor root (`.cm-editor`) for:
  - Enhanced List Blocks enabled files only
  - Live Preview only
  - user setting toggle

## Scope gating
- Use Obsidian CM6 fields:
  - `editorInfoField` to read the current `file`
  - `editorLivePreviewField` to confirm Live Preview
- Use existing Enhanced List Blocks scope logic (`isEnhancedListEnabledFile()`).

## Styling rules
- Only apply to unordered list markers (`.cm-formatting-list-ul`) so ordered lists keep their numbering.
- Use Obsidian CSS variables (`--text-muted`, `--text-normal`, `--background-modifier-hover`, `--interactive-accent-hsl`) for theme friendliness.

