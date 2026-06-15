## Status

- Verdict: accepted

## Plane Reply

Accepted. The proposed design follows the accepted RCA: undo/redo history transactions use `filter: false`, so the line-range maintenance must move out of the regular `transactionFilter` path and into a `transactionExtender` that emits range effects. Implementation should stay scoped to `src/shared/utils/codemirror/selectiveEditor.ts` plus a bounded CM6 history regression, then run Jest, build-with-types, and the fixed-port Obsidian/CDP repro.

## Accepted Design Points

- The design preserves the child-issue boundary for `#33B`. It does not attempt to fix the rest of GitHub `#33` padding, lifecycle, context-menu, or Reading View symptoms.
- The ownership target matches the accepted RCA: `preventModifyTargetRanges` in `src/shared/utils/codemirror/selectiveEditor.ts:231-312` currently combines edit blocking with range maintenance, and history undo bypasses that regular filter.
- Moving only line-count range synchronization into `EditorState.transactionExtender` is the right CM6 hook. Current CodeMirror types state that `filter: false` disables change and transaction filters, while transaction extenders still run and may add effects/annotations.
- Using `setEditableRange` and `setContentRange` effects is compatible with the existing state fields in `selectiveEditor.ts:116-178`, which already prefer effects before annotations.
- Keeping outside-range edit rejection in `preventModifyTargetRanges` is necessary. A transaction extender cannot cancel or rewrite changes.
- Keeping `InlineEditEngine` out of the first implementation pass is justified. The prior evidence shows extension injection and initial range mounting already work; the stale state appears after history undo.

## Challenges

- I verified the central dependency against the installed CM6 package. A throwaway `node -e` probe created a `filter:false` transaction with both a transaction filter and transaction extender installed; the filter was bypassed, the extender still added an effect, and the field updated to the new line count: `{"field":2,"lines":2,"effects":1,"filterBypassed":true}`.
- The implementation must recompute range deltas from `tr.startState`, `tr.changes`, and `tr.newDoc.lines`. It must not depend on keydown handling, `Ctrl+Z`, Obsidian command routing, or regular `transactionFilter` execution.
- The existing before-range and inside-range math must be preserved. This bug is the inside-range shrink case, but the extracted helper must not break programmatic line changes before the selective range.
- Do not leave duplicate maintenance in both the filter and extender. Two active range-maintenance paths would be harder to reason about and could diverge under future CM6 updates.
- Catching unexpected extender errors and returning `null` is acceptable for preserving user document edits, but tests must prove the normal path actually emits the expected effects.

## Required Revisions

- None before implementation.
- Implementation requirements:
  - Extract the current line-count adjustment into a focused helper.
  - Add a `transactionExtender` that emits `setEditableRange` / `setContentRange` effects for line-count-changing transactions that touch the selective range.
  - Leave `preventModifyTargetRanges` responsible for blocking out-of-range `input`, `delete`, and `move` transactions.
  - Remove the old annotation-based range append from the filter path after the extender owns range synchronization.

## Implementation Readiness

- Ready for implementation.
- Smallest allowed source scope:
  - `src/shared/utils/codemirror/selectiveEditor.ts`
  - `src/shared/utils/codemirror/__tests__/selectiveEditor.systemLine.test.ts` or a new neighboring history-range test file
- No OpenSpec proposal is required while the patch restores the existing inline-edit embed rendering invariant. `openspec list --specs` shows the existing `inline-editing-embeds` capability, and this design does not add public syntax, settings, or architecture.

## Validation Coverage

- Required unit regression:
  - Create a CM6 state/view with `history()` and `editBlockExtensions()`.
  - Initialize `contentRange` and `editableRange` to `[5, 9]` with a following paragraph on line `10`.
  - Dispatch an inside-range Enter-like insertion and assert both fields become `[5, 10]`.
  - Run CodeMirror `undo(...)` and assert the document returns to the original line count and both fields return to `[5, 9]`.
  - Include redo coverage, or a sibling test, because redo uses the same `filter: false` history path.
- Control coverage:
  - Keep or add normal non-history inside-range insertion coverage so the already-working Enter growth path remains protected.
  - If the extracted helper changes before-range behavior, add a before-range line-shift assertion.
- Repo validation after implementation:
  - `corepack pnpm test`
  - `corepack pnpm run build-with-types`
- Runtime validation after implementation:
  - Use the fixed-port CDP contract from `docs/agent/cdp-validation.md` with `OB_CDP_PORT=19225` and `OB_CDP_TITLE_CONTAINS=' - blp - '`.
  - Reproduce the disposable-vault Enter/undo flow and verify:
    - before Enter: doc lines `14`, ranges `[5, 9]`, no leaked paragraph
    - after Enter: doc lines `15`, ranges `[5, 10]`, inserted child visible
    - after Ctrl+Z: doc lines `14`, ranges `[5, 9]`, no leaked paragraph
  - Re-run `scripts/cdp-snippets/debug-inline-edit-system-line.js`.
  - Re-run `scripts/cdp-snippets/inline-edit-embed-jump-affordance.js`.

## Risks / Open Questions

- Redo is not in the Plane title but shares the accepted CodeMirror history mechanism, so implementation validation must include it.
- `preventModifyTargetRanges` has historically handled both blocking and range maintenance. The implementation should be reviewed for accidental changes to edit rejection semantics.
- If implementation evidence shows `editBlockExtensions()` is not installed in a specific inline-edit editor, that would be a new finding; do not preemptively broaden this patch into `InlineEditEngine`.
- The other GitHub `#33` symptoms remain out of scope for this accepted design.

## Decision

- The fix design is accepted and exits the fix-design loop.
- Next stage: implement the selective-editor extender patch and bounded regression tests, then run the listed repo and Obsidian/CDP validations before human review.
