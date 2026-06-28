## Status

- Verdict: accepted

## Plane Reply

Accepted for Human Review. The patch implements the accepted `OutlinerSuggestEditor.transaction()` coordinate-space fix without broadening scope, adds focused behavior tests, and includes post-build CDP proof that selecting the `2026-6-27` wiki-link suggestion leaves the caret after `[[2026-6-27]]` and closes the suggestion popup. If the human accepts the merge risk, move BLP-9 to `Ready to Merge`.

## Review Summary

- Reviewed source issue, tracker feedback, current issue context, stage contract, prior investigation/RCA/fix-design/fix-design-review/implementation artifacts, current git status, source/test diff, and implementation runtime traces.
- Current tracked source diff is limited to `src/features/file-outliner-view/editor-suggest-bridge.ts` and `src/features/file-outliner-view/__tests__/editor-suggest-bridge.test.ts`; the run archive is untracked as expected.
- Production change keeps Obsidian transaction change positions mapped against the pre-change CM6 document, normalizes them once with `this.cm.state.changes(changes)`, derives the post-change document from that same change set, maps `tx.selection` against the post-change document, and dispatches the normalized change set.
- No product source, tests, package metadata, CDP snippets, or formal workflow/spec files were edited during code review.

## Findings

No blocking findings.

The implementation matches the accepted owner layer and does not add a manual suggestion close, global trigger suppression, native Obsidian editor behavior change, transaction filter, history hook, or broader File Outliner refactor.

## Design Compliance

- `src/features/file-outliner-view/editor-suggest-bridge.ts:357` computes the normalized CM6 change set inside the existing best-effort transaction path and uses it for both post-change selection mapping and dispatch.
- `src/features/file-outliner-view/editor-suggest-bridge.ts:359` derives `selectionDoc` by applying the normalized change set to the original document, which is the accepted design and handles the multiline/multichange slice without one-line wiki-link arithmetic.
- `src/features/file-outliner-view/editor-suggest-bridge.ts:362` maps Obsidian's requested `tx.selection` through `posToOffset(selectionDoc, ...)`, avoiding the old clamp against the two-character `[[` document.
- `replaceSelection()`, `replaceRange()`, `tx.selections` multi-selection support, suggest trigger timing, and slash-command behavior remain outside the source patch, matching the accepted design boundary.

## Test And Validation Review

- Reviewed implementation proof `docs/harness/runs/PLANE-BLP-9/trace/implementation/wiki-link-suggest-selection-proof-final.json`.
  It records `ok: true`, final document `[[2026-6-27]]`, selection anchor/head `13`, empty `afterCursor`, `currentOpen: false`, and zero visible suggestion containers after 600 ms.
- Reviewed adjacent smoke result `docs/harness/runs/PLANE-BLP-9/trace/implementation/file-outliner-editor-suggest-smoke-final.json`, which records `{ "ok": true }` after the disposable runtime's slash-command prerequisite was enabled.
- Reviewed runtime state evidence showing isolated vault `blp`, plugin `block-link-plus` version `2.0.16`, plugin loaded, fixed CDP port `19225`, and Obsidian title evidence for 1.12.4 in the implementation diagnostics.
- Reviewer-ran `corepack pnpm test -- src/features/file-outliner-view/__tests__/editor-suggest-bridge.test.ts --runInBand`: passed 5 tests.
- Reviewer-ran `corepack pnpm run build-with-types`: passed `tsc -noEmit -skipLibCheck` and production esbuild.
- Reviewer-ran `corepack pnpm test`: passed 42 suites and 229 tests. Jest printed the existing post-run warning that a worker process was force exited after all suites passed.

## TDD Review

Use this checklist:

- Each implemented behavior maps to an accepted design or routing slice.
- RED evidence fails for the expected behavior reason before the GREEN patch.
- GREEN evidence shows the smallest source change needed for the slice.
- REFACTOR evidence, when present, happens after GREEN and reruns validation.
- Tests prove public behavior or justify the alternate seam.
- Runtime-gated slices repeat the accepted runtime proof package.

Review result:

- TDD-1 maps to the accepted wiki-link autocomplete transaction slice. Implementation records the expected RED failure, final doc correct but anchor `2` instead of `13`, then GREEN/refactor passing the focused adapter test.
- TDD-2 maps to the accepted multiline/multichange slice. Implementation records the expected RED failure, anchor `5` instead of `18`, then GREEN/refactor passing the same focused test command.
- TDD-3 maps to the accepted runtime proof package. The post-fix CDP trace exercises the real File Outliner suggestion commit after rebuild/reload and proves the corrected caret state closes the popup without a manual close patch.
- The unit tests use a real CM6 `EditorView` and the public `OutlinerSuggestEditor.transaction()` adapter seam, which is appropriate for this bug. The runtime proof covers the Obsidian/UI behavior that unit tests cannot prove.

## Required Revisions

None.

## Risks / Open Questions

- Keyboard Enter selection of a highlighted wiki-link suggestion was not separately exercised in CDP. This is non-blocking for this review because the accepted runtime proof package required the focused suggestion commit path, and the fixed adapter transaction coordinate mapping is directly covered by unit tests plus the click-based CDP transaction trace.
- The adapter still intentionally ignores Obsidian `tx.selections`; that remains outside this bug and should not block merge unless new evidence shows the same repro depends on multi-selection transaction support.
- The full Jest warning about force-exiting a worker after passing all tests remains existing test-suite hygiene risk, not a regression introduced by this patch.

## Decision

Accepted. The implementation is ready for Human Review within the accepted BLP-9 scope. It fixes the reproduced File Outliner wiki-link autocomplete caret mapping, preserves the narrow adapter boundary, includes behavior-oriented TDD evidence, and repeats the required post-fix Obsidian/CDP proof after a build and plugin reload.
