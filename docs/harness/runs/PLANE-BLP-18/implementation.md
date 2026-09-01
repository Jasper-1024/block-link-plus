## Status

- State: Implementation
- Verdict: ready-for-review
- Task: BLP-18 — Outliner: dismiss stale wiki-link suggestions
- Contract: accepted `fix-design-review.md`

## Plane Reply

Implemented the accepted two-file fix. Eligible selection-only Outliner CM6
updates now reuse `onMaybeTriggerSuggest()`; document-changing updates retain
their exclusive first path. The targeted and full Jest suites, frozen-lockfile
install, type-checked production build, workflow check, post-reload lifecycle
proof, and cleanup-valid adjacent arrow regression are green.

The fresh task-owned runtime proved that valid `[[`/`[[s` suggestions stay open
and stale suggestions close after invalid query text, opener deletion, or
caret exit. The maintained EditorSuggest smoke also exercises the link path
successfully but fails its unrelated slash-suggestion assertion; that behavior
is outside this issue and did not taint the runtime. Code review should focus
on the exclusive document path and the three selection-only guards.

## Scope

This implementation stays within the accepted File Outliner EditorSuggest
lifecycle boundary:

- `createOutlinerEditorState()` selection-only update-listener behavior.
- Host-hook regression coverage at a mounted CodeMirror 6 `EditorView` seam.
- Existing `view.ts` focus/session gating and the existing
  `workspace.editorSuggest` manager remain authoritative for close versus
  preserve decisions.

Slash-command lifecycle, other suggestion providers, direct close fallbacks,
bridge behavior, native Obsidian code, structural edit/escape paths, and
malformed wiki-link forms beyond the accepted controls are out of scope.

## Changes Made

- Added an exclusive selection-only `else if` branch in
  `src/features/file-outliner-view/editor-state.ts`.
- The branch calls `onMaybeTriggerSuggest()` only when `selectionSet` is true,
  `isArrowNavDispatching()` is false, and
  `shouldPreserveArrowNavGoalOnce()` is false.
- Preserved the sync-suppression early return, document callback ordering,
  exactly-once document suggestion hook, goal-column reset logic, and existing
  manager/bridge code.
- Added a small test host factory and the accepted callback/guard matrix in
  `src/features/file-outliner-view/__tests__/editor-state.test.ts`.

## Tests Added Or Updated

- Updated `docChanged triggers host hooks` to include an explicit selection in
  the document-changing transaction and preserve the one suggestion-hook call
  invariant.
- Added `eligible selection-only updates trigger suggestions without a
  document change`.
- Added `sync suppression blocks document and selection suggestion lifecycle
  hooks`.
- Added independent parameterized coverage for custom arrow dispatch and
  one-shot arrow-goal preservation.

## Slice Evidence

| Slice | Mode | Before Command / Result | Change | After Command / Result | Refactor / Revalidation | Files Touched |
| --- | --- | --- | --- | --- | --- | --- |
| S-1 | `tdd` | Temporarily removed only the new listener branch, then ran `corepack pnpm test -- --runInBand src/features/file-outliner-view/__tests__/editor-state.test.ts` -> expected RED: eligible selection-only case received 0 suggestion-hook calls instead of 1; 8 passed, 1 failed. | Restored the guarded selection-only `else if` and kept the test host factory/matrix in the test file. | `corepack pnpm test -- --runInBand src/features/file-outliner-view/__tests__/editor-state.test.ts src/features/file-outliner-view/__tests__/editor-suggest-bridge.test.ts` -> 2 suites / 14 tests passed. | Full Jest, build, install, and workflow checks also passed; no behavior refactor. | `src/features/file-outliner-view/editor-state.ts`; `src/features/file-outliner-view/__tests__/editor-state.test.ts` |
| S-2 | `runtime-fix` | Accepted pre-fix trace `trace/implementation/pre-fix-caret-selection.json` -> `review-selection-red.js` reproduced stale state: `[[` at caret 2 opened, then caret 2 -> 0 left manager/container open. A fresh runtime check before final reload returned not-reproduced because the completed local bundle was already loaded; it is not used as pre-fix evidence. | Ran the production build, reloaded the built plugin through the task-owned CDP lease, prepared the Outliner fixture, and ran the bounded lifecycle proof. | `.tmp/PLANE-BLP-18/outliner-lifecycle-after-fix.js` -> `status: passed`, all 9 lifecycle checks passed; valid trigger/query states stayed open and invalid/caret-exit states closed. Screenshot captured at `trace/implementation/stale-caret-exit-after-fix.png`; maintained arrow regression passed with cleanup. | No source refactor or probe promotion. Final proof had no timeout or taint; the first arrow attempt’s cleanup-only fixture warning was repaired and rerun successfully. | Runtime proof plus the two implementation files above |

## Validation

Passed:

- `corepack pnpm install --frozen-lockfile` -> lockfile up to date; install
  completed with pnpm 9.15.9. The Node `url.parse()` deprecation warning was
  non-blocking.
- `corepack pnpm test -- --runInBand src/features/file-outliner-view/__tests__/editor-state.test.ts src/features/file-outliner-view/__tests__/editor-suggest-bridge.test.ts` -> 2 suites / 14 tests passed.
- `corepack pnpm test` -> 46 suites / 253 tests passed.
- `corepack pnpm run build-with-types` -> TypeScript and production esbuild
  passed.
- `node scripts/obsidian-cdp.js eval-file "scripts/cdp-snippets/regression/file-outliner/arrow-nav-e2e.js"` -> behavior passed and cleanup passed on the valid rerun.
- `corepack pnpm run agent:workflow-check` -> `agent workflow check passed`.
- `git diff --check` -> no whitespace errors.

