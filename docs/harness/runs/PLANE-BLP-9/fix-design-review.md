## Status

- Verdict: accepted

## Plane Reply

Accepted. Implement the narrow `OutlinerSuggestEditor.transaction()` fix: keep transaction change positions in the pre-change CM document, normalize those same changes with CM6, derive the post-change document from them, and map `tx.selection` against that post-change document before dispatch. Do not add a manual popup-close patch, suppress File Outliner suggest triggers globally, or change native Obsidian editor behavior. The next stage should execute the two focused unit TDD slices and the post-fix Obsidian/CDP runtime proof.

## Accepted Design Points

- The fix-design artifact is reviewable: `docs/harness/runs/PLANE-BLP-9/fix-design.md` has `Verdict: ready-for-review`.
- The design follows the accepted RCA in `docs/harness/runs/PLANE-BLP-9/rca-review.md`: Obsidian supplied a completed wiki-link transaction with requested selection after `[[2026-6-27]]`, but BLP converted that selection against the old `[[` document and dispatched offset `2`.
- The proposed owner and scope are correct. The source path is `src/features/file-outliner-view/editor-suggest-bridge.ts`, specifically `OutlinerSuggestEditor.transaction()`.
- The design correctly leaves `replaceSelection()` and `replaceRange()` alone. Current source already places the caret after inserted text in those methods, while the accepted runtime trace isolates the failure to `transaction()`.
- The design rejects symptom masking. Manually closing the suggestion list or suppressing `maybeTriggerEditorSuggest()` would not fix the caret being inside the completed wiki link.
- The CodeMirror framework claim is valid. Local `@codemirror/state` types document `TransactionSpec.selection` offsets as referring to the document after the transaction, and `EditorState.changes(spec)` is available to create the normalized change set used to derive that post-change document.
- The design does not rely on CodeMirror `transactionFilter`, `transactionExtender`, state fields, effects, or decoration recomputation. That is appropriate because this bug is in the custom Obsidian `Editor.transaction()` facade before CM6 dispatch.
- The design intentionally does not add Obsidian `tx.selections` multi-selection support. That is acceptable for this bug because the accepted trace involves `tx.selection`; if implementation evidence proves `tx.selections` is required for the same repro, stop as a design mismatch.

## Challenges

- Source review confirms the failure mode: `src/features/file-outliner-view/editor-suggest-bridge.ts:340` captures the old doc, `:351` maps changes through that doc, `:357` maps `tx.selection` through that same old doc, and `:365` dispatches the resulting CM6 transaction.
- `posToOffset()` clamps columns to the line length at `src/features/file-outliner-view/editor-suggest-bridge.ts:21`, so `ch: 13` against the old two-character `[[` line becomes offset `2`.
- The retrigger explanation remains coherent: `src/features/file-outliner-view/editor-state.ts:122` calls `onMaybeTriggerSuggest()` after doc changes, and `src/features/file-outliner-view/view.ts:1029` triggers Obsidian editor suggest while the custom editor has focus.
- Undo/history transactions can bypass this adapter, but that is not a blocker for the accepted bug. The proposed fix is not a CM transaction interception layer; it only corrects Obsidian editor-suggest commits that enter through `Editor.transaction()`. If implementation introduces a CM transaction filter, history hook, or global dispatch interceptor, that would exceed this design and needs new review.
- `filter: false` transactions do not undermine the design because the design does not depend on `transactionFilter`. If implementation reaches for filters/extenders, it should be treated as a design mismatch.
- The multi-line and multi-change case is the sharp edge. The implementation must compute the post-change document from the exact normalized CM changes it dispatches, not from hand-written line math or a second, potentially divergent change spec.

## Required Revisions

None before implementation.

Implementation must preserve these review constraints:

- Use CM6 change normalization for the post-change document and dispatch the same normalized change set or an exactly equivalent spec.
- Keep invalid transaction handling best-effort under the existing guarded dispatch behavior; do not introduce a partial update path.
- Keep `replaceSelection()`, `replaceRange()`, trigger timing, slash suggest behavior, package metadata, and workflow/spec files outside the source patch unless the accepted TDD evidence exposes a direct mismatch.
- If post-fix runtime proof shows the caret is correct but the suggestion container still remains open, return to investigation instead of adding an unconditional popup close.

