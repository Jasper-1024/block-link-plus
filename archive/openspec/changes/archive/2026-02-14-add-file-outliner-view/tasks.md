## 1. Spec & Guardrails
- [x] 1.1 Add spec deltas for `file-outliner-view`
- [x] 1.2 Run `openspec validate add-file-outliner-view --strict` and fix all issues
- [x] 1.3 Confirm proposal approval before implementation

## 2. Protocol (Canonical Markdown)
- [x] 2.1 Remove task-checkbox parsing/serialization from the outliner protocol
- [x] 2.2 Define/validate system tail line invariants (including nested/incorrectly-indented system lines)
- [x] 2.3 Add protocol unit tests (roundtrip + normalization)

## 3. Editing Engine (Functional Core)
- [x] 3.1 Introduce a pure block tree ops engine (split/insert/indent/outdent/mergePrev/mergeNext)
- [x] 3.2 Add engine unit tests for key behaviors and selection plans

## 4. View Layer (Stable + Logseq-like)
- [x] 4.1 Refactor DOM structure to Logseq-like class hierarchy for CSS threading
- [x] 4.2 Switch to a single editor instance (move between blocks) for stable focus/IME/undo
- [x] 4.3 Implement keymap: Enter / Shift+Enter / Tab / Shift+Tab / Backspace / Delete
- [x] 4.4 Add nesting guides + active path highlight (scoped CSS, theme-aware variables)

## 5. Settings & Scope
- [x] 5.1 Add Outliner settings (backspace-with-children behavior; default merge)
- [x] 5.2 Keep "Basics" tab unchanged; add new settings only under "Outliner" tab

## 6. Validation
- [x] 6.1 `npm test`
- [x] 6.2 `npm run build-with-types`
- [x] 6.3 Manual smoke test via 9222: open scoped file, edit blocks, verify save/links