Non-blocking adjacent validation note:

- `node scripts/obsidian-cdp.js eval-file "scripts/cdp-snippets/probes/file-outliner-editor-suggest.js"` passed link-suggestion opening, then failed `expected slash suggest to open on '/'`. It reported no timeout or taint. The final direct reload and the BLP-18 wiki-link lifecycle proof passed independently; slash lifecycle is outside scope.
- The first maintained arrow run returned behavior passed but cleanup failed
  because its fixture was not restored. The task-local leftover file was
  removed, the exact maintained command was rerun with the fixture pre-seeded,
  and it returned `status: passed` with `cleanup.status: passed`.

## Runtime Evidence

### Identity and lease

- Task key: `BLP-18`
- Source issue: `Outliner: dismiss stale wiki-link suggestions`
- Archive key: `PLANE-BLP-18`
- Worktree: `C:\Users\stati\Documents\Codex\2026-06-13\hermes\outputs\plane-symphony-like-demo\workspaces\PLANE-BLP-18`
- Branch: `symphony/PLANE-BLP-18`
- CDP title boundary: `blp-BLP-18`
- CDP port: `19227`, from the task lease
- Matching page targets: exactly one at `app://obsidian.md/index.html`
- Vault: `blp-BLP-18`
- Active view: `blp-file-outliner-view`
- Plugin: `block-link-plus` `2.0.17`
- Obsidian: `1.13.7`, from the page title
- Focus: Outliner CM6 editor reported `hasFocus: true`

Because tracker feedback required a new instance after the previous runtime
was cleared, the root called
`blp_control_plane.ensure_runtime({ fresh: true, ... })`. The lease returned
ready with the expected identity and port. No direct Obsidian launcher or
explicit port override was used.

### Build, reload, and proof commands

1. `corepack pnpm run build-with-types` -> passed.
2. Direct task-lease reload:
   `node scripts/obsidian-cdp.js eval "(async()=>{const pluginId='block-link-plus'; await app.plugins.disablePlugin(pluginId); await app.plugins.enablePlugin(pluginId); await new Promise((resolve)=>setTimeout(resolve,250)); return {reloaded:true};})()"` -> `reloaded: true`, expected vault/view/plugin/title.
3. Fixture setup:
   `node scripts/obsidian-cdp.js eval-file ".tmp/PLANE-BLP-18/setup-current-runtime.js"` -> `status: ready`, focused Outliner editor.
4. Post-fix proof:
   `node scripts/obsidian-cdp.js eval-file ".tmp/PLANE-BLP-18/outliner-lifecycle-after-fix.js"` -> `status: passed`, `failures: []`.
5. Screenshot:
   `docs/harness/runs/PLANE-BLP-18/trace/implementation/stale-caret-exit-after-fix.png`.
6. Structured report:
   `docs/harness/runs/PLANE-BLP-18/trace/implementation/outliner-lifecycle-after-fix.json`.

### Resolution proof

The post-reload report recorded these settled manager/DOM states:

| Scenario | Document / caret | Result |
| --- | --- | --- |
| Trigger open | `[[` / 2 | Open with 4 visible items |
| Valid query | `[[s` / 3 | Open with 1 visible item |
| Closing bracket | `[[s]` / 4 | Closed; no visible container |
| Opening-bracket deletion | `s` / 1 | Closed; no visible container |
| Caret inside trigger | `[[` / 1 | Closed; no visible container |
| Caret at trigger endpoint | `[[` / 2 | Open with 4 visible items |
| Valid query after selection-only reevaluation | `[[s` / 2 and 3 | Open with visible items at both positions |
| Stale caret exit | `[[` / 0 after 2 -> 0 | Closed; no visible container |

The final proof emitted no `slow`, timeout, identity, or taint event. An earlier
maintained arrow attempt did emit a cleanup-only taint because its fixture was
not deleted; this task-local file was explicitly removed and the exact
regression was rerun with cleanup passing. The prior historical timeout traces
are retained as discarded evidence and were not reused for the final result.

## Files Changed

Implementation patch:

- `src/features/file-outliner-view/editor-state.ts`
- `src/features/file-outliner-view/__tests__/editor-state.test.ts`

Canonical/evidence artifacts updated or generated:

- `docs/harness/runs/PLANE-BLP-18/implementation.md`
- `docs/harness/runs/PLANE-BLP-18/trace/implementation/outliner-lifecycle-after-fix.json`
- `docs/harness/runs/PLANE-BLP-18/trace/implementation/stale-caret-exit-after-fix.png`

The expanded lifecycle probe remains temporary under `.tmp/PLANE-BLP-18/`.
No package metadata, generated source, maintained CDP snippet, `view.ts`, or
`editor-suggest-bridge.ts` was changed.

## Risks / Open Questions

- The unit seam proves host-hook routing and guard exclusions; the runtime
  proof proves the manager/DOM close-versus-preserve behavior. No private
  manager state was used as the unit-test contract.
- The maintained slash-suggestion failure is an adjacent existing behavior
  issue and should be tracked separately if required; it does not contradict
  this accepted wiki-link fix.
- No accepted product or architecture question remains open for this slice.

## Decision

Use `ready-for-review`. The accepted two-file implementation exists, S-1 has
genuine RED/GREEN evidence, S-2 has valid post-build/post-reload Obsidian
proof on the fresh task-owned runtime, targeted and broad validation pass, and
the only non-passing command is an explicitly out-of-scope slash-suggestion
assertion.