## Implementation Readiness

Ready for implementation.

Smallest accepted source scope:

- `src/features/file-outliner-view/editor-suggest-bridge.ts`: update only `OutlinerSuggestEditor.transaction()` and any tiny local helper needed to keep selection mapping readable.
- `src/features/file-outliner-view/__tests__/editor-suggest-bridge.test.ts`: add focused regression tests for post-change transaction selection mapping.
- Optional CDP probe promotion only if the implementation agent decides the temporary investigation probe should become reusable; otherwise keep implementation probe code under `.tmp/PLANE-BLP-9/` and durable evidence under `docs/harness/runs/PLANE-BLP-9/trace/implementation/`.

No human behavior gate is needed. The design restores the expected behavior already stated by the source issue: selecting a wiki-link completion inserts the completed link, places the caret immediately after `]]`, and closes the suggestion list through the corrected caret state.

## TDD Slice Review

- TDD-1 is a valid targeted regression. It should fail before the source patch with final selection offset `2` instead of `13`, then pass when `tx.selection` is converted against the post-change document.
- TDD-2 is necessary and well scoped. It forces the implementation away from one-line wiki-link arithmetic and proves that earlier changes plus a later-line selection are handled through CM6's normalized changes.
- TDD-3 is mandatory, not optional. Unit tests alone cannot validate this runtime/UI caret-state bug; implementation must rebuild or reload the plugin and repeat the Obsidian/CDP wiki-link suggest commit proof on fixed port `19225`.
- The public seams are acceptable: a real CM6 `EditorView` under jsdom for adapter behavior, and the fixed-port Obsidian/CDP runtime for actual File Outliner editor-suggest behavior.
- The existing targeted test command is executable in this repo. This review ran `corepack pnpm test -- src/features/file-outliner-view/__tests__/editor-suggest-bridge.test.ts --runInBand`; the current three adapter tests passed. That is only seam verification, not bug validation.
- No ordinary text undo regression is required for this accepted design because the fix does not intercept CM history transactions. If the implementation changes history, undo, transaction filters, extenders, or shared editor dispatch behavior, it must add corresponding undo coverage or stop with a design mismatch.

## Validation Coverage

Implementation must record Red/Green/Refactor evidence for:

- `corepack pnpm test -- src/features/file-outliner-view/__tests__/editor-suggest-bridge.test.ts --runInBand`
- `corepack pnpm test`
- `corepack pnpm run build-with-types`
- `corepack pnpm run agent:workflow-check`

Implementation must also repeat the runtime proof package after a real source patch and rebuild/reload:

- Fixed CDP port `19225` following `docs/harness/guides/cdp-runtime.md`.
- File Outliner edit mode, insert `[[`, select the `2026-6-27` wiki-link suggestion, then wait at least 600 ms.
- Expected final state: document text `[[2026-6-27]]`, selection anchor/head `13`, empty after-cursor text, `currentOpen` false, and zero visible `.suggestion-container` elements.
- Store JSON trace and any screenshot needed under `docs/harness/runs/PLANE-BLP-9/trace/implementation/`.
- Run or preserve the broad `scripts/cdp-snippets/file-outliner-editor-suggest.js` smoke path to confirm adjacent link and slash suggestions still open in File Outliner edit mode.

## Risks / Open Questions

- The combined transaction case matters. `tx.replaceSelection` and `tx.changes` should contribute to the same normalized CM change set before deriving the selection document.
- Multi-change specs must remain in original document coordinates. The post-change document calculation and dispatch must not accidentally treat later changes as sequential unless CM6 is explicitly told to do so.
- The existing adapter ignores `tx.selections`. That remains out of scope for this bug, but implementation should not accidentally make single-selection behavior incompatible with future multi-selection support.
- If corrected selection mapping does not close the suggestion list in runtime validation, the accepted RCA is incomplete and the next step is renewed investigation, not a broader fix in this implementation.

## Decision

Accepted. The design is specific, bounded, and executable: it targets the accepted owner layer, matches CM6 transaction semantics, avoids masking the symptom, includes a focused Red/Green TDD plan, and requires the correct post-fix Obsidian/CDP proof for a runtime-gated caret and suggestion-list bug.

Proceed to implementation on the parent item with the smallest scope above.
