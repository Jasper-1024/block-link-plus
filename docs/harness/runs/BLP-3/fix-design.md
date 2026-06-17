## Status

- State: Fix Design
- Verdict: ready-for-review
- Task: `BLP-3` / `[GitHub #33B] Inline Editing Enter+undo visible range overflow`
- Workspace: `C:\Users\stati\Documents\Codex\2026-06-13\hermes\outputs\plane-symphony-like-demo\workspaces\BLP-3`
- Code changes: none

## Plane Reply

Recommended implementation: split selective-editor range maintenance out of the current `transactionFilter` and run it through a CodeMirror `transactionExtender`, while keeping the existing filter only for blocking edits outside the visible/editable range. The design is intentionally scoped to `#33B`: it does not address GitHub `#33` padding, file reopen/lifecycle, context menu, or Reading View symptoms. The design reviewer should attack whether the extender path preserves the already-working normal input/delete/move cases and whether the regression covers both undo and the shared redo history mechanism.

## RCA Inputs Used

- `docs/agent/runs/BLP-3/context/source-issue.md`: child issue scope is Enter plus undo causing visible inline-edit embed range overflow.
- `docs/agent/runs/BLP-3/investigation.md`: live repro showed initial range `[5, 9]`, Enter growth to `[5, 10]`, and undo leaving stale range `[5, 10]` while source text returned to 14 lines.
- `docs/agent/runs/BLP-3/rca-review.md`: accepted RCA. The key accepted mechanism is that CodeMirror history undo dispatches with `filter: false`, so `preventModifyTargetRanges` as a regular `EditorState.transactionFilter` never emits the shrink update on undo.
- Current source inspection:
  - `src/shared/utils/codemirror/selectiveEditor.ts:42-49` defines annotation and effect carriers for editable/content ranges.
  - `src/shared/utils/codemirror/selectiveEditor.ts:116-178` range state fields already consume `setContentRange` / `setEditableRange` effects before annotations.
  - `src/shared/utils/codemirror/selectiveEditor.ts:231-304` currently combines edit blocking and line-range maintenance in `preventModifyTargetRanges`.
  - `src/shared/utils/codemirror/selectiveEditor.ts:351-357` wires `smartDelete`, `preventModifyTargetRanges`, `hideLine`, `selectiveLinesFacet`, and `frontmatterFacet`.
  - `src/features/inline-edit-engine/InlineEditEngine.ts:232-257` ensures detached inline-edit editors receive `editBlockExtensions()`.
  - `src/features/inline-edit-engine/InlineEditEngine.ts:1766-1775` initializes visible/editable ranges with `filter: false`; initial mount is not the failing path.
- CodeMirror framework evidence:
  - `node_modules/@codemirror/commands/dist/index.js:528-535` creates undo/redo history transactions with `filter: false`.
  - `node_modules/@codemirror/state/dist/index.d.ts:876-883` documents that `filter: false` disables change filters and transaction filters.
  - `node_modules/@codemirror/state/dist/index.d.ts:1332-1346` documents that `transactionExtender` can add effects/annotations and still runs when regular filtering is disabled.
  - `node_modules/@codemirror/state/dist/index.js:2389-2400` and `:2442-2450` show extenders run after the filter decision and merge effects/annotations into the transaction.
- Current runtime preflight for this design run:
  - `Test-Path .\node_modules` -> `True`
  - `node -e "require.resolve('ws'); console.log('ws-ok')"` -> `ws-ok`
  - `$env:OB_CDP_PORT='19225'; $env:OB_CDP_TITLE_CONTAINS=' - blp - '; node scripts/obsidian-cdp.js list` found `start - blp - Obsidian 1.12.4`
  - `app.vault.getName()` returned `"blp"`
  - `!!app.plugins?.plugins?.['block-link-plus']` returned `true`

## Problem Boundary

- In scope:
  - Live Preview inline-edit block embeds for `![[file#^blockId]]`.
  - Line-count-changing edits inside the current inline-edit visible/editable range.
  - History undo for the Enter insertion path where the source doc shrinks back but range fields remain too large.
- Out of scope:
  - Bottom padding after inline-edit embeds.
  - File reopen / lifecycle instability.
  - Right-click context menu persistence.
  - Reading View over-rendering.
  - General inline-edit engine refactors or syntax/settings changes.
