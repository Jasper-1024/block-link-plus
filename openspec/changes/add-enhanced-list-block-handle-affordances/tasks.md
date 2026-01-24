# Tasks: Add Enhanced List Block Handle Affordances

## 1. OpenSpec
- [x] 1.1 Add spec deltas for: `enhanced-list-blocks`, `settings-configuration`
- [x] 1.2 Run `openspec.cmd validate add-enhanced-list-block-handle-affordances --strict --no-interactive`

## 2. Settings + i18n
- [x] 2.1 Add settings field + default
- [x] 2.2 Update settings UI (Enhanced List Blocks section)
- [x] 2.3 Update i18n strings (en/zh/zh-TW)

## 3. Live Preview affordances (scoped)
- [x] 3.1 Add CM extension to toggle a scoped editor class for enabled files (Live Preview only)
- [x] 3.2 Add CSS for handle visuals + hover/active emphasis (unordered lists only)
- [x] 3.3 Ensure no note content changes; ensure non-enabled files are unaffected

## 4. Tests
- [x] 4.1 Add unit tests for scope gating (enabled file vs not, Live Preview vs not)

## 5. Docs
- [x] 5.1 Update docs: Enhanced List Blocks settings + usage pages

## 6. Verification
- [x] 6.1 Run `npm.cmd test -- --runInBand`
- [ ] 6.2 Manual smoke in Obsidian (desktop)
