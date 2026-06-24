## 1. Spec & Guardrails
- [x] 1.1 Add spec deltas for `file-outliner-view` (inline-edit renderer + editor surface)
- [x] 1.2 Run `openspec validate refactor-file-outliner-inline-edit --strict` and fix all issues
- [x] 1.3 Confirm proposal approval before implementation

## 2. Inline-Edit Renderer Integration
- [x] 2.1 Sanitize outliner block display rendering (wrap with `.markdown-rendered`, strip preview-only UI like `copy-code-button`)
- [x] 2.2 Implement a single CM6 `EditorView` editor instance that moves between blocks (no textarea)
- [x] 2.3 Wire Logseq key behaviors (Enter split, Shift+Enter newline, Tab/Shift+Tab indent/outdent, Backspace/Delete merge) via CM6 keymap
- [x] 2.4 Ensure system tail lines remain non-user-editable and normalization invariants still hold

## 3. Tests & CDP Validation
- [x] 3.1 Update Jest tests for any protocol/engine changes required by CM6 integration
- [x] 3.2 Update `scripts/cdp-snippets/file-outliner-smoke.js` for the new editor surface
- [x] 3.3 Add CDP screenshot capture helpers and a basic diff/check workflow (Obsidian 9222 vs Logseq 9221)

## 4. Manual Convergence Loop
- [x] 4.1 Iterate with 9222/9221 until the outliner block UX (visual + key behaviors) matches Logseq baseline for: bullets, threading lines, active path, code blocks
- [x] 4.2 Final code review + remove dead code paths
