## 1. Spec & Guardrails
- [x] 1.1 Add spec delta for `file-outliner-view` (Markdown pane “Open as Outliner” toggle)
- [x] 1.2 Run `openspec validate update-file-outliner-view-open-as-toggle --strict` and fix all issues
- [x] 1.3 Confirm proposal approval before implementation

## 2. Implementation
- [x] 2.1 Add MarkdownView pane-menu items for scoped files: “Open as Outliner” + “new tab”
- [x] 2.2 Best-effort save before switching from Markdown -> Outliner
- [x] 2.3 Localize pane-menu labels (en/zh/zh-TW)

## 3. Validation
- [x] 3.1 Add/adjust unit tests for menu toggle behavior
- [x] 3.2 `npm test`
- [x] 3.3 `npm run build-with-types`
- [x] 3.4 Manual verification via 9222 (Markdown -> Outliner toggle works for a scoped file)
