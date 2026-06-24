## 1. Specs
- [x] 1.1 Add spec deltas for: `file-outliner-view`
- [x] 1.2 Run `openspec validate update-file-outliner-view-tasks-and-validation --strict --no-interactive`

## 2. Markdown Validation (Pure Core)
- [x] 2.1 Implement a fence-aware analyzer/sanitizer for block-internal lists/headings
- [x] 2.2 Add Jest tests for analyzer/sanitizer behavior

## 3. View Integration
- [x] 3.1 Integrate sanitizer into Outliner block display rendering (warning banner + sanitized render)
- [x] 3.2 Add scoped CSS + i18n strings for the warning banner

## 4. Protocol + Task Contract
- [x] 4.1 Extend protocol tests for task blocks and tail-line placement after continuation lines

## 5. Validation
- [x] 5.1 Add a CDP snippet to validate tasks + warning rendering in Obsidian (9222)
- [x] 5.2 Run `npm test`, `npm run build-with-types`, and the CDP snippet
