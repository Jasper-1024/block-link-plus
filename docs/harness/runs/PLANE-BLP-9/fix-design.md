## Status

- State: Fix Design
- Verdict: ready-for-review

## Plane Reply

Recommend a narrow fix in `OutlinerSuggestEditor.transaction()`: keep transaction change offsets in the pre-change document, but compute the post-change document from the same CM6 change spec and convert `tx.selection` against that post-change document before dispatch. Do not manually close the suggestion list or change native Obsidian editor behavior. Design review should attack the multi-line/multi-change mapping and the post-fix CDP proof that the caret lands after `[[2026-6-27]]` with no suggestion container open.

## RCA Inputs Used

- Source issue: `docs/harness/runs/PLANE-BLP-9/context/source-issue.md` contains the full bug claim and marks the task `cdp-required`.
- Tracker feedback: `docs/harness/runs/PLANE-BLP-9/context/tracker-feedback.md` has no human comments, links, or referenced pages to reconcile.
- Accepted investigation: `docs/harness/runs/PLANE-BLP-9/investigation.md` reproduced the bug in the File Outliner editor bridge and captured a runtime proof package.
- Accepted RCA review: `docs/harness/runs/PLANE-BLP-9/rca-review.md` has `Verdict: accepted` and routes the parent item to fix design with no split or child item.
- Runtime evidence used: `docs/harness/runs/PLANE-BLP-9/trace/investigation/wiki-link-suggest-selection-probe.json`, `docs/harness/runs/PLANE-BLP-9/trace/investigation/wiki-link-suggest-selection-control-patch.json`, and `docs/harness/runs/PLANE-BLP-9/trace/investigation/wiki-link-suggest-selection-open.png`.
- Source inspected for this design: `src/features/file-outliner-view/editor-suggest-bridge.ts`, `src/features/file-outliner-view/editor-state.ts`, `src/features/file-outliner-view/view.ts`, `src/features/file-outliner-view/__tests__/editor-suggest-bridge.test.ts`, `scripts/cdp-snippets/file-outliner-editor-suggest.js`, local `@codemirror/state` types, and Obsidian `EditorTransaction` types.

## Problem Boundary

- In scope: BLP File Outliner custom CM6 editor facade used by Obsidian `EditorSuggest` for wiki-link autocomplete commits.
- Out of scope: native Obsidian Markdown editor autocomplete, generic suggestion closing policy, slash command feature work, File Outliner trigger heuristics, and unrelated editor adapter methods.
- Accepted failure: Obsidian sends a transaction that replaces `[[` with `[[2026-6-27]]` and requests selection `{ line: 0, ch: 13 }`; BLP dispatches the replacement with CM selection offset `2`.
- Root cause boundary: `src/features/file-outliner-view/editor-suggest-bridge.ts:340` maps `tx.selection` through `posToOffset()` against the pre-change doc, so `ch: 13` is clamped to the old two-character `[[` line. `src/features/file-outliner-view/editor-state.ts:120` and `src/features/file-outliner-view/view.ts:1029` then retrigger editor suggest while the caret is still after the opening brackets.
- This is bug-fix work, not feature or refactor intake. The accepted RCA keeps it as one parent-item fix unit.

## Proposed Fix

Update `src/features/file-outliner-view/editor-suggest-bridge.ts` in `OutlinerSuggestEditor.transaction()` only.

The implementation should continue converting `tx.changes` from Obsidian `EditorPosition` values against the current pre-change CM document. After building that CM change spec, derive the post-change document with CodeMirror's own change machinery, for example `this.cm.state.changes(changes).apply(doc)`. Convert `tx.selection.from` and `tx.selection.to` against that post-change document, then dispatch the same normalized changes and post-change selection together.

This aligns with CM6 `TransactionSpec.selection`, whose offsets are defined against the document after the transaction. The runtime trace shows Obsidian's autocomplete transaction has the same semantic shape: the requested `ch: 13` is correct only in the completed `[[2026-6-27]]` document.

Keep `replaceSelection()` and `replaceRange()` unchanged unless a focused test proves they are on the same failing path. They already set the caret after inserted text and the accepted RCA isolates the failure to `transaction()`.

