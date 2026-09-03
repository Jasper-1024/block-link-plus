## Status

- State: Fix Design
- Verdict: ready-for-review
- Task: BLP-18 — Outliner: dismiss stale wiki-link suggestions
- Scope: bounded File Outliner EditorSuggest lifecycle bug
- Design boundary: accepted RCA in `docs/harness/runs/PLANE-BLP-18/rca-review.md`

## Plane Reply

Recommend one small lifecycle correction in `createOutlinerEditorState()`:
send eligible selection-only CM6 updates through the existing
`onMaybeTriggerSuggest()` hook. That hook already reaches Obsidian's
`workspace.editorSuggest` manager, whose no-trigger path closes stale state and
whose valid-trigger path preserves the active suggestion. Keep the existing
sync-suppression and internal arrow-navigation guards, and do not add an
unconditional close or change the bridge.

The implementation review should attack the exact selection eligibility guard
and prove that a valid `[[`/`[[s` suggestion remains open while caret positions
before the trigger close. The required runtime proof must repeat the current
red lifecycle probe after rebuild/reload.

## RCA Inputs Used

- `docs/harness/runs/PLANE-BLP-18/context/source-issue.md`: the complete issue
  claim and acceptance criteria—dismiss an invalid wiki-link suggestion after
  invalid query text, opener deletion, or caret exit, while preserving a valid
  active suggestion.
- `docs/harness/runs/PLANE-BLP-18/investigation.md`: current-runtime failure
  proof, source orientation, manager-contract probes, native comparison, and
  the bounded scope decision.
- `docs/harness/runs/PLANE-BLP-18/rca-review.md`: `Verdict: accepted`; the
  owner layer is the Outliner CM6 update listener and no child scope is needed.
- `docs/harness/guides/tdd.md`: the implementation slice table and the
  distinction between `tdd` and `runtime-fix` evidence.
- `docs/harness/guides/runtime-proof-package.md`: task-runtime identity,
  rebuild/reload, pre-fix trace, post-fix trace, and screenshot obligations.

The current task-owned runtime identity check also passed with one matching
page target at `app://obsidian.md/index.html`, vault `blp-BLP-18`, active view
`blp-file-outliner-view`, Obsidian `1.13.7`, and plugin `block-link-plus`
`2.0.17`. No post-fix behavior is claimed in this design stage.

## Problem Boundary

The bug is one missing lifecycle edge in the standalone Outliner editor:

- `createOutlinerEditorState()` in
  `src/features/file-outliner-view/editor-state.ts:33-134` returns early for
  suppressed synchronization and currently calls
  `host.onMaybeTriggerSuggest()` only inside the `update.docChanged` branch at
  `:117-123`.
- A selection-only CM6 dispatch therefore reaches the selection/goal-column
  code at `:125-133` but never asks the suggestion manager to reevaluate the
  current caret. `view.ts:1054-1091` already supplies the hook and applies the
  active edit session, file, editor, and focus guards.
- `triggerEditorSuggest()` in
  `src/features/file-outliner-view/editor-suggest-bridge.ts:419-448` already
  prefers `workspace.editorSuggest.trigger(editor, file, true)`. On the
  accepted Obsidian runtime, no matching trigger causes the manager to close;
  a valid trigger preserves or refreshes the suggestion.
- Explicit `closeEditorSuggests()` in `view.ts:1298-1308` is used by edit-mode
  exit and Escape paths, not by a selection-only CM6 update. It is not the
  correct new boundary.

Accepted runtime evidence establishes this matrix:

| State | Expected behavior | Current evidence |
| --- | --- | --- |
| Type `[[` at caret 2 | Open visible link suggestions | Passes |
| Type valid `[[s` at caret 3 | Keep the suggestion open | Passes |
| Insert `]` after `[[s` | Close invalid suggestion | Passes through existing doc-change path |
| Delete opening `[[` | Close invalid suggestion | Passes through existing doc-change path |
| Move caret 2 -> 0 with document still `[[` | Close stale suggestion | Fails: manager and visible container remain open |
| Reevaluate `[[` at caret 1 | Close because caret is inside/before trigger | Manager contract passes |
| Reevaluate `[[` at caret 2 | Keep the trigger-end suggestion open | Manager contract passes |

