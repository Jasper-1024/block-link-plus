## 1. Spec
- [x] 1.1 Add spec delta for `file-outliner-view` task UI + commands/menu
- [x] 1.2 `openspec validate add-file-outliner-view-task-ui --strict`

## 2. Implementation
- [x] 2.1 Add task marker helpers (parse/strip/toggle) with unit tests
- [x] 2.2 Render task checkbox UI in `FileOutlinerView` display (hide marker prefix in rendered text)
- [x] 2.3 Checkbox click toggles task status and persists to disk (no edit-mode entry)
- [x] 2.4 Add two Obsidian commands:
  - [x] 2.4.1 Toggle task status (`[ ]` ↔ `[x]`)
  - [x] 2.4.2 Toggle task marker (task ↔ normal)
- [x] 2.5 Add bullet menu actions for task ↔ normal conversion
- [x] 2.6 Add Outliner settings help text (i18n-supported) describing task behavior + commands

## 3. Verification
- [x] 3.1 Update/add CDP snippet(s) to verify checkbox render + toggle + persistence
- [x] 3.2 Run unit tests: `npm test`
- [x] 3.3 Run CDP regressions against 9222 (task UI + existing coverage)
