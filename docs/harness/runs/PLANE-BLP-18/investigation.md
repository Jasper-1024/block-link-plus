## Status

- State: Middle-flow
- Verdict: handoff
- Task: BLP-18 — Outliner: dismiss stale wiki-link suggestions
- Workspace: `C:\Users\stati\Documents\Codex\2026-06-13\hermes\outputs\plane-symphony-like-demo\workspaces\PLANE-BLP-18`
- Branch: `symphony/PLANE-BLP-18`
- Plane dossier: none
- Run mode: RCA-loop continuation after `rca-review.md` accepted the owner layer with refinement; readable human feedback also required a fresh runtime retry.
- Code changes: none. Product source, tests, package metadata, generated files, and formal spec/history files were not changed.

## Scope

- Classification: confirmed bug, bounded to the File Outliner EditorSuggest lifecycle.
- In scope: native wiki-link suggestions in the Outliner CM6 editor: opening on `[[`, retaining a valid query, dismissal after invalid query text, deletion of the opening brackets, and moving the caret outside the active trigger range.
- Out of scope: slash-command behavior, implementation, regression-test edits, package/build changes, direct tracker operations, and treating a CDP timeout as product behavior.

## Tracker Feedback Review

- Human feedback required this retry to use a newly launched task-owned Obsidian/CDP runtime because the prior instance had been tainted, and asked that the prior confirmed caret-exit evidence be retained.
- The feedback was accepted as a bounded retry instruction. The issue scope and acceptance criteria did not change. `blp_control_plane.ensure_runtime({ fresh: true, ... })` returned the task-owned identity `blp-BLP-18` on port `19227`; `node scripts/obsidian-cdp.js list` then showed one matching page target at `app://obsidian.md/index.html`.
- The fresh runtime produced replacement Outliner evidence on Obsidian 1.13.7. The later native-comparison probe timed out and tainted the runtime while switching views; that attempt is explicitly discarded and does not change the product verdict. The retained prior native comparison remains referenced below.
- After the RCA review's timeout, a second fresh lease recovery was used for short manager-contract probes. Those probes completed without timeout and directly answered the review's manager-close, trigger-boundary, and regression-seam gaps. Durable output is in `docs/harness/runs/PLANE-BLP-18/trace/investigation/manager-selection-contract.json`; the discarded multi-scenario timeout is recorded in `manager-selection-contract-timeout.json`.
- No linked pages or additional tracker comments exist.

## Evidence

- Issue claim: In the File Outliner editor, typing `[[` opens the native link suggestion, but the suggestion can remain visible after continued typing makes the query invalid, after the opening brackets are deleted, or after the caret leaves the active trigger range. A valid active suggestion must remain open.

- Static orientation:
  - `src/features/file-outliner-view/editor-state.ts:117-134` installs the CM6 `EditorView.updateListener`. It calls `host.onMaybeTriggerSuggest()` only inside `if (update.docChanged)` at `:120-123`. A selection-only update reaches the separate `update.selectionSet` ArrowUp/Down goal-column reset block at `:127-133` and has no suggestion lifecycle callback.
  - `src/features/file-outliner-view/view.ts:1054-1077` wires `onMaybeTriggerSuggest` to `maybeTriggerEditorSuggest()`.
  - `src/features/file-outliner-view/view.ts:1080-1091` gates the callback on the active edit session, file, editor, and focus, then delegates to `triggerEditorSuggest()`. It has no selection-only close path.
  - `src/features/file-outliner-view/editor-suggest-bridge.ts:419-448` prefers `workspace.editorSuggest.trigger(editor, file, true)` and falls back to individual suggest `trigger()` calls. The adapter returns `{ triggered: false }` without explicitly closing an already-open suggestion.
  - `src/features/file-outliner-view/view.ts:1298-1308` closes open suggestions only through explicit view lifecycle calls; `exitEditMode()` invokes that close path at `:1921-1925`, and Escape invokes it at `:2257-2261`. Neither is reached by a selection-only CM6 dispatch.
  - Existing tests do not lock down this lifecycle: `src/features/file-outliner-view/__tests__/editor-state.test.ts:10-51` checks the document-change host hook, while `src/features/file-outliner-view/__tests__/editor-suggest-bridge.test.ts:30-125` checks adapter construction, formatting, and transaction mapping. Neither asserts selection-only suggestion dismissal or preservation of a valid open query.

