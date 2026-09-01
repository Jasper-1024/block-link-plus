## Status

- Verdict: accepted

## Plane Reply

The RCA can leave the RCA loop. The source-level omission is confirmed: the
standalone Outliner CM6 editor forwards EditorSuggest reevaluation only from
`docChanged`, while the reported caret move is selection-only. A healthy,
recovered Obsidian 1.13.7 runtime independently reproduced the stale visible
suggestion and then showed that the existing manager reevaluation closes an
out-of-range context while preserving both a valid `[[s` query and the `[[`
trigger endpoint. The closing-bracket and opener-deletion cases pass, so the
parent is bounded to the selection-only lifecycle gap. No child scope is
warranted; continue to fix design on the parent.

## Accepted Facts

- This is a confirmed, bounded File Outliner EditorSuggest lifecycle bug, not
  a broad Outliner or suggestion-cluster failure.
- `src/features/file-outliner-view/editor-state.ts:117-134` calls
  `host.onMaybeTriggerSuggest()` only inside `if (update.docChanged)`. A
  selection-only update reaches the separate selection/arrow-goal block but
  not the suggestion hook.
- `src/features/file-outliner-view/view.ts:1054-1091` wires the host hook to
  `maybeTriggerEditorSuggest()`, which checks the active edit session, file,
  adapter, and focus before delegating to the workspace manager.
- `src/features/file-outliner-view/editor-suggest-bridge.ts:419-448` prefers
  the workspace manager entrypoint. The direct bridge fallback does not close
  an already-open suggestion, so reevaluation—not an unconditional close—is
  the relevant lifecycle boundary.
- The fresh failure trace
  `docs/harness/runs/PLANE-BLP-18/trace/investigation/current-outliner-lifecycle.json`
  proves on Obsidian 1.13.7 / plugin 2.0.17 that `[[` opens, `[[s` remains
  open, `[[s]` closes, deleting the opening brackets closes, and a selection-only
  move from offset 2 to 0 leaves the manager and visible container open.
- The recovered short probes in
  `docs/harness/runs/PLANE-BLP-18/trace/investigation/manager-selection-contract.json`
  establish the missing mechanism: after a stale selection-only move, direct
  manager reevaluation closes synchronously through the manager's no-trigger
  path; at caret 1 it closes, while caret 2 and valid `[[s` remain open.
- The retained native Markdown comparison on Obsidian 1.13.6 supports the
  expected caret-exit behavior, but is not required as same-version proof.
- Human feedback was reconciled: both comments required a fresh task-owned
  retry and retention of prior caret-exit evidence. The investigation followed
  that instruction and did not recommend child scope.

## Challenges

- The claim is accepted narrowly. Static source flow plus the fresh failure
  trace prove the missing selection-only lifecycle boundary; the new manager
  probes also prove the existing manager's close/preserve behavior. They do not
  justify a broad close on every selection change.
- `closeEditorSuggests()` also appears in explicit edit exit, Escape, and
  structural-history restoration paths (`view.ts:1298-1308`, `:1921-1925`,
  `:2001`, and `:2257-2261`). None is reached by the isolated CM6
  selection-only dispatch, so these paths do not weaken the RCA.
- The invalid-query evidence is intentionally bounded to the observed
  closing-bracket case (`[[s]`) and opening-bracket deletion. It is not a claim
  about every possible malformed wiki-link string; those controls pass and do
  not form separate parent bugs.
- Two earlier multi-scenario probes timed out and tainted their instances.
  They are correctly discarded in the investigation. All accepted runtime
  evidence came from the recovered identity and the final list/identity check.

## Evidence Gaps

- There is no post-fix resolution proof or selection-only regression test; this
  is expected before implementation and is a validation obligation for the
  next stages, not a blocker to the RCA.
- The exact eligibility guard for selection-only reevaluation still needs to
  be decided and tested against sync suppression, arrow-navigation dispatches,
  focus, and valid-query preservation. This is implementation/design detail,
  not uncertainty about the RCA owner layer or manager contract.
- The retained native comparison is one Obsidian minor version older than the
  current Outliner proof. The current-version Outliner failure and manager
  probes are independently sufficient.

## Required Investigation Follow-up

No further investigation run is required for RCA acceptance. The next stage
must carry forward the proven boundary: a selection-only caret move outside the
trigger context must dismiss, while the trigger endpoint and valid query must
remain active; document invalidation controls must stay passing. Post-change
unit/runtime coverage must prove that boundary in a rebuilt healthy task
runtime.

## Created Child Items

- None. The investigation did not recommend `split-recommended` or
  `mitigation-child-recommended`, and the evidence supports one bounded
  lifecycle gap on the parent.

## Decision

Accepted. The owner layer, causal path, manager close mechanism, and relevant
trigger boundaries are specific, current, and runtime-backed enough for
fix-design on the parent item. The issue is not a current-runtime-not-
reproduced case, and no child item or human-review detour is needed. No product
source, test, package, generated, or formal spec/history file was changed.

## Research Notes

- Reviewed the RCA contract, source issue, human feedback, prior RCA review,
  investigation artifact, runtime-proof guidance, current source, tests, and
  maintained CDP catalog.
- Runtime identity was checked with
  `blp_control_plane.ensure_runtime({ fresh: false, ... })`, then
  `node scripts/obsidian-cdp.js list` and an identity eval confirmed one
  task-owned page target, vault `blp-BLP-18`, Outliner view, Obsidian 1.13.7,
  and plugin 2.0.17.
- Independent runtime commands passed:
  `node scripts/obsidian-cdp.js eval-file ".tmp/PLANE-BLP-18/manager-stale-one.js"`,
  `manager-valid-one.js`, and `manager-boundaries-rest.js`. The stale probe
  measured the manager call at 0 ms in this run; the valid-query probe retained
  its suggestion after a 250 ms settle.
- `corepack pnpm test -- --runInBand
  src/features/file-outliner-view/__tests__/editor-state.test.ts
  src/features/file-outliner-view/__tests__/editor-suggest-bridge.test.ts`
  passed 2 suites and 10 tests. `corepack pnpm run agent:workflow-check`
  passed. No build was run because no product code changed.
- The visual baseline
  `docs/harness/runs/PLANE-BLP-18/trace/investigation/current-stale-caret-exit.png`
  shows the suggestion still visible after the caret left the trigger range.
  No external framework source or tracker API was needed.

## Risks / Open Questions

- A future implementation must preserve valid active suggestions and avoid
  re-entrant or unnecessary manager calls during suppressed synchronization and
  arrow navigation.
- The current artifact proves the pre-fix failure only; it does not claim a
  fix, build, regression test, or post-fix runtime resolution.
- The older native comparison remains useful context, but post-fix validation
  should use the current task-owned Obsidian runtime.
