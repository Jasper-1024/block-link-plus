## Status

- State: Implementation
- Verdict: ready-for-review

## Plane Reply

Implemented the accepted File Outliner adapter fix. `OutlinerSuggestEditor.transaction()` now keeps change offsets in the pre-change CM6 document, normalizes those changes with CM6, maps Obsidian's requested transaction selection against the resulting post-change document, and dispatches that same normalized change set. Added focused adapter regressions for the wiki-link commit and a multiline/multichange transaction. Targeted tests, full Jest, type/build, workflow check, focused CDP proof, and adjacent editor-suggest smoke all pass. Code review should attack the transaction mapping and the runtime proof trace.

## Scope

- In scope: BLP File Outliner custom CM6 editor facade for Obsidian `EditorSuggest` transactions, specifically `src/features/file-outliner-view/editor-suggest-bridge.ts`.
- Out of scope: native Obsidian Markdown editor autocomplete, manual popup closing, global suggest trigger suppression, `replaceRange()`, `replaceSelection()`, multi-selection support via `tx.selections`, package metadata, and reusable CDP snippet promotion.
- Accepted design source: `docs/harness/runs/PLANE-BLP-9/fix-design-review.md` has `Verdict: accepted`.

## Changes Made

- Updated `OutlinerSuggestEditor.transaction()` to build the existing CM6 change specs from the pre-change document, call `this.cm.state.changes(changes)` once, apply that normalized change set to derive the post-change document, and convert `tx.selection` against that post-change document.
- Dispatches the same normalized CM6 change set used to compute the post-change selection document.
- Preserved the existing best-effort `try/catch` boundary for invalid transaction specs.
- Did not add any explicit suggestion-list close behavior.

## Tests Added Or Updated

- Added a real `EditorView` test helper in `src/features/file-outliner-view/__tests__/editor-suggest-bridge.test.ts`.
- Added a wiki-link autocomplete transaction regression: old doc `[[`, transaction text `[[2026-6-27]]`, requested selection `line 0 ch 13`, expected CM6 selection offset `13`.
- Added a multiline/multichange regression: earlier line changes plus a later wiki-link replacement, expected selection offset `18` in the post-change document.

## TDD Slices

| Slice | Behavior | Public Seam | RED Command / Result | GREEN Change | GREEN Command / Result | REFACTOR Command / Result | Files Touched |
| --- | --- | --- | --- | --- | --- | --- | --- |
| TDD-1 | Wiki-link autocomplete transaction places caret after the completed link. | `OutlinerSuggestEditor.transaction()` with a real CM6 `EditorView` under Jest/jsdom. | `corepack pnpm test -- src/features/file-outliner-view/__tests__/editor-suggest-bridge.test.ts --runInBand` -> failed for expected reason: final doc was `[[2026-6-27]]`, but expected anchor `13` received `2`. | Normalized transaction changes with CM6, derived the post-change doc, and mapped `tx.selection` through that doc before dispatch. | Same command -> passed 4 tests. | Final helper cleanup, then same command -> passed 5 tests. | `src/features/file-outliner-view/editor-suggest-bridge.ts`; `src/features/file-outliner-view/__tests__/editor-suggest-bridge.test.ts` |
| TDD-2 | Selection mapping works when earlier transaction changes alter a different line before the selected line. | Same adapter test file with multiline/multichange transaction. | Same command against pre-fix mapping after adding the slice -> failed for expected reason: expected anchor `18` received `5` on the multiline case. | Same normalized CM6 change-set implementation from TDD-1; no extra production branch or one-line wiki-link arithmetic. | Same command -> passed 5 tests. | Final helper cleanup, then same command -> passed 5 tests. | `src/features/file-outliner-view/editor-suggest-bridge.ts`; `src/features/file-outliner-view/__tests__/editor-suggest-bridge.test.ts` |
| TDD-3 | Real File Outliner wiki-link suggestion commit closes the popup and leaves the caret after `]]`. | Fixed-port Obsidian/CDP runtime on port `19225`; focused temporary probe `.tmp/PLANE-BLP-9/wiki-link-suggest-selection-implementation.js`. | Accepted investigation RED proof: `docs/harness/runs/PLANE-BLP-9/trace/investigation/wiki-link-suggest-selection-probe.json` ended with final doc `[[2026-6-27]]`, selection anchor `2`, and `currentOpen: true`. | Rebuilt, reloaded plugin in the probe, clicked the `2026-6-27` link suggestion, and asserted final caret/popup state. | `node scripts/obsidian-cdp.js eval-file ".tmp/PLANE-BLP-9/wiki-link-suggest-selection-implementation.js"` -> passed; final trace has anchor/head `13`, empty `afterCursor`, `currentOpen: false`, and `visibleContainerCount: 0`. | Repeated after final `build-with-types`: same command -> passed; output saved as `docs/harness/runs/PLANE-BLP-9/trace/implementation/wiki-link-suggest-selection-proof-final.json`. | `.tmp/PLANE-BLP-9/wiki-link-suggest-selection-implementation.js`; `docs/harness/runs/PLANE-BLP-9/trace/implementation/wiki-link-suggest-selection-proof-final.json` |

## Validation

