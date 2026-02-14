## 1. Spec & Guardrails
- [x] 1.1 Add spec delta for `file-outliner-view` (open source view action)
- [x] 1.2 Run `openspec validate update-file-outliner-view-source-view-menu --strict` and fix all issues
- [x] 1.3 Confirm proposal approval before implementation

## 2. Implementation
- [x] 2.1 Add Outliner View pane-menu item: open current file in native Markdown source view (bypass routing)
- [x] 2.2 Ensure edits are committed + saved before switching view

## 3. Validation
- [x] 3.1 `npm test`
- [x] 3.2 `npm run build-with-types`
- [x] 3.3 Manual verification via 9222 (menu item switches leaf view type to `markdown` with `mode: source`)