- Root behavioral invariant for this child bug:
  - When a transaction changes line count inside the current visible/editable range, both the visible content range and editable range must grow or shrink by the same line delta, including history transactions whose specs set `filter: false`.

## Proposed Fix

Change only the selective-editor range maintenance layer first.

1. In `src/shared/utils/codemirror/selectiveEditor.ts`, extract the existing line-count range adjustment math from `preventModifyTargetRanges` into a small helper, for example `getLineRangeSyncEffects(tr: Transaction)`.
   - Read `editableLines` and `contentLines` from `tr.startState`.
   - Combine them with the existing `combinedRangeFacets`.
   - Return no effects unless `tr.newDoc.lines !== tr.startState.doc.lines` and the combined range is complete.
   - Keep the existing boundary math:
     - changes touching `0..safeFromBefore` shift both start and end by the line delta
     - changes touching `safeFromBefore..posRange.to` keep start fixed and adjust end by the line delta
   - Prefer `tr.newDoc.lines` over `tr.state.doc.lines` to avoid forcing full state construction while computing the update.
   - Emit `setEditableRange.of(nextRange)` and `setContentRange.of(nextRange)` effects, not only annotations, because the existing state fields already consume effects and a `transactionExtender` is explicitly allowed to add effects.
2. Add a new extension, for example `syncTargetRangesAfterLineChanges = EditorState.transactionExtender.of(...)`.
   - It should call the helper and return `{ effects }` when effects are present.
   - It should return `null` when no range sync is needed.
   - It should catch unexpected errors defensively and return `null`; it must not cancel the user's document transaction.
3. Narrow `preventModifyTargetRanges` so it remains responsible for the existing edit-blocking behavior only.
   - Keep the current `input` / `delete` / `move` guard that rejects modifications outside the selective range.
   - Remove the duplicated line-range annotation append from the filter path, or the implementation will have two maintenance paths that can drift.
   - Do not rely on this filter for undo/redo, because the accepted RCA proves history transactions bypass it.
4. Update `readOnlyRangesExtension` from `[smartDelete, preventModifyTargetRanges]` to include the new extender, for example `[smartDelete, preventModifyTargetRanges, syncTargetRangesAfterLineChanges]`.
5. Do not change `InlineEditEngine` for this bug unless implementation evidence shows the extension is not installed.
   - The accepted RCA and current source show initial mount and extension injection already work.
   - The failure is stale range state after a history transaction, not block-id parsing, mount range resolution, DOM paint, or embed shell reconciliation.

## Alternatives Considered

- Move all of `preventModifyTargetRanges` to `transactionExtender`.
  - Rejected. Extenders can only add effects and annotations; they cannot cancel or rewrite changes. The existing outside-range protection still needs a transaction filter.
- Special-case `undo` / `Ctrl+Z` in the inline-edit engine or keymap.
  - Rejected. CodeMirror history also covers menu-triggered undo, redo, and programmatic history commands. Hooking the key path would miss non-keyboard history paths and would be broader than the failing layer.
- Recompute the embed visible range from the block id after every inline-edit editor transaction.
  - Rejected. Fresh mount range resolution is already correct, and the stale state is local CM6 range metadata. Re-parsing source blocks after every transaction is larger, more expensive, and more likely to affect the other GitHub `#33` sub-bugs.
- Keep the current filter maintenance and add an extender only for `undo`.
  - Rejected. Redo uses the same `filter: false` history mechanism, and any future filter-disabled transaction that changes lines inside the selective range would have the same metadata gap. A single line-range extender keeps the invariant in one place.

## Implementation Notes

- The proposed path explicitly does not depend on a regular `transactionFilter` for history transactions. This satisfies the fix-design stage warning that CodeMirror filters do not run when transaction specs set `filter: false`.
- The helper should preserve the existing line numbering contract. Ranges are 1-based line numbers, while `lineRangeToPosRange` converts the start-state line range to CM positions for `tr.changes.touchesRange(...)`.
- Use range effects for the new maintenance path:
  - `frontmatterFacet.update` already checks `setContentRange` effects before `contentRange` annotations.
  - `selectiveLinesFacet.update` already checks `setEditableRange` effects before `editableRange` annotations.
  - Effects returned by an extender merge into the same transaction before state fields compute the next state.
