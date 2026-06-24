## 1. Specs
- [x] 1.1 Add spec deltas for: `file-outliner-view`
- [x] 1.2 Run `openspec validate update-file-outliner-view-paste-and-task-shortcuts --strict --no-interactive`

## 2. Paste Semantics
- [x] 2.1 Detect `Mod+Shift+V` and bypass split-paste behavior for the next paste event
- [x] 2.2 Add Jest tests for shortcut detection + paste decision logic

## 3. Task Shortcut
- [x] 3.1 Implement `Mod+Enter` to toggle `[ ]` / `[x]` task marker on the block first line
- [x] 3.2 Add Jest tests for task-marker toggling logic

## 4. Validation
- [x] 4.1 Add a CDP snippet to validate paste branching + task toggle in Obsidian (9222)
- [x] 4.2 Run `npm test`, `npm run build-with-types`, and the CDP snippet