- RCA follow-up manager contract:
  - `node scripts/obsidian-cdp.js eval-file ".tmp/PLANE-BLP-18/manager-stale-one.js"` passed on the recovered task runtime. With document `[[`, a selection-only move from caret `2` to `0` left `currentSuggest.isOpen === true`, context `{ start: 2, end: 2, query: "" }`, and four visible items. Calling `workspace.editorSuggest.trigger(view.suggestEditor, view.file, true)` completed in `1 ms`, returned `undefined`, then left `currentSuggest.isOpen === false`, cleared context, and removed the visible container.
  - `node scripts/obsidian-cdp.js eval-file ".tmp/PLANE-BLP-18/manager-valid-one.js"` passed. For valid document `[[s` at caret `3`, manager reevaluation kept the suggestion open, retained context `{ start: 2, end: 3, query: "s" }`, and retained one visible item both immediately and after a `250 ms` settle.
  - `node scripts/obsidian-cdp.js eval-file ".tmp/PLANE-BLP-18/manager-boundaries-rest.js"` passed. For `[[`, a selection-only move to caret `1` (between the opening brackets) stayed stale until manager reevaluation, which closed it; a move to caret `2` (the trigger endpoint) stayed open after reevaluation with four visible items. The earlier stale-at-caret-`0` result covers the position before the trigger.
  - `node scripts/obsidian-cdp.js eval-file ".tmp/PLANE-BLP-18/view-maybe-trigger-one.js"` passed. Calling the existing `FileOutlinerView.maybeTriggerEditorSuggest()` hook after the same selection-only move to caret `0` closed the suggestion and removed the container. This distinguishes the existing manager reevaluation path from an explicit `closeEditorSuggests()` fallback.
  - The runtime manager function source observed in Obsidian 1.13.7 is `if (e.cm.hasFocus) { for (...) { if (o.trigger(e,t,n)) return ... } this.close() }`: valid trigger results preserve/re-render the suggestion, while no trigger result calls the manager close path. The Outliner bridge already delegates to this manager at `editor-suggest-bridge.ts:419-448`.

- Runtime identity and setup:
  - `blp_control_plane.ensure_runtime({ fresh: true, reason: "Tracker feedback requires retrying the investigation against a newly launched task-owned Obsidian/CDP runtime" })` returned `ready`, task key `BLP-18`, identity `blp-BLP-18`, CDP port `19227`, and runtime root `C:\Users\stati\AppData\Local\plane-harness\runtimes\blp-BLP-18`.
  - `node scripts/obsidian-cdp.js list` returned exactly one page target with title `start - blp-BLP-18 - Obsidian 1.13.7` before setup and title `blp-18-current-outliner - blp-BLP-18 - Obsidian 1.13.7` during the probe, both at `app://obsidian.md/index.html`, plus worker targets.
  - `node scripts/obsidian-cdp.js eval "JSON.stringify(...)"` verified vault `blp-BLP-18`, plugin `block-link-plus` loaded at version `2.0.17`, and the expected task title boundary.
  - `node scripts/obsidian-cdp.js eval-file ".tmp/PLANE-BLP-18/setup-current-runtime.js"` passed. It created `_blp_tmp/blp-18-current-outliner.md` and `_blp_tmp/blp-18-current-target.md`, opened the Outliner view, entered edit mode, and confirmed a focused CM6 editor.

- Current fresh-runtime failure proof:
  - Red-capable command: `node scripts/obsidian-cdp.js eval-file ".tmp/PLANE-BLP-18/outliner-lifecycle-current.js"`.
  - The command intentionally exited `1` with `BLP18_OUTLINER_LIFECYCLE_REPORT` because the expected caret-exit dismissal assertion went red. It completed in about 10 seconds without a CDP timeout.
  - `trigger-open`: document `[[`, caret offset `2`, `currentSuggest.isOpen === true`, one open/current suggest, visible `.suggestion-container`, four suggestion items.
  - `valid-query`: document `[[s`, caret offset `3`, suggestion remained open and visible with one matching item.
  - `invalid-query-after-closing-bracket`: document `[[s]`, caret offset `4`, no open suggest and no suggestion container.
  - `delete-opening-brackets-after`: document `s`, caret offset `1`, no open suggest and no suggestion container.
  - `caret-exit-before`: document `[[`, caret offset `2`, suggestion open and visible.
  - `caret-left-trigger-range`: document remained `[[`, caret moved selection-only to offset `0`, but `currentSuggest.isOpen === true`, one open/current suggest remained, and the visible container still contained four items. This is the exact reported stale suggestion symptom.
  - Full structured trace: `docs/harness/runs/PLANE-BLP-18/trace/investigation/current-outliner-lifecycle.json`.
  - Screenshot of the stale visible suggestion after the caret moved to offset `0`: `docs/harness/runs/PLANE-BLP-18/trace/investigation/current-stale-caret-exit.png`.