- Keep initialization dispatches in `InlineEditEngine.ts` as-is for this bug. They intentionally use `filter: false` to bypass Obsidian filters, and the fields still consume the initial range annotations.
- If the implementation renames `preventModifyTargetRanges`, preserve any exported surface or update all imports. Current source inspection found only same-file wiring, so a rename is optional, not necessary.
- Avoid changing `hideLine` decoration logic. It correctly reflects the current range fields; the bug is that the range fields are stale after undo.

## Validation Plan

- Targeted unit regression:
  - Add a focused Jest test under `src/shared/utils/codemirror/__tests__/`, either in `selectiveEditor.systemLine.test.ts` or a new `selectiveEditor.historyRange.test.ts`.
  - Create an `EditorView` with `extensions: [history(), editBlockExtensions()]`.
  - Initialize a document where the block range is `[5, 9]` and a following paragraph starts on line `10`.
  - Dispatch initial `contentRange.of([5, 9])` and `editableRange.of([5, 9])`.
  - Dispatch an Enter-like inside-range insertion with `userEvent: "input"` and assert both `frontmatterFacet` and `selectiveLinesFacet` become `[5, 10]`.
  - Run `undo({ state: view.state, dispatch: tr => view.dispatch(tr) })` from `@codemirror/commands` and assert both ranges return to `[5, 9]`, doc line count returns to the original value, and `view.dom.textContent` does not contain the following paragraph.
  - Add either a second assertion or a sibling test for `redo(...)` to prove the same `filter: false` history path expands the range back to `[5, 10]`.
- Control coverage:
  - Keep or add a normal non-history inside-range insertion assertion so moving maintenance out of the filter does not regress the already-working Enter growth path.
  - If implementation touches the before-range branch, add a small test where a line inserted before the selective range shifts both range endpoints.
- Repo validation:
  - `corepack pnpm test`
  - `corepack pnpm run build-with-types`
- Obsidian/CDP validation after implementation:
  - Use the fixed runtime contract from `docs/agent/cdp-validation.md`:
    - `$env:OB_CDP_PORT='19225'`
    - `$env:OB_CDP_TITLE_CONTAINS=' - blp - '`
    - `node scripts/obsidian-cdp.js list`
  - Re-run the disposable-vault repro for `_blp_tmp` source/host notes:
    - before Enter: doc lines `14`, ranges `[5, 9]`, no leaked paragraph
    - after Enter: doc lines `15`, ranges `[5, 10]`, inserted child visible
    - after Ctrl+Z: doc lines `14`, ranges `[5, 9]`, no leaked paragraph
  - Re-run `node scripts/obsidian-cdp.js eval-file "scripts/cdp-snippets/debug-inline-edit-system-line.js"`.
  - Re-run adjacent inline-edit smoke `node scripts/obsidian-cdp.js eval-file "scripts/cdp-snippets/inline-edit-embed-jump-affordance.js"`.

## OpenSpec Gate

- No OpenSpec change is required before implementation if the patch stays inside the proposed bug-fix boundary.
- Rationale:
  - This restores the intended inline-edit block rendering invariant under undo; it does not add a new capability, change syntax, change settings, or alter architecture.
  - `openspec list --specs` shows the existing `inline-editing-embeds` capability.
  - `openspec/specs/inline-editing-embeds/spec.md` already covers block inline-edit rendering for `![[file#^blockId]]` in Live Preview.
- Create an OpenSpec proposal only if implementation review chooses to define new public behavior beyond this bug, such as a broader user-facing history/range persistence requirement, new inline-edit settings, or a larger inline-edit engine lifecycle redesign.

## Risks / Open Questions

- Redo likely has the same `filter: false` bypass as undo. The implementation should validate redo even though the child issue title names Enter plus undo.
- `preventModifyTargetRanges` currently mixes edit rejection and range maintenance. The implementation should avoid leaving duplicate maintenance in both the filter and extender.
- The extender must not make outside-range edits permissible. That responsibility remains with the filter.
- This design assumes CodeMirror effects from an extender are visible to `frontmatterFacet` and `selectiveLinesFacet` in the same transaction. This follows the CodeMirror implementation and current field update code, but the unit test should prove it in this repo's configured dependency versions.
- No source or test files were changed in this fix-design stage.

## Decision

- Proceed to adversarial fix-design review.
- If accepted, the implementation agent should make a small patch in `src/shared/utils/codemirror/selectiveEditor.ts`, add the bounded history regression under `src/shared/utils/codemirror/__tests__/`, then run Jest, type/build validation, and the fixed-port Obsidian/CDP repro.