## Alternatives Considered

- Manually close the suggestion list after autocomplete commit. Rejected because it masks the visible popup while leaving the caret at offset `2`, which still violates the expected cursor position and can break follow-on typing.
- Suppress `maybeTriggerEditorSuggest()` after any document change. Rejected because the trigger path is legitimate for opening `[[` and `/` suggestions; the retrigger is caused by the wrong caret coordinate, not by the trigger existing.
- Special-case `[[...]]` autocomplete by setting the caret to replacement length. Rejected because it would be one-line and wiki-link-specific, while the adapter's contract is transaction-coordinate mapping for Obsidian editor operations.
- Map `tx.selection` through the change description as if it were a pre-change position. Rejected because the runtime trace and CM6 transaction contract both indicate selection is post-change; mapping it as pre-change risks double-shifting valid selections.

## Implementation Notes

- Use CodeMirror's normalized change set rather than hand-written line math. A safe shape is: build the existing `changes` array, compute `const cmChanges = changes.length ? this.cm.state.changes(changes) : undefined`, compute `const selectionDoc = cmChanges ? cmChanges.apply(doc) : doc`, then map `tx.selection` through `posToOffset(selectionDoc, ...)`.
- Dispatch the same normalized `cmChanges` used to compute `selectionDoc`, or otherwise ensure the dispatched change spec is exactly equivalent to the one used for post-doc calculation.
- Keep the current best-effort behavior: invalid CM change specs should not throw out of the adapter. Put post-doc calculation and dispatch under the existing guarded path or an equivalent guard.
- Do not broaden this fix to implement Obsidian `tx.selections` multi-selection support. The accepted failure path uses `tx.selection`; adding multi-selection behavior would be a separate adapter enhancement unless implementation evidence proves it is required for this bug.
- This File Outliner fix does not depend on CodeMirror `transactionFilter` or `transactionExtender`. It should directly adjust the custom Obsidian `Editor.transaction()` adapter before the CM6 dispatch.
- Existing tests in `src/features/file-outliner-view/__tests__/editor-suggest-bridge.test.ts` already construct a real `EditorView` under jsdom, which is the preferred unit seam for this adapter behavior.

## TDD Slice Plan

| Slice | Behavior | Public Seam | Expected RED Failure | Minimum GREEN Target | Refactor Allowance | Required Validation |
| --- | --- | --- | --- | --- | --- | --- |
| TDD-1 | Wiki-link autocomplete transaction places caret after the completed link. | `OutlinerSuggestEditor.transaction()` with a real CM6 `EditorView` in `src/features/file-outliner-view/__tests__/editor-suggest-bridge.test.ts`. | Starting doc `[[`; transaction replaces line 0 ch 0..2 with `[[2026-6-27]]` and requests selection line 0 ch 13; current code leaves `cm.state.selection.main.from` at `2` instead of `13`. | Convert `tx.selection` against the post-change doc so final doc is `[[2026-6-27]]` and final selection anchor/head are `13`. | Extract a tiny helper for transaction post-doc selection mapping only if it makes the test clearer; no broader adapter refactor. | `corepack pnpm test -- src/features/file-outliner-view/__tests__/editor-suggest-bridge.test.ts --runInBand` |
| TDD-2 | Transaction selection mapping works when earlier changes alter a different line before the selected line. | Same adapter test file with a multi-line, multi-change transaction. | Starting doc like `aa\n[[\nzz`; changes expand line 0 and replace line 1 `[[`; requested selection line 1 ch 13 is clamped to the old line 1 offset instead of landing after the completed link in the post-change doc. | Use CM6's normalized change set to compute the post-change document, so selection line/ch conversion handles line offsets after all changes. | Add small local test helpers for building/destroying `EditorView`; avoid production abstractions unless TDD-1 and TDD-2 duplicate nontrivial setup. | `corepack pnpm test -- src/features/file-outliner-view/__tests__/editor-suggest-bridge.test.ts --runInBand` |
| TDD-3 | Real File Outliner wiki-link suggestion commit closes the popup and leaves the caret after `]]`. | Obsidian/CDP runtime proof on fixed port `19225` using the investigation probe path or a promoted focused snippet. | Current runtime proof ends with `finalDoc: "[[2026-6-27]]"`, `finalSelection.anchor: 2`, and `finalSuggests.currentOpen: true`. | After rebuild/reload, selecting the `2026-6-27` suggestion ends with final selection anchor/head equal to `13`, `afterCursor: ""`, no visible `.suggestion-container`, and no open current suggest after the wait. | If the implementation promotes the temporary probe, keep it focused on commit behavior and update the script inventory; otherwise keep the probe under `.tmp/PLANE-BLP-9/` and store JSON/screenshot evidence under this run's trace directory. | `corepack pnpm run build-with-types`; fixed-port CDP list/start per `docs/harness/guides/cdp-runtime.md`; `node scripts/obsidian-cdp.js eval-file "<focused-probe>.js"`; screenshot only if the popup remains open. |

