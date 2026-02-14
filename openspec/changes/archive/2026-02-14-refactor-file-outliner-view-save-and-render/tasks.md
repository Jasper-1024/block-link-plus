## 1. Save Refactor (No Behavior Change)
- [x] 1.1 Add a single `markDirtyAndRequestSave(...)` entrypoint in `FileOutlinerView`
- [x] 1.2 Replace direct `requestSave()` call sites with the entrypoint (keep semantics identical)
- [x] 1.3 Add a `flushSave(...)` wrapper and use it at hard boundaries (no behavior change)
- [x] 1.4 Validate save behavior remains unchanged (existing Jest suite + 9222 vault.modify instrumentation)

## 2. Lazy Display Rendering (Visible Area + Buffer)
- [x] 2.1 Add a display render scheduler (visibility map + dirty set + queued renders)
- [x] 2.2 Add viewport-based visibility refresh (initial render + scroll), with a buffer range
- [x] 2.3 Render a plain-text placeholder for non-rendered blocks
- [x] 2.4 Ensure structural edits and text edits mark blocks dirty without eager MarkdownRenderer calls
- [x] 2.5 Update prune logic to clean scheduler state for removed blocks
- [x] 2.6 Add/adjust unit tests for scheduler behavior (ordering, dirty+visibility transitions)

## 3. 9222 / CDP Validation
- [x] 3.1 Add a CDP snippet to count display renders and confirm lazy behavior
- [x] 3.2 Validate save: doc changes debounce; `Ctrl+S` flushes immediately; no double-save after flush

## 4. Validation + Cleanup
- [x] 4.1 `openspec validate refactor-file-outliner-view-save-and-render --strict`
- [x] 4.2 `npm test` and `npm run build`
- [x] 4.3 Commit changes (no push)
