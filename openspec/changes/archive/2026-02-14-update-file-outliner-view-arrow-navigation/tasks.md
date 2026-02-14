## 1. Spec & Guardrails
- [x] 1.1 Add spec deltas for `file-outliner-view` (ArrowUp/Down cross-block caret navigation)
- [x] 1.2 Run `openspec validate update-file-outliner-view-arrow-navigation --strict` and fix all issues
- [x] 1.3 Confirm proposal approval before implementation (user request treated as approval)

## 2. Implementation (Editor navigation)
- [x] 2.1 Add pure helpers:
  - visible block order (respect zoom root + collapsedIds)
  - cursor landing pos (first/last line + goal column clamp)
- [x] 2.2 Add ArrowUp/ArrowDown keymap (plain keys only) in outliner editor
- [x] 2.3 Implement boundary detection via CM6 coords (dy threshold) and no-op at boundary to avoid horizontal drift
- [x] 2.4 Implement sticky goal column across cross-block jumps + reset rules (non-arrow key, pointer, selection changes)
- [x] 2.5 Ensure navigation respects zoom scope and collapsed nodes (skip hidden subtree)
- [x] 2.6 Add/extend CDP regression snippet(s) to assert real cross-block ArrowUp/Down behavior (9222)

## 3. Tests
- [x] 3.1 Jest tests for pure helpers (visible order + landing pos)
- [x] 3.2 `npm test`

## 4. Validation
- [x] 4.1 `npm run build-with-types`
- [x] 4.2 Run relevant CDP snippets (9222):
  - `scripts/cdp-snippets/file-outliner-arrow-nav-e2e.js`
  - `scripts/cdp-snippets/file-outliner-arrow-nav-scope.js`
