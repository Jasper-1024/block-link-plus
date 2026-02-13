# Tasks: File Outliner View Task Blocks (Single-Line + Done Styling)

## 1. OpenSpec
- [x] 1.1 Add spec delta for: `file-outliner-view`
- [x] 1.2 Run `npx openspec validate update-file-outliner-view-task-single-line --strict`

## 2. Done task styling
- [x] 2.1 Add strikethrough style for done tasks (`[x]`) in Outliner display CSS
- [x] 2.2 Add/extend regression coverage (9222 snippet) for strikethrough

## 3. Enforce single-line task blocks
- [x] 3.1 Move `Shift+Enter` handling behind a host callback so task blocks can override behavior
- [x] 3.2 Prevent task blocks from becoming multi-line via paste (all paste paths)
- [x] 3.3 Normalize multi-line task content on load (preserve content while making the task line single-line)

## 4. Continue tasks on Enter
- [x] 4.1 `Enter` on a task block creates a new sibling task block (prefilled `[ ] `)
- [x] 4.2 Add unit tests for the new task behavior helpers
- [x] 4.3 Add/extend 9222 regression snippet(s) for task continuation + single-line invariant

## 5. Verification
- [x] 5.1 `npm test`
- [x] 5.2 `npm run build`