- Retained comparison evidence:
  - `docs/harness/runs/PLANE-BLP-18/trace/investigation/lifecycle-pre-timeout.json` records the earlier task-owned runtime on Obsidian 1.13.6. In native Markdown, after `[[` opened a suggestion, the same selection-only move from offset `2` to `0` closed the suggestion and removed the visible container. That comparison is retained per human feedback and is consistent with the current Outliner result.
  - The current attempt `node scripts/obsidian-cdp.js eval-file ".tmp/PLANE-BLP-18/native-lifecycle-current.js"` emitted `BLP_CDP_EVENT slow` at 30 seconds and `BLP_CDP_EVENT timeout` at 60 seconds with `tainted:true` and exit code `124`. It returned no report, so it is not used as product evidence. Durable record: `docs/harness/runs/PLANE-BLP-18/trace/investigation/native-comparison-timeout-current.json`.
  - After that timeout, the task runtime was treated as unsafe and no further CDP commands were run against it. The lease records the task-local scene mutation as required by the runtime contract.

- Commands run:
  - `node scripts/obsidian-cdp.js list` — passed identity check before the current probe.
  - `node scripts/obsidian-cdp.js catalog list` — passed; maintained File Outliner suggestion probes were listed.
  - `node scripts/obsidian-cdp.js eval "JSON.stringify(...)"` — passed vault/plugin/title identity check.
  - `node scripts/obsidian-cdp.js eval-file ".tmp/PLANE-BLP-18/setup-current-runtime.js"` — passed Outliner setup and focused-editor check.
  - `node scripts/obsidian-cdp.js eval-file ".tmp/PLANE-BLP-18/open-current-suggestion.js"` — passed; `[[` opened a visible suggestion with four items.
  - `node scripts/obsidian-cdp.js eval-file ".tmp/PLANE-BLP-18/caret-exit-current.js"` — failed on the intended exact stale-caret assertion; document stayed `[[`, caret moved `2 -> 0`, suggestion stayed open and visible.
  - `node scripts/obsidian-cdp.js eval-file ".tmp/PLANE-BLP-18/outliner-lifecycle-current.js"` — failed on the intended exact caret-exit assertion; bracket invalidation and opener deletion passed within the same report.
  - `node scripts/obsidian-cdp.js screenshot "docs/harness/runs/PLANE-BLP-18/trace/investigation/current-stale-caret-exit.png"` — passed; screenshot captured.
  - `node scripts/obsidian-cdp.js eval-file ".tmp/PLANE-BLP-18/native-lifecycle-current.js"` — runtime-blocked; slow event then 60-second timeout with `tainted:true`; discarded.
  - `node scripts/obsidian-cdp.js eval-file ".tmp/PLANE-BLP-18/manager-selection-contract.js"` — runtime-blocked; emitted `slow` and timed out after 60 seconds with `tainted:true`; no product evidence was taken from it, and the runtime was recovered before continuing.
  - `node scripts/obsidian-cdp.js eval-file ".tmp/PLANE-BLP-18/manager-stale-one.js"` — passed; direct manager reevaluation closed the stale caret-0 suggestion in 1 ms.
  - `node scripts/obsidian-cdp.js eval-file ".tmp/PLANE-BLP-18/manager-valid-one.js"` — passed; manager reevaluation preserved valid `[[s` at caret 3.
  - `node scripts/obsidian-cdp.js eval-file ".tmp/PLANE-BLP-18/manager-boundaries-rest.js"` — passed; caret 1 closed and caret 2 remained open after manager reevaluation.
  - `node scripts/obsidian-cdp.js eval-file ".tmp/PLANE-BLP-18/view-maybe-trigger-one.js"` — passed; the existing Outliner hook closed the stale caret-0 suggestion.
  - `corepack pnpm test -- --runInBand src/features/file-outliner-view/__tests__/editor-state.test.ts src/features/file-outliner-view/__tests__/editor-suggest-bridge.test.ts` — passed; 2 suites and 10 tests.
  - `corepack pnpm run agent:workflow-check` — passed.
  - Final `node scripts/obsidian-cdp.js list` and identity eval — passed; the recovered task-owned page target remained healthy and the Outliner editor remained focused.
  - No full build was run; this was a non-implementation investigation and no product code changed.