- `corepack pnpm test -- src/features/file-outliner-view/__tests__/editor-suggest-bridge.test.ts --runInBand`
  - RED TDD-1: failed with expected anchor `13`, received `2`.
  - RED TDD-2 against pre-fix mapping: failed with expected anchor `18`, received `5`.
  - GREEN/refactor final: passed 5 tests.
- `corepack pnpm test`
  - Passed: 42 suites, 229 tests.
  - Jest printed the existing post-run warning that a worker process was force exited after all suites passed.
- `corepack pnpm run build-with-types`
  - Passed: `tsc -noEmit -skipLibCheck` plus production esbuild; output included `Renaming main.css to styles.css`.
- `corepack pnpm run agent:workflow-check`
  - Passed: `agent workflow check passed`.
- Focused runtime proof:
  - Command: `$env:OB_CDP_PORT='19225'; $env:OB_CDP_TITLE_CONTAINS=' - blp - '; node scripts/obsidian-cdp.js eval-file ".tmp/PLANE-BLP-9/wiki-link-suggest-selection-implementation.js"`.
  - Final post-build output: `docs/harness/runs/PLANE-BLP-9/trace/implementation/wiki-link-suggest-selection-proof-final.json`.
  - Result: passed with final doc `[[2026-6-27]]`, selection anchor/head `13`, empty `afterCursor`, `currentOpen: false`, and zero suggestion containers.
- Adjacent editor-suggest smoke:
  - `node scripts/obsidian-cdp.js eval-file "scripts/cdp-snippets/file-outliner-editor-suggest.js"` initially failed twice because the isolated Obsidian profile had the core `slash-command` plugin disabled. Evidence: `file-outliner-editor-suggest-smoke.json`, `file-outliner-editor-suggest-smoke-rerun.json`, and `file-outliner-editor-suggest-diagnostic.json`.
  - Enabled `slash-command` in the disposable runtime with CDP, then reran the existing snippet.
  - Passed after the runtime prerequisite was enabled: `file-outliner-editor-suggest-smoke-after-slash-enable.json` and final `file-outliner-editor-suggest-smoke-final.json` both returned `{ "ok": true }`.

## Runtime Evidence

- Task key: BLP-9.
- Source issue: `docs/harness/runs/PLANE-BLP-9/context/source-issue.md`.
- Archive key: PLANE-BLP-9.
- Worktree path: `C:\Users\stati\Documents\Codex\2026-06-13\hermes\outputs\plane-symphony-like-demo\workspaces\PLANE-BLP-9`.
- Branch: `symphony/PLANE-BLP-9`.
- Runtime: fixed CDP port `19225`, isolated vault `blp`, plugin id/version `block-link-plus` / `2.0.16`.
- Obsidian version: 1.12.4 from the CDP target title, captured in `docs/harness/runs/PLANE-BLP-9/trace/implementation/file-outliner-editor-suggest-diagnostic.json` and `runtime-state-after-smoke.json`.
- Build/reload: `corepack pnpm run build-with-types` passed; the focused probe disables and re-enables `block-link-plus` before exercising the UI.
- Probe command: `node scripts/obsidian-cdp.js eval-file ".tmp/PLANE-BLP-9/wiki-link-suggest-selection-implementation.js"`.
- Resolution proof: `docs/harness/runs/PLANE-BLP-9/trace/implementation/wiki-link-suggest-selection-proof-final.json`.
- Important runtime output:
  - `transaction:before` captured Obsidian's autocomplete transaction replacing `line 0 ch 0..2` with `[[2026-6-27]]` and requesting selection `line 0 ch 13`.
  - `transaction:after` captured document `[[2026-6-27]]` and selection anchor/head `13`.
  - After 600 ms, `finalSuggests.currentOpen` was `false`, `containerCount` was `0`, and `visibleContainerCount` was `0`.
- Visual evidence: no new screenshot was needed for the implementation proof because no popup remained visible; the JSON trace records zero suggestion containers after the wait. The pre-fix visual screenshot remains `docs/harness/runs/PLANE-BLP-9/trace/investigation/wiki-link-suggest-selection-open.png`.
- Remaining unproved: keyboard Enter selection of a highlighted item was not separately exercised; native Obsidian Markdown editor autocomplete remains out of scope.

## Files Changed

- `src/features/file-outliner-view/editor-suggest-bridge.ts`
- `src/features/file-outliner-view/__tests__/editor-suggest-bridge.test.ts`
- `docs/harness/runs/PLANE-BLP-9/implementation.md`
- Runtime trace outputs under `docs/harness/runs/PLANE-BLP-9/trace/implementation/`
- Temporary probes under `.tmp/PLANE-BLP-9/` were used but not promoted to reusable source snippets.

## Risks / Open Questions

- The adapter still intentionally ignores Obsidian `tx.selections`; that remains outside this bug because the accepted runtime trace uses `tx.selection`.
- The adjacent slash smoke depends on Obsidian's core `slash-command` plugin being enabled in the isolated runtime. The source patch did not touch slash trigger behavior; once that runtime prerequisite was enabled, the existing smoke passed.
- Code review should verify that using the normalized CM6 change set as both the selection-document source and dispatch change set preserves original-coordinate semantics for multi-change transactions.

## Decision

Ready for code review. The implementation matches the accepted design boundary, fixes the reproduced File Outliner wiki-link autocomplete caret mapping, and validates the runtime symptom after a real build and plugin reload.
