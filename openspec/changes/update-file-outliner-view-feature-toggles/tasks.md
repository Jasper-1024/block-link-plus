## 1. Settings + i18n
- [x] 1.1 Add new plugin settings keys + defaults for Outliner v2 feature toggles (drag/drop, zoom, active highlight)
- [x] 1.2 Add localized setting strings (en/zh/zh-TW)
- [x] 1.3 Expose the new toggles in the Outliner settings tab

## 2. View Gating
- [x] 2.1 Gate drag-and-drop handlers behind the new toggle
- [x] 2.2 Gate zoom navigation behind the new toggle (including zoom header visibility)
- [x] 2.3 Gate active-block emphasis line/highlight behind the new toggle (CSS + root class)
- [x] 2.4 Ensure toggles apply to already-open Outliner View leaves after settings changes

## 3. Validation
- [x] 3.1 Add/extend Jest tests to cover new defaults + i18n presence
- [x] 3.2 Run `npm test` and `npm run build-with-types`
- [x] 3.3 Run `openspec validate update-file-outliner-view-feature-toggles --strict`
