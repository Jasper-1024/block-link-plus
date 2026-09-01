## Status

- Verdict: accepted
- Review Snapshot: base `1cb246ef08b4f64d03749f95105a1cfc17d7d3f3`, review tree `21f3fafbbfa5077094ea70a31eeef59144618f99`, diff SHA-256 `608981fd83c7ec7edeaec612e04357ab58e8cb945eb518b0c73b260bdb335645`
- Freshness: the current worktree matches the pinned review tree on both changed paths; the three accepted contract hashes also match the snapshot.

## Plane Reply

The pinned two-file implementation satisfies the accepted BLP-18 contract and is ready for the Human Review merge gate. It routes eligible selection-only Outliner CodeMirror updates through the existing suggestion manager while preserving the exclusive document-change path and all accepted transition guards. Independent targeted/full Jest, production build, post-reload lifecycle, range-selection, and arrow-navigation checks passed. No blocking finding remains.

## Blocking Findings

None.

## Non-Blocking Risks

- Possible duplicated condition: the same `selectionSet`/arrow-guard predicate appears at `src/features/file-outliner-view/editor-state.ts:123-126` and `:133-136`. This is a heuristic smell only; the accepted design explicitly requires the existing goal-column reset block to remain unchanged, so no revision is required for this patch.
- The implementation report records an adjacent maintained EditorSuggest smoke failure for the unrelated slash-suggestion assertion. The accepted scope is wiki-link lifecycle only; the direct link lifecycle proof passed independently.
- The first independent `file-outliner-arrow-nav-e2e` invocation passed behavior but failed the runner cleanup contract because its temporary fixture was not pre-seeded. That result was discarded. The exact command was rerun with the fixture present and returned `status: passed` with `cleanup.status: passed`; the incident only changed the task-local runtime scene.

## Contract Compliance

### Spec / Contract axis

- `context/source-issue.md:14` requires stale wiki-link suggestions to close after invalid query text, opener deletion, or caret exit, while valid suggestions remain open, with isolated runtime verification and regression coverage.
- The accepted design review requires an exclusive document path and a guarded selection-only path (`fix-design-review.md:21-35, 41-44`). The patch implements that shape at `src/features/file-outliner-view/editor-state.ts:117-129`: document-changing updates call `onMaybeTriggerSuggest()` once, while selection-only updates require `selectionSet`, `!isArrowNavDispatching()`, and `!shouldPreserveArrowNavGoalOnce()`.
- The patch stays within the accepted two-file scope: `editor-state.ts` and its host-hook tests. It does not add direct closes, bridge changes, view changes, slash handling, or other provider behavior (`fix-design-review.md:89-121`). The existing `view.ts` focus/session gate and `workspace.editorSuggest` manager remain authoritative.
- Regression coverage at `editor-state.test.ts:71-161` proves the eligible selection-only hook, no `onDocChanged`, sync suppression, each arrow guard independently, and exactly one suggestion hook for a document-plus-selection transaction. Manager/DOM close-versus-preserve behavior is intentionally proven by the runtime package rather than private unit state, as required by the accepted design.
- Durable post-fix evidence at `trace/implementation/outliner-lifecycle-after-fix.json` and `stale-caret-exit-after-fix.png` covers `[[`, valid `[[s`, closing-bracket invalidation, opener deletion, caret 1 closure, caret 2 preservation, selection-only valid-query reevaluation, and caret 2 -> 0 closure. The review independently repeated the post-fix probe on the task-owned runtime and received `status: passed` with all nine checks passing.

No missing accepted scope, wrong-layer implementation, or scope expansion was found.

## Correctness And Standards

### Standards / Correctness axis

- No hard documented-standard breach was found under `AGENTS.md`, `docs/harness/guides/quality-gates.md`, `docs/harness/guides/tdd.md`, `docs/agents/domain.md`, or the package scripts. The TDD slice evidence is mode-appropriate, and the runtime-fix evidence repeats the accepted post-build lifecycle boundary.
- The new hook is routed through `onMaybeTriggerSuggest()` and therefore through the existing focus/session gate and manager entrypoint (`view.ts:1054-1091`, `editor-suggest-bridge.ts:419-448`); the listener does not directly close or mutate suggestion state.
- The existing custom-arrow and cross-block goal-preservation transitions remain excluded by the new branch (`editor-state.ts:123-128`). The maintained arrow regression passed on the cleanup-valid rerun, including goal-column movement and no-drift boundaries.
- An adversarial range-selection probe on `[[s` dispatched `{ anchor: 2, head: 3 }` and observed `currentOpen: false` with no visible container. This confirms that the accepted `selectionSet` contract can safely let the manager decide closure without adding an unapproved empty-selection guard.
- Independent validation passed: targeted Jest (`2 suites / 14 tests`), full Jest (`46 suites / 253 tests`), and `corepack pnpm run build-with-types`. `git diff --check` reported no whitespace errors.

## Validation Limitations

- `corepack pnpm install --frozen-lockfile` was reported green by implementation and was not rerun because the pinned patch changes no package metadata. The review reran `corepack pnpm run agent:workflow-check` after writing this artifact; it passed.
- The maintained smoke’s slash assertion remains unproved/failed as an adjacent behavior; it is outside the accepted wiki-link scope. No timeout or CDP taint was reported for that smoke.
- The first arrow-regression cleanup failure is retained as a runtime-process incident, not product evidence. After the fixture was pre-seeded, the exact maintained regression passed with clean cleanup. The final lifecycle probe emitted no `slow`, timeout, identity, or taint event.
- Runtime identity for the independent checks was unambiguous: one matching page target, title boundary `blp-BLP-18`, vault `blp-BLP-18`, active view `blp-file-outliner-view`, plugin `block-link-plus` `2.0.17`, Obsidian `1.13.7`, and focused Outliner CM6 editor on lease port `19227`.

## Required Revisions

None.

## Decision

Accepted. Both review axes pass against the current pinned snapshot, the accepted two-file boundary is preserved, deterministic checks are green, and the required post-reload Obsidian lifecycle proof is independently confirmed. Route the item to Human Review; a person still owns the final merge and release decision.
