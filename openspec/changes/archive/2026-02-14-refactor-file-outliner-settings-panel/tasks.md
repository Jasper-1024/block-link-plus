## 1. Spec & Guardrails
- [x] 1.1 Add spec deltas for `settings-configuration` (outliner list editors + grouping)
- [x] 1.2 Run `openspec validate refactor-file-outliner-settings-panel --strict` and fix all issues
- [x] 1.3 Confirm proposal approval before implementation

## 2. Scope List Editors
- [x] 2.1 Implement a reusable list editor UI (add/remove/reorder) for string arrays
- [x] 2.2 Enabled folders: use list editor + folder path suggest
- [x] 2.3 Enabled files: use list editor + file path suggest

## 3. Allowlist List Editor
- [x] 3.1 Replace allowlist textarea with list editor
- [x] 3.2 Add plugin id suggest (installed plugin ids + `core`)

## 4. Grouping + i18n + Styling
- [x] 4.1 Re-group outliner settings into clearer headings
- [x] 4.2 Add i18n keys (en/zh/zh-TW) for new UI strings (add buttons + row tooltips)
- [x] 4.3 Add minimal CSS for the list-row layout in settings

## 5. Tests + Validation
- [x] 5.1 Add Jest coverage for list normalization / reorder helpers
- [x] 5.2 `npm test`
- [x] 5.3 `npm run build-with-types`
