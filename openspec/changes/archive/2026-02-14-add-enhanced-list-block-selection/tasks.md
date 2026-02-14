# Tasks: Add Enhanced List Block Selection Mode

## 1. OpenSpec
- [x] 1.1 Add spec deltas for: `enhanced-list-blocks`, `settings-configuration`
- [x] 1.2 Run `openspec validate add-enhanced-list-block-selection --strict --no-interactive`

## 2. Settings + i18n
- [x] 2.1 Add a new handle click action option: `select-block`
- [x] 2.2 Update settings UI labels and descriptions (en/zh/zh-TW)

## 3. Block Selection (scoped)
- [x] 3.1 Implement a block selection state (ephemeral; no persistence) and block highlight decorations
- [x] 3.2 Handle click / shift-click on unordered list handles to update selection state
- [x] 3.3 Handle Escape to clear selection
- [x] 3.4 Ensure drag-and-drop does not trigger selection (reuse existing DnD suppression)

## 4. Tests
- [x] 4.1 Unit tests for selection range resolution and shift-range selection
- [x] 4.2 Unit tests for doc-change mapping (selection anchors survive edits)

## 5. Docs
- [x] 5.1 Update Enhanced List docs: 鈥淏lock selection mode鈥?usage and limitations

## 6. Verification
- [x] 6.1 Run `npm test`
- [x] 6.2 Run `npm run build`
- [x] 6.3 Manual smoke in Obsidian (desktop, via CDP)

