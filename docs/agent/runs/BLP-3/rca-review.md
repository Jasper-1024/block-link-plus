## Status

- Verdict: accepted

## Plane Reply

The RCA can leave the review loop. I independently reproduced the bug on the current worktree and closed the remaining mechanism gap: `Enter` grows the inline-edit visible/editable range as expected, but CodeMirror history dispatches `undo` with `filter: false`, so this plugin's `preventModifyTargetRanges` transaction filter never gets a chance to emit the shrink annotations on undo. The next stage should be fix design / implementation plus the bounded `Enter -> Ctrl+Z` regression.

## Accepted Facts

- CDP preflight passed in this worktree:
  - `corepack pnpm install --frozen-lockfile`
  - `node -e "require.resolve('ws'); console.log('ws-ok')"`
  - `corepack pnpm run build-with-types`
  - `corepack pnpm run obsidian:debug-env`
  - runtime reported `status: ready`, `port: 19227`, `blockLinkPlusLoaded: true`
- Fresh disposable-vault repro on `_blp_tmp/issue-inline-source-rca-review.md` and `_blp_tmp/issue-inline-host-rca-review.md` matched the issue claim:
  - before `Enter`: doc lines `14`, range `[5, 9]`, no leaked paragraph
  - after `Enter`: doc lines `15`, range `[5, 10]`, no leaked paragraph
  - after `Ctrl+Z`: doc lines `14`, range stays `[5, 10]`, leaked paragraph `Paragraph block for regular embed ^para1`
- The live undo transaction still satisfies the same inside-range conditions the current investigation called out:
  - `isUndo=true`
  - `numberNewLines=-1`
  - `touchesBefore=false`
  - `touchesInside=true`
  - expected end line `9`, actual end line `10`
- `preventModifyTargetRanges` is implemented as an `EditorState.transactionFilter` and emits range maintenance through transaction annotations in `src/shared/utils/codemirror/selectiveEditor.ts:231-304`.
- The `Enter` transaction reaches CodeMirror with the expected range-array annotations `[5, 10]`.
- The merged `undo` transaction reaches CodeMirror without any range-array annotations.
- CodeMirror history undo itself is created with `filter: false` in `node_modules/@codemirror/commands/dist/index.js:528-535`.
- CodeMirror's own state types document that `filter: false` disables change filters and transaction filters in `node_modules/@codemirror/state/dist/index.d.ts:876-883`.

## Challenges

- I reject the remaining ambiguity in `docs/agent/runs/BLP-3/investigation.md` that the shrink annotations might have been applied and then overwritten later. On the current worktree, the undo transaction arrives at `dispatchTransactions` with no range-array annotations at all.
- I reject any repaint-only explanation. The leak survives because the CM state ranges themselves remain `[5, 10]` after undo, not because the DOM merely failed to remeasure.
- I did not rely on the missing parent artifact `docs/agent/runs/BLP-1/rca-review.md`; it is not present in this worktree. The verdict is based on the local child issue snapshot, the current `BLP-3` investigation artifact, current source, and fresh runtime evidence.

## Evidence Gaps

- No blocking RCA gap remains for `#33B`.
- Implementation-stage validation still needs the bounded regression test the tracker requested for `Enter -> Ctrl+Z`, plus adjacent history checks after the fix. That is validation work, not unresolved RCA.

## Required Investigation Follow-up

- None for RCA exit.
- The next run should move to fix design / implementation, not broad reinvestigation.
- If a later implementation attempt stalls, start by checking whether the chosen range-maintenance hook runs on history transactions that set `filter: false`.

## Decision

- `accepted` is warranted because the current worktree now has all three required layers of proof:
  - real Obsidian/CDP runtime reproduction
  - plugin owner-layer proof in `selectiveEditor.ts`
  - framework-level mechanism proof that undo bypasses this plugin's regular transaction filter
- The RCA is complete enough for later fix-design work because it identifies both the failing plugin hook and the exact external behavior that prevents the expected shrink update from being emitted on undo.

## Research Notes

- Runtime/source references used in this review:
  - `src/shared/utils/codemirror/selectiveEditor.ts:231-304`
  - `node_modules/@codemirror/state/dist/index.d.ts:876-883`
  - `node_modules/@codemirror/commands/dist/index.js:528-535`
- Supporting runtime probe facts from the current session:
  - the `Enter` transaction carried two `[5, 10]` range-array annotations
  - the `undo` transaction carried no range-array annotations
  - the final leaked inline-edit text was `- Alpha parent block ^alpha1`, `Alpha child one`, `Alpha child two`, then `Paragraph block for regular embed ^para1`
- No product source, tests, package metadata, generated files, CDP snippets, or OpenSpec files were edited in this review.

## Risks / Open Questions

- The eventual fix must preserve the non-history range maintenance paths that already work on plain input.
- Redo likely shares the same CodeMirror history mechanism, so implementation validation should include redo-adjacent behavior even though this RCA is scoped to undo.
- `corepack pnpm test` was not run in this review-only stage.
