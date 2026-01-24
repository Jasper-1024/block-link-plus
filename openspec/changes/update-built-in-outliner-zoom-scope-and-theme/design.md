# Design: Scope + Theme for Vendored Outliner/Zoom

## Scope model
- We treat "Enhanced List Blocks enabled files" as the single source of truth for where outliner-like list UX is enabled.
- We mark eligible CM editors with a CSS class (e.g. `blp-enhanced-list-scope`) via a small CodeMirror extension that gates on:
  - Enhanced List file scope (`isEnhancedListEnabledFile`)
  - Live Preview (`editorLivePreviewField`)
  - A new setting that enables scoping for built-in outliner/zoom

## Styling scope
- Vendored CSS currently keys off global `body` classes (e.g. `outliner-plugin-better-lists`, `zoom-plugin-bls-zoom`).
- We keep the upstream body classes for minimal divergence, but require the per-editor scope class in selectors so non-enabled files are unaffected.

## Behavior scope
- Some vendored behaviors intercept DOM events globally (notably Outliner drag-and-drop via `document.addEventListener(..., capture: true)`).
- We must check the editor/file scope *before* calling `preventDefault()` / `stopPropagation()` to avoid breaking normal interactions outside the scope.
- For CodeMirror `domEventHandlers` (Zoom click-on-bullet), we gate inside the handler by checking the per-editor scope class.

## Theme support
- Upstream Outliner only enables list visuals on the default Obsidian theme. We remove this gating and rely on Obsidian CSS variables so community themes still render the visuals.