The exact pre-fix visual and structured proof are
`docs/harness/runs/PLANE-BLP-18/trace/investigation/current-stale-caret-exit.png`
and
`docs/harness/runs/PLANE-BLP-18/trace/investigation/current-outliner-lifecycle.json`.
The manager-close/preserve evidence is in
`docs/harness/runs/PLANE-BLP-18/trace/investigation/manager-selection-contract.json`.

Out of scope: slash-command lifecycle, other Outliner suggestion providers,
malformed wiki-link forms beyond the observed controls, native Obsidian core,
structural edit/escape close paths, and a manager-less fallback redesign.

## Proposed Fix

Change only the update-listener decision in
`src/features/file-outliner-view/editor-state.ts`:

1. Keep `if (host.isSyncSuppressed()) return;` as the first guard.
2. Preserve the existing document-change behavior exactly: call
   `onDocChanged(update.state.doc.toString())`, then call
   `onMaybeTriggerSuggest()` once.
3. Add an `else if` for selection-only updates. When
   `update.selectionSet` is true and `update.docChanged` is false, call
   `onMaybeTriggerSuggest()` only when both existing internal-transition guards
   are false:

   ```text
   !host.isArrowNavDispatching()
   && !host.shouldPreserveArrowNavGoalOnce()
   ```

   This makes a normal mouse/programmatic caret move visible to the suggestion
   lifecycle while excluding CM6 selection dispatches owned by custom vertical
   navigation and cross-block goal-column preservation.
4. Leave the existing selection goal-column reset block in place and unchanged.
   The suggestion hook should be invoked before that block, matching the
   current document-change ordering, and at most once per view update.
5. Keep `maybeTriggerEditorSuggest()` in `view.ts` as the focus/session gate and
   keep `triggerEditorSuggest()` as the manager entrypoint. Do not call
   `closeEditorSuggests()` from the update listener. The manager must decide
   close versus preserve from the current document and selection.

The expected implementation shape is therefore equivalent to:

```text
if (update.docChanged) {
  onDocChanged(...)
  onMaybeTriggerSuggest()
} else if (
  update.selectionSet &&
  !isArrowNavDispatching() &&
  !shouldPreserveArrowNavGoalOnce()
) {
  onMaybeTriggerSuggest()
}
```

No new host method or state is required. The proposed path is an
`EditorView.updateListener` path; it does not depend on CodeMirror's regular
`transactionFilter`, and therefore does not introduce the filter-disabled
transaction limitation called out for inline-edit work.

## Alternatives Considered

1. **Close every open suggestion on any selection change.** Rejected. It would
   dismiss a valid `[[` or `[[s` suggestion, bypass the manager's native
   trigger decision, and violate the acceptance requirement to preserve valid
   active suggestions.
2. **Add an explicit `s.close()` fallback in `editor-suggest-bridge.ts` when
   no trigger returns true.** Rejected for this bug. The accepted runtime proves
   the existing manager entrypoint already closes stale state synchronously;
   direct closing would duplicate or bypass manager coordination and broaden
   the bridge contract. The current manager-less fallback remains out of scope.
3. **Listen for DOM caret, blur, or suggestion-container events in `view.ts`.**
   Rejected. It would duplicate CM6 selection state, miss programmatic
   selections, and make close timing dependent on DOM events. The update
   listener is the existing editor lifecycle seam used for document changes.
4. **Reevaluate on every selection update, including custom arrow dispatches.**
   Rejected. It can re-enter the manager during the Outliner's own arrow
   navigation and interfere with the existing goal-column and cross-block
   transition guards. The accepted design keeps those existing guards narrow
   to selection-only reevaluation.

## Implementation Notes

Planned files:

- `src/features/file-outliner-view/editor-state.ts`: add the guarded
  selection-only hook call; no change to the host type or other editor
  handlers.
- `src/features/file-outliner-view/__tests__/editor-state.test.ts`: add the
  host-hook regression and guard matrix at the stable CM6 update-listener
  seam.

Files intentionally not planned for change:

- `src/features/file-outliner-view/view.ts`: existing focus/session checks,
  manager delegation, arrow flags, and explicit close paths remain authoritative.
- `src/features/file-outliner-view/editor-suggest-bridge.ts`: manager behavior
  is already the accepted close/preserve mechanism.

The implementation must preserve these invariants:

- A document-changing update calls `onMaybeTriggerSuggest()` once, as today,
  even when that update also changes the selection.
- A selection-only update calls the hook only after sync suppression is false,
  custom arrow dispatching is false, and one-shot arrow-goal preservation is
  false.
- The view-level focus guard still prevents manager calls when the editor is
  not logically focused.
- No selection-only path directly closes a suggestion or mutates the manager's
  current suggestion.

## TDD Slice Plan

| Slice | Mode | Behavior | Public Seam | Before Evidence | Minimum Change | After Evidence | Refactor Allowance |
| --- | --- | --- | --- | --- | --- | --- | --- |
| S-1 | tdd | An eligible selection-only caret update reaches the Outliner suggestion hook exactly once, while document changes retain their existing hook behavior and internal transitions remain excluded. | `createOutlinerEditorState()` + mounted CM6 `EditorView` update listener in `src/features/file-outliner-view/__tests__/editor-state.test.ts` | Add a regression test that dispatches a selection-only move on the pre-fix state; it should be RED because the current listener records zero suggestion-hook calls. Existing adjacent baseline is 2 suites / 10 tests green. | Add the guarded `else if` selection-only branch in `editor-state.ts`; do not add a new host API. | Run `corepack pnpm test -- --runInBand src/features/file-outliner-view/__tests__/editor-state.test.ts src/features/file-outliner-view/__tests__/editor-suggest-bridge.test.ts`; the new selection case and suppression/arrow guard cases are green, with the existing document case still green. | Only condition naming or a nearby comment cleanup, and only while the slice remains green. |
| S-2 | runtime-fix | Real Obsidian EditorSuggest state closes after caret invalidation, preserves the trigger endpoint and valid query, and retains the already-passing document invalidation controls. | Task-owned Outliner CM6 editor -> `maybeTriggerEditorSuggest()` -> `workspace.editorSuggest` manager, with DOM/manager snapshots. | Reproduce with `.tmp/PLANE-BLP-18/outliner-lifecycle-current.js`: the current trace exits 1 on `caret-left-trigger-range` while `currentSuggest.isOpen` and the visible container remain true. Direct manager contract probes show close at caret 0/1 and preserve at caret 2/3. | Rebuild/reload the S-1 change only; leave bridge and explicit close paths unchanged. | Repeat the exact lifecycle probe after reload and require a passing JSON report: `[[` opens; `[[s` stays open; `[[s]` and opener deletion close; caret 2 -> 0 closes with no visible container; additional actual selection-only boundary checks prove caret 1 closes and caret 2/valid `[[s` remain open. Capture implementation trace and screenshot, then run the maintained arrow-navigation regression. | No broad cleanup or probe promotion. Any extra temporary probe stays under `.tmp/PLANE-BLP-18/`. |

The implementation agent must record actual before/after commands and files
touched for each accepted slice. It must not relabel the current green
baseline as RED; only the newly added selection-only assertion is expected to
fail before S-1.

## Validation Plan

### Targeted unit validation

The implementation should extend the existing `editor-state.test.ts` seam with
at least this matrix:

- selection-only dispatch on an eligible editor calls the suggestion hook and
  does not call `onDocChanged`;
- `isSyncSuppressed() === true` suppresses both document and selection-only
  lifecycle callbacks;
- `isArrowNavDispatching() === true` suppresses selection-only reevaluation;
- `shouldPreserveArrowNavGoalOnce() === true` suppresses selection-only
  reevaluation;
- the existing document-change test still proves one suggestion-hook call.

The test must assert host behavior, not private manager state. Manager close and
valid-query preservation belong to the runtime proof.

### Build and runtime proof package

Implementation/review should use the same task-owned identity:

- Task key: `BLP-18`
- Source issue: `Outliner: dismiss stale wiki-link suggestions`
- Archive key: `PLANE-BLP-18`
- Worktree: `C:\Users\stati\Documents\Codex\2026-06-13\hermes\outputs\plane-symphony-like-demo\workspaces\PLANE-BLP-18`
- Branch: `symphony/PLANE-BLP-18`
- Obsidian: `1.13.7`
- Vault: `blp-BLP-18`
- Plugin: `block-link-plus` `2.0.17`
- CDP title boundary: `blp-BLP-18`
- CDP port: follow the task lease; the current verified lease is `19227`

After the unit slice, run:

```powershell
corepack pnpm run build-with-types
node scripts/obsidian-cdp.js list
node scripts/obsidian-cdp.js eval "JSON.stringify({vault:app.vault?.getName?.(), active:app.workspace.getActiveViewOfType?.(Object)?.getViewType?.(), version:app.plugins?.plugins?.['block-link-plus']?.manifest?.version})"
```

Reload the built plugin through the maintained task-runtime path before
behavioral checks (for example,
`node scripts/obsidian-cdp.js eval-file "scripts/cdp-snippets/probes/file-outliner-editor-suggest.js"`),
then prepare the Outliner fixture and repeat:

```powershell
node scripts/obsidian-cdp.js eval-file ".tmp/PLANE-BLP-18/setup-current-runtime.js"
node scripts/obsidian-cdp.js eval-file ".tmp/PLANE-BLP-18/outliner-lifecycle-current.js"
```

The post-fix report must show, through the real Outliner selection dispatch,
that:

- `[[` at caret 2 opens with a visible container and items;
- valid `[[s` remains open and visible;
- `[[s]` closes;
- deleting the opening `[[` closes;
- moving the caret from 2 to 0 closes and removes the visible container;
- a boundary extension or companion temporary probe proves caret 1 closes,
  caret 2 remains open, and a valid `[[s` query remains open after
  selection-only reevaluation;
- the task runtime remains focused, has one unambiguous matching page target,
  and reports the expected vault, view, plugin, and version.

Store the post-fix structured report and visual evidence under
`docs/harness/runs/PLANE-BLP-18/trace/implementation/`, for example
`outliner-lifecycle-after-fix.json` and
`stale-caret-exit-after-fix.png`. The implementation must report any `slow`,
timeout, taint, or cleanup scene mutation according to the runtime guide and
must not treat discarded timeout output as product evidence.

Run the adjacent navigation regression after the lifecycle proof:

```powershell
node scripts/obsidian-cdp.js eval-file "scripts/cdp-snippets/regression/file-outliner-arrow-nav-e2e.js"
```

Finally, broaden validation in proportion to the touched code:

```powershell
corepack pnpm test
corepack pnpm run agent:workflow-check
```

No full build, post-fix runtime, or regression-test execution is claimed by
this fix-design stage. The accepted pre-fix evidence remains the baseline.

## Behavior Change Gate

This is a bug correction within the accepted issue boundary, not new feature or
refactor work. The intended change is explicit: Outliner selection-only caret
updates will participate in the same native suggestion lifecycle already used
for document changes. A valid trigger at the caret remains open; an
out-of-range trigger is dismissed. The observed native Markdown behavior and
the accepted manager contract define the expected result.

No product or architecture choice is left for an implementation agent to
invent, so a separate `human-review-required` design-intake detour is not
needed. Design review should still challenge the guard and evidence package;
approval is the gate before implementation.

## Risks / Open Questions

- The key review risk is whether the two existing internal arrow flags are the
  complete selection-only exclusion boundary. The unit matrix and the
  maintained arrow-navigation runtime regression must verify that choice.
- Manager reevaluation can refresh valid suggestions asynchronously, while the
  accepted stale close was synchronous. Assertions should inspect settled
  manager/DOM state rather than depend on the manager return value.
- `maybeTriggerEditorSuggest()` intentionally refuses calls when the Outliner
  editor is not focused or the edit session is no longer active. This design
  does not add a new blur close path; existing blur/edit-exit lifecycle remains
  responsible for that state.
- The bridge's direct per-suggest fallback is not changed. Supporting stale
  dismissal without `workspace.editorSuggest.trigger()` would be a separate
  compatibility decision and is not justified by the current accepted RCA.
- The runtime fixture and temporary probes mutate only the task-local scene.
  Post-fix evidence must be collected after a healthy lease identity check and
  stored separately from the discarded timeout traces in the investigation
  archive.

## Decision

Ready for adversarial design review. Approve a two-file implementation slice:
guarded selection-only reevaluation in `editor-state.ts` plus host-hook
regression coverage in `editor-state.test.ts`; use the existing manager as the
close/preserve decision and repeat the task-owned runtime lifecycle package
after rebuild/reload. Do not broaden the fix to direct closes, bridge
fallbacks, slash commands, or other Outliner lifecycle work.
