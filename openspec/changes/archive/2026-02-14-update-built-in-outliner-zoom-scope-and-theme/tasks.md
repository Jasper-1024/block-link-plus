# Tasks: Update Built-in Outliner/Zoom Scope and Theme Support

## 1. OpenSpec
- [x] 1.1 Add spec deltas for: `enhanced-list-blocks`, `settings-configuration`
- [x] 1.2 Run `openspec.cmd validate update-built-in-outliner-zoom-scope-and-theme --strict --no-interactive`

## 2. Settings + UI
- [x] 2.1 Add settings fields + defaults for scoping built-ins to Enhanced List Blocks
- [x] 2.2 Update Settings UI copy (scope + theme notes)

## 3. Scope plumbing (per-editor)
- [x] 3.1 Add a scoped editor class for Enhanced List enabled files (Live Preview only)
- [x] 3.2 Update vendored outliner/zoom CSS selectors to require the scoped class

## 4. Vendor behavior gating (no interference out of scope)
- [x] 4.1 Gate Outliner drag-and-drop interception to scoped editors (before preventDefault/stopPropagation)
- [x] 4.2 Gate Zoom click-on-bullet to scoped editors
- [x] 4.3 Gate Outliner vertical lines (DOM injection + click handling) to scoped editors

## 5. Theme support
- [x] 5.1 Remove default-theme-only gating in vendored Outliner list visuals (better lists, vertical lines)

## 6. Tests + verification
- [x] 6.1 Add unit tests for scope gating (enabled vs non-enabled files)
- [x] 6.2 Run `npm.cmd test -- --runInBand`
- [x] 6.3 Run `npm.cmd run build-with-types`