- Files inspected: `WORKFLOW.md`, `CONTEXT.md`, `docs/harness/stages/investigation.md`, `docs/harness/guides/evidence-format.md`, `docs/harness/guides/cdp-runtime.md`, `docs/harness/guides/runtime-proof-package.md`, `docs/harness/runs/PLANE-BLP-18/context/source-issue.md`, `docs/harness/runs/PLANE-BLP-18/context/tracker-feedback.md`, the prior investigation artifact, `src/features/file-outliner-view/editor-state.ts`, `src/features/file-outliner-view/view.ts`, `src/features/file-outliner-view/editor-suggest-bridge.ts`, related unit tests, the maintained Outliner suggestion probe, and the retained lifecycle trace.

## RCA Review Follow-up

- Reviewed gap: exact manager/close mechanism. New evidence: the healthy `manager-stale-one.js` probe showed a stale selection-only state before reevaluation, then `workspace.editorSuggest.trigger(...)` closed it synchronously; the runtime manager source confirms the no-trigger `this.close()` branch. The existing Outliner `maybeTriggerEditorSuggest()` hook produced the same transition. This closes the mechanism gap in favor of manager reevaluation, with no direct close fallback required.
- Reviewed gap: caret boundary matrix. New evidence: caret `0` and `1` close after manager reevaluation; caret `2` (opening-trigger endpoint) and caret `3` for valid `[[s` remain open. Document invalidation controls remain covered by the retained current lifecycle trace: closing-bracket insertion and opening-bracket deletion close through the existing document-change path.
- Reviewed gap: selection-only regression seam. New evidence: the missing call boundary is `createOutlinerEditorState()`'s `EditorView.updateListener` at `editor-state.ts:117-134`; the unit regression should assert the host suggestion hook is called for the accepted selection-only update path, while the runtime regression must assert stale caret dismissal and valid-query preservation through the real manager.
- Reviewed gap: fresh runtime health. New evidence: after the multi-scenario probe timed out and tainted its instance, `ensure_runtime({ fresh: true, ... })` was called again; all successful follow-up probes used the recovered identity `blp-BLP-18` and ended with a clean list/identity check. The timeout output is retained only as a runtime limitation.

## Runtime Proof Package

- Task key: `BLP-18`
- Source issue: `Outliner: dismiss stale wiki-link suggestions`
- Archive key: `PLANE-BLP-18`
- Worktree: `C:\Users\stati\Documents\Codex\2026-06-13\hermes\outputs\plane-symphony-like-demo\workspaces\PLANE-BLP-18`
- Branch: `symphony/PLANE-BLP-18`
- Obsidian version: `1.13.7`
- Vault name: `blp-BLP-18`
- Plugin id/version: `block-link-plus` / `2.0.17`
- CDP port: `19227`
- Title boundary: `blp-BLP-18`
- Build/reload command: no build or plugin reload command was run in this retry. The runner-owned runtime loaded the checkout's existing `main.js`; the setup probe only configured a temporary vault file and opened the Outliner view.
- Failure proof before fix: current fresh-runtime `current-outliner-lifecycle.json` and `current-stale-caret-exit.png` show the open visible suggestion after the caret moved outside the trigger range, with the document unchanged.
- Visual/interactive proof: screenshot path above plus structured DOM/manager snapshots in the current lifecycle trace.
- Native comparison: prior retained trace proves native Markdown dismissed the same selection-only caret exit; the current native retry timed out before returning a report and is discarded. The current recovered Outliner manager probes independently establish the expected manager behavior.
- Resolution proof after fix: not applicable; no implementation was made.
- Remaining unproved: post-fix resolution and regression coverage. The implementation-stage condition for invoking the existing hook on eligible selection-only updates still needs to be reviewed against arrow-navigation and sync-suppression semantics.

## Root Cause

- Owner layer: confirmed Outliner CM6-to-Obsidian EditorSuggest lifecycle gap. The precise behavior contract is now established: selection-only updates must reach the existing manager reevaluation path; the manager closes when no suggest trigger matches and preserves valid in-range suggestions.
- Exact files/functions:
  - `createOutlinerEditorState()` in `src/features/file-outliner-view/editor-state.ts:33-134` only calls `onMaybeTriggerSuggest()` for `docChanged`; selection-only transactions do not invoke it.
  - `FileOutlinerView.createEditorState()` in `src/features/file-outliner-view/view.ts:1054-1077` supplies the callback, and `maybeTriggerEditorSuggest()` at `:1080-1091` only retriggers the manager when its callback is reached and the Outliner editor is focused.
  - `triggerEditorSuggest()` in `src/features/file-outliner-view/editor-suggest-bridge.ts:419-448` delegates to `workspace.editorSuggest.trigger(...)`, whose no-trigger path closes the manager; the bridge itself does not need an explicit stale-suggestion close fallback for this contract.
  - `closeEditorSuggests()` in `src/features/file-outliner-view/view.ts:1298-1308` is tied to explicit edit/session lifecycle paths, not selection-only updates.
