## Status

- Verdict: accepted

## Plane Reply

The design is approved for implementation. It follows the accepted RCA with a
small, stable seam change: eligible selection-only Outliner CM6 updates should
reuse `onMaybeTriggerSuggest()`, while the existing manager decides whether to
close or preserve the suggestion. Do not add an unconditional close, change
the bridge fallback, or broaden the work into other suggestion providers.

The implementation agent must execute the two declared slices, keep the sync
and custom-arrow guards, prove the host-hook matrix with tests, then rebuild and
repeat the task-owned lifecycle proof with a screenshot and the maintained
arrow-navigation regression. The timed-out exploratory manager probe from this
review is discarded and is not a reason to change the product design.

## Accepted Design Points

- The owner layer is correctly bounded to the `EditorView.updateListener` in
  `src/features/file-outliner-view/editor-state.ts:117-134`. The current
  omission is that `onMaybeTriggerSuggest()` is only called in the
  `update.docChanged` branch.
- The proposed `else if` is the correct shape. `docChanged` updates retain one
  suggestion-hook call, including updates that also set a selection; a
  selection-only update gets one hook call only when `selectionSet` is true and
  both existing internal-transition guards are false.
- The host hook and focus/session boundary already exist in
  `src/features/file-outliner-view/view.ts:1054-1091`. The accepted manager
  entrypoint in `editor-suggest-bridge.ts:419-448` is the right close-versus-
  preserve mechanism.
- The design correctly rejects `closeEditorSuggests()` from the update
  listener. The manager must inspect the current document and selection so a
  valid `[[` trigger endpoint and valid `[[s` query remain active.
- The proposed guards match the existing transition ownership:
  `arrowNavDispatching` surrounds in-block custom arrow dispatches in
  `view.ts:2183-2211`, and `preserveArrowNavGoalOnce` surrounds cross-block
  edit-mode replacement in `view.ts:2226-2231`. State replacement is also
  protected by `suppressEditorSync` in `view.ts:1878-1884`.
- The scope is correctly limited to
  `editor-state.ts` and its host-hook regression tests. The view focus gate,
  manager bridge, explicit edit-exit/Escape closes, and structural-history
  closes remain authoritative.

## Challenges

- The implementation must preserve the `if (update.docChanged)` branch as an
  exclusive first path. An update with both document and selection changes
  must not call the suggestion hook twice.
- The unit matrix must test each exclusion independently, not only the case
  where both flags are false: sync suppression, custom arrow dispatching, and
  one-shot arrow-goal preservation must each suppress selection-only
  reevaluation. It should also assert that the eligible selection-only case
  does not call `onDocChanged`.
- CodeMirror's `ViewUpdate.selectionSet` means that a transaction explicitly
  supplied a selection; it is the correct signal for the intended programmatic
  and pointer selection path. The maintained CM6 declaration documents this at
  `node_modules/@codemirror/view/dist/index.d.ts:557-563`, and the update
  listener is invoked for non-empty updates in
  `node_modules/@codemirror/view/dist/index.cjs:7724-7731`.
- History and `filter: false` do not invalidate this seam. `basicSetup` includes
  history (`node_modules/@codemirror/basic-setup/dist/index.js:48-75`), and
  ordinary CM6 undo dispatches a transaction with document changes and an
  explicit selection while disabling transaction filters
  (`node_modules/@codemirror/commands/dist/index.cjs:510-538`). It therefore
  remains on the existing `docChanged` path and keeps the one-call invariant.
  The design does not rely on `transactionFilter`, `transactionExtender`, a
  state field, an effect, or decoration recomputation. The existing document
  hook test protects the shared path; a direct undo assertion is only needed if
  implementation changes the history wiring.
- The inline-edit range case is not applicable to this bounded change. No
  `InlineEditEngine` code or range-interception seam is touched, and adding a
  cross-feature range test would broaden the accepted RCA. The implementation
  must stop for review if it discovers that the fix actually requires that
  feature.
- A healthy task-owned runtime reproduced the red selection-only symptom in a
  short probe: after `[[` opened with four visible items, moving the CM6
  selection from offset 2 to 0 left both the manager and visible container
  open. Separate short manager probes closed the out-of-range state and
  preserved a valid `[[s` query, and an ArrowDown event while a suggestion was
  open left the caret and suggestion unchanged.
- One multi-scenario temporary manager probe later exceeded the 60-second CDP
  deadline and returned `tainted: true`. Its output is discarded. The runtime
  was recovered once through the task lease, identity-checked, and the bounded
  probes above passed; this incident is a validation caution, not product
  evidence or a design contradiction.

## Required Revisions

None for design approval. The following are implementation acceptance
conditions carried forward from the accepted design:

- Keep the source change to the guarded selection-only branch in
  `editor-state.ts` and the host-hook regression coverage in
  `editor-state.test.ts`.
- Keep `onMaybeTriggerSuggest()` behind the existing sync, custom-arrow, and
  goal-preservation boundaries; do not call `closeEditorSuggests()` from the
  listener.
- Make the post-fix runtime report settle before asserting manager/DOM state,
  and discard any timed-out or tainted run rather than converting it into a
  pass.

## Implementation Readiness

The smallest implementation scope is ready:

1. In `createOutlinerEditorState()`, retain the existing document-change path
   and add the guarded `selectionSet && !isArrowNavDispatching() &&
   !shouldPreserveArrowNavGoalOnce()` `else if` path.
