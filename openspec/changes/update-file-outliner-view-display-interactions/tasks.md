# Tasks: update-file-outliner-view-display-interactions

## 1. Implementation
- [x] 1.1 Add internal-link click routing in `FileOutlinerView` (single delegated handler).
- [x] 1.2 Add an outliner-scoped InlineEditEngine public API to mount embed editors outside Live Preview.
- [x] 1.3 Wire outliner embed click -> inline edit mount + focus (when inline edit enabled).
- [x] 1.4 Add CDP (9222) regressions:
  - outliner internal link navigation
  - outliner embed inline edit mount for `^id-id`
- [x] 1.5 Run `npm test`, `npm run build`, and `openspec validate ... --strict`.