- Why this explains the evidence: the failing operation changes only the CM6 selection (`anchor 2 -> 0`) while leaving the document `[[`. The runtime shows the already-open manager suggestion remains visible. Static flow shows that this transaction bypasses the only Outliner suggestion callback. In contrast, the two document-invalidating edits each traverse `docChanged` and the manager closes its current suggestion; both pass in the same current probe. Native Markdown's retained comparison closes on the selection-only move, establishing the expected lifecycle.
- RCA boundary: the cause is bounded and runtime-confirmed: `update.selectionSet` can change the caret without invoking `onMaybeTriggerSuggest`, so the open manager retains stale context. The healthy follow-up proves the existing manager reevaluation closes positions before the trigger (0 and 1) while preserving the trigger endpoint (2) and valid query (3); the next stage must review the exact selection-only eligibility guard before implementation.
- Cluster split: none. Current evidence shows one shared lifecycle gap (caret invalidation) while closing-bracket and opener-deletion invalidation pass; there are not multiple independently fixable parent bugs.

## Fix Plan

- Proposed direction for RCA review: extend the Outliner editor-state lifecycle boundary so eligible selection-only CM6 updates reach the existing `onMaybeTriggerSuggest` / `maybeTriggerEditorSuggest` manager path. Do not add a broad unconditional close; the runtime contract shows manager reevaluation preserves valid in-range suggestions and closes only when no trigger matches.
- Candidate files: `src/features/file-outliner-view/editor-state.ts`, `src/features/file-outliner-view/view.ts`, and possibly `src/features/file-outliner-view/editor-suggest-bridge.ts`; no file is authorized for implementation by this investigation.
- Smallest-correct-fix constraint: preserve the existing document-change path, sync-suppression guard, ArrowUp/Down goal-column behavior, and valid-query behavior; add coverage at the `editor-state.ts` host-hook seam and keep the real manager as the close decision.
- Risks: selection-only reevaluation must not run during suppressed editor sync or unexpectedly interfere with arrow-navigation dispatches; manager calls can refresh asynchronously for valid queries. The observed stale close itself was synchronous and did not require direct `s.close()`.

## Validation Plan

- Targeted tests: existing adjacent suites passed 2/2 suites and 10/10 tests. The next implementation slice should add a unit regression at `createOutlinerEditorState()` for the selection-only host-hook boundary; the real runtime regression should cover caret 0/1 dismissal, caret 2/3 preservation, and the existing document invalidation controls.
- Full tests/build: no full test suite or build run; no product code changed, so full build is not required for this investigation handoff.
- CDP/runtime checks for the implementation stage: rebuild/reload in a healthy task-owned runtime, repeat valid `[[` and `[[s`, caret boundary positions 0/1/2/3, closing-bracket invalidation, opener deletion, and caret exit; compare manager state and visible container state, then retain the screenshot/probe report. Native Markdown comparison is useful but not required to re-run if the same-version runtime is unavailable.
- Manual checks: confirm a valid active suggestion remains open, each invalidation path dismisses, caret movement at/inside/outside the trigger boundary behaves correctly, and unrelated active suggestions are not closed.

## Open Questions / Risks

- The multi-scenario manager probe and auxiliary native comparison each timed out in separate attempts; both are discarded runtime facts, not product failures. The successful single-scenario probes ran after recovery on a healthy task-owned runtime and are the manager evidence used here.
- The next stage must choose the eligibility guard for selection-only reevaluation in the existing update listener, accounting for sync suppression, real arrow-navigation dispatches, and the active edit/focus gates already present in `maybeTriggerEditorSuggest()`.
- No post-fix resolution proof or live regression test exists.
- The existing test seam verifies only host callback wiring and adapter mapping, not the manager's real lifecycle; RCA/fix design should retain the CDP proof as the behavioral oracle.

## Publication Targets

- Work item comment: runner-generated from the validated Stage Result; no direct Plane API call was made.
- Work item links: none.
- Project Page dossier: none created by this worker.
- Wiki/doc collection: none.
- Repo artifact: `docs/harness/runs/PLANE-BLP-18/investigation.md`.
- Runtime traces: `docs/harness/runs/PLANE-BLP-18/trace/investigation/current-outliner-lifecycle.json`, `current-stale-caret-exit.png`, `manager-selection-contract.json`, `manager-selection-contract-timeout.json`, `native-comparison-timeout-current.json`, and retained `lifecycle-pre-timeout.json`.
- Runner-generated Publish Plan JSON: derived from the validated Stage Result by the outer Runner.