2. Extend `src/features/file-outliner-view/__tests__/editor-state.test.ts`
   at the mounted CM6 update-listener seam. Cover eligible selection-only
   reevaluation, no `onDocChanged`, the three suppression guards, and the
   existing exactly-once document-change behavior.
3. Run the tests, `corepack pnpm run build-with-types`, reload the built plugin
   through the task-owned runtime, and repeat the lifecycle proof. Store the
   post-fix JSON and visual evidence under
   `docs/harness/runs/PLANE-BLP-18/trace/implementation/`.

No product decision, new host API, bridge change, child scope, or human design
choice is left for the implementation agent.

## TDD Slice Review

| Slice | Mode | Review result | Stable seam | Required proof |
| --- | --- | --- | --- | --- |
| S-1 | `tdd` | Accepted. The new assertion is expected to be RED against the current listener; existing document behavior remains green. | `createOutlinerEditorState()` plus a mounted CM6 `EditorView` and host callbacks. | Selection-only eligible call exactly once; no document callback; sync, custom-arrow, and goal-preservation guards suppress; document change still calls the suggestion hook once. |
| S-2 | `runtime-fix` | Accepted. The runtime package matches the visual/editor bug and repeats the same pre/post lifecycle boundary. | Real Outliner CM6 editor -> `maybeTriggerEditorSuggest()` -> `workspace.editorSuggest`, with manager and DOM snapshots. | After rebuild/reload: `[[` opens, `[[s` stays open, closing-bracket and opener deletion close, caret 2 -> 0 closes/removes the container, caret 1 closes, caret 2 remains open, valid `[[s` remains open, and arrow navigation still passes. |

The modes are honest: S-1 changes an observable host-wiring behavior at a
stable test seam, while S-2 must reproduce the real Obsidian symptom after a
build/reload. No refactor allowance is needed beyond a local condition name or
comment that does not alter the slice.

## Validation Coverage

Review-stage checks completed:

- Targeted baseline: `corepack pnpm test -- --runInBand src/features/file-outliner-view/__tests__/editor-state.test.ts src/features/file-outliner-view/__tests__/editor-suggest-bridge.test.ts` -> 2 suites and 10 tests passed.
- Runtime lease: `blp_control_plane.ensure_runtime({ fresh: false, ... })` -> task-owned `blp-BLP-18`, port 19227; `node scripts/obsidian-cdp.js list` -> one matching page target; identity eval -> vault `blp-BLP-18`, view `blp-file-outliner-view`, Obsidian `1.13.7`, plugin `block-link-plus` `2.0.17`.
- Red boundary: `node scripts/obsidian-cdp.js eval-file ".tmp/PLANE-BLP-18/setup-current-runtime.js"` followed by the bounded review probe -> `status: reproduced`; before selection-only move `currentOpen: true` with four visible items, after move to offset 0 `currentOpen: true` with four visible items.
- Manager contract: the bounded stale probe closed the out-of-range state immediately after `mgr.trigger`; the bounded valid-query probe kept `[[s` open with one item after a 250 ms settle.
- Arrow interaction: the bounded suggestion-open ArrowDown probe kept the caret at offset 2 and the suggestion open.
- Accepted pre-fix durable evidence remains in
  `trace/investigation/current-outliner-lifecycle.json`,
  `trace/investigation/manager-selection-contract.json`, and
  `trace/investigation/current-stale-caret-exit.png`.

The review did not run a build because it made no product changes. The
implementation stage must run:

```powershell
corepack pnpm run build-with-types
node scripts/obsidian-cdp.js list
node scripts/obsidian-cdp.js eval-file ".tmp/PLANE-BLP-18/setup-current-runtime.js"
node scripts/obsidian-cdp.js eval-file ".tmp/PLANE-BLP-18/outliner-lifecycle-current.js"
node scripts/obsidian-cdp.js eval-file "scripts/cdp-snippets/regression/file-outliner-arrow-nav-e2e.js"
corepack pnpm test
corepack pnpm run agent:workflow-check
```

The implementation report must include the exact rebuild/reload command, one
unambiguous task-runtime target, post-fix structured output, screenshot path,
and any `slow`, timeout, taint, or cleanup-scene mutation. No post-fix result is
claimed by this review.

## Risks / Open Questions

- The two existing arrow flags are the intended exclusion boundary, but the
  implementation tests and maintained arrow regression must confirm that
  choice in the rebuilt plugin.
- Manager reevaluation can refresh a valid suggestion asynchronously. Runtime
  assertions should inspect settled `currentSuggest` and visible-container
  state, not the manager's boolean return value.
- The existing focus/session guard intentionally remains responsible for
  calls while the Outliner editor is active and focused. Blur/edit-exit paths
  are not part of this fix.
- Invalid-query coverage remains limited to the accepted closing-bracket and
  opening-bracket-deletion controls. Other malformed wiki-link syntax is not a
  newly accepted parent scope.
- The prior long probe timeout is a reminder to use bounded, independently
  diagnosable runtime steps. Any future timeout invalidates that run's
  evidence and requires the runtime-failure route.

## Decision

Accepted. The fix design is specific, bounded to the accepted RCA, supported by
current source and CM6 behavior, and executable through the declared TDD and
runtime-fix slices. Proceed to implementation with the two-file patch and the
required post-build task-runtime proof; no design-intake or human-review
detour is required.