## Validation Plan

- Targeted unit tests: add the TDD-1 and TDD-2 tests to `src/features/file-outliner-view/__tests__/editor-suggest-bridge.test.ts` before changing production code and confirm they fail for the expected caret offset reason.
- Targeted test command: `corepack pnpm test -- src/features/file-outliner-view/__tests__/editor-suggest-bridge.test.ts --runInBand`.
- Broader validation after green: `corepack pnpm test`, `corepack pnpm run build-with-types`, and `corepack pnpm run agent:workflow-check`.
- Runtime proof package for implementation to repeat:
  - Task key/archive: BLP-9 / PLANE-BLP-9.
  - Runtime: fixed CDP port `19225`, isolated vault `blp`, plugin `block-link-plus`.
  - Build/reload: run `corepack pnpm run build-with-types`, then reload/enable the plugin in the CDP probe before trusting results.
  - Probe: open a File Outliner note, insert `[[`, choose the `2026-6-27` wiki-link suggestion, wait at least 600 ms, and record final document text, final selection, before/after-cursor text, suggest manager state, and visible `.suggestion-container` count.
  - Expected proof: final document `[[2026-6-27]]`, final selection anchor/head `13`, `afterCursor` empty, `currentOpen` false, and visible suggestion container count `0`.
  - Store implementation evidence under `docs/harness/runs/PLANE-BLP-9/trace/implementation/`.
- Adjacent runtime check: run or preserve the broad `scripts/cdp-snippets/file-outliner-editor-suggest.js` smoke path to confirm link and slash suggestions still open in File Outliner edit mode.

## Behavior Change Gate

No human behavior gate is required before implementation. The design restores the behavior already stated in the source issue and accepted RCA: choosing a wiki-link suggestion should complete the link, place the caret after the closing `]]`, and close the suggestion list. It does not introduce a new File Outliner feature, alter native Obsidian Markdown editor behavior, or change slash-command semantics.

If design review or implementation finds that the desired behavior requires suppressing suggestion triggers globally, changing editor-suggest timing policy, or adding new multi-selection transaction support, stop and route that broader decision through the documented review path instead of folding it into this bug fix.

## Risks / Open Questions

- Multi-change CM specs must be valid in original document coordinates; the implementation should let CM6 normalize the same spec it dispatches to avoid mismatched post-doc calculations.
- If post-fix runtime still shows an open suggestion container while the caret is correct, that would contradict the accepted "wrong caret causes retrigger" model and should return to investigation rather than adding a close-popup patch.
- The existing adapter ignores `tx.selections`; this design intentionally leaves that unchanged because the accepted proof involves only `tx.selection`.
- The implementation stage must not claim resolution from unit tests alone. The bug is runtime/UI and caret-state dependent, so CDP proof is required after a real source patch and rebuild.

## Decision

Ready for adversarial fix-design review. The recommended fix is bounded to `OutlinerSuggestEditor.transaction()` selection coordinate mapping, backed by the accepted CDP trace, aligned with CM6 transaction semantics, and covered by two focused unit slices plus a required post-fix Obsidian/CDP runtime proof.
