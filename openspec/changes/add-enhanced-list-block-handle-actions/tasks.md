# Tasks: Add Enhanced List Block Handle Actions

## 1. OpenSpec
- [x] 1.1 Add spec deltas for: `enhanced-list-blocks`, `settings-configuration`
- [x] 1.2 Run `openspec.cmd validate add-enhanced-list-block-handle-actions --strict --no-interactive`

## 2. Settings + i18n
- [x] 2.1 Add settings field + default
- [x] 2.2 Update settings UI (Enhanced List Blocks section)
- [x] 2.3 Update i18n strings (en/zh/zh-TW)

## 3. Handle actions (scoped)
- [x] 3.1 Add CM extension to handle click/contextmenu on list handle (enabled files only; Live Preview only)
- [x] 3.2 Implement folding toggle and handle menu actions (copy link/embed; optional zoom)
- [x] 3.3 Ensure dragging the handle does not trigger click-to-fold

## 4. Tests
- [x] 4.1 Add unit tests for scope gating and action dispatch (using injected hooks for deterministic tests)

## 5. Docs
- [x] 5.1 Update docs: Enhanced List Blocks settings + usage pages

## 6. Verification
- [x] 6.1 Run `npm.cmd test -- --runInBand`
- [ ] 6.2 Manual smoke in Obsidian (desktop)
