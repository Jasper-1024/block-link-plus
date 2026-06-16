## Status

- State: Fix Design
- Verdict: ready-for-review
- Task: BLP-2 / [GitHub #33A] Inline Editing lifecycle/remount failure after file switch
- Workspace: `C:\Users\stati\Documents\Codex\2026-06-13\hermes\outputs\plane-symphony-like-demo\workspaces\BLP-2`
- Code changed: no product source, tests, package metadata, generated files, CDP snippets, or OpenSpec specs were edited in this stage. This artifact was created.
- Git status at design start: `?? docs/agent/runs/BLP-2/`

## Plane Reply

Ready for fix-design review.

Recommended implementation: keep the existing hidden-embed cleanup, but teach `InlineEditEngine` to notice when an already-observed Live Preview `MarkdownView` transitions from hidden back to shown and, at that moment, queue that view's existing `.internal-embed.markdown-embed` DOM for inline-edit processing. This remounts the stale native `is-loaded` shell after the host A -> host B -> host A switch without forcing every layout change, without touching Reading View, and without touching undo/CodeMirror transaction behavior.

The reviewer should attack two points: whether hidden-to-shown tracking covers tab, split, close, and reopen variants of the leaf switch, and whether the proposed CDP regression proves there is exactly one `.blp-inline-edit-host` / `.blp-inline-edit-root` after return.

## RCA Inputs Used

- `docs/agent/runs/BLP-2/context/source-issue.md`: child scope is only the Live Preview inline-edit lifecycle/remount failure after switching files/leaves.
- `docs/agent/runs/BLP-2/context/issue-context.json`: repeats the accepted forced-rescan hypothesis and requires real Obsidian/CDP evidence plus a return-to-previously-viewed-file regression check.
- `docs/agent/runs/BLP-2/investigation.md`: runtime probe showed host A returned as a connected `is-loaded` native embed with no `.blp-inline-edit-root`, `.blp-inline-edit-host`, or `.blp-inline-edit-active`; non-forced refresh did not repair it; `refreshLivePreviewObservers(true)` did.
- `docs/agent/runs/BLP-2/rca-review.md`: verdict accepted. No blocking RCA evidence gaps remain.
- `src/features/inline-edit-engine/InlineEditEngine.ts:110`: `layout-change` currently schedules `refreshLivePreviewObservers()` without `forceRescan`, then `cleanupHiddenEmbeds()`.
- `src/features/inline-edit-engine/InlineEditEngine.ts:876`: `cleanupHiddenEmbeds()` detaches managed embed leaves whose container is disconnected or not shown.
- `src/features/inline-edit-engine/InlineEditEngine.ts:977`: `ensureLivePreviewObserver()` skips an unchanged already-observed root when `forceRescan` is false.
- `src/features/inline-edit-engine/InlineEditEngine.ts:1034`: existing embed DOM is queued only when an observer is created or recreated.
- `src/features/inline-edit-engine/InlineEditEngine.ts:1641`: `processInlineEmbedWithOptions()` already cleans orphaned shell state and skips already-mounted roots, which makes requeueing existing embed DOM idempotent.
- `src/features/inline-edit-engine/InlineEditEngine.ts:1497` and `src/features/inline-edit-engine/EmbedLeafManager.ts:107`: these create the host/root markers that disappear when hidden-leaf cleanup runs.
- `openspec/specs/inline-editing-embeds/spec.md`: existing expected behavior covers Live Preview inline-edit mounting and lifecycle-safe cleanup. This design restores that behavior.

## Problem Boundary

- In scope: Live Preview block/heading/range inline-edit embeds where a previously viewed Markdown leaf/tab becomes hidden, its managed inline-edit leaf is cleaned up, and the same host file becomes visible again without Obsidian recreating the native embed DOM.
- Required user-visible result: after returning to host A, the existing native `.internal-embed.markdown-embed.is-loaded` shell must be taken over again, with `.blp-inline-edit-active`, one `.blp-inline-edit-host`, and one `.blp-inline-edit-root`.
- Out of scope: Reading View over-render, undo overflow, context-menu dismissal, persistent bottom padding, broad inline-edit parser changes, and File Outliner behavior.
- CodeMirror transaction path: the proposed fix does not depend on `transactionFilter`. It also does not need `transactionExtender`, because the accepted RCA is DOM observer/remount lifecycle, not an editor transaction or undo bypass path.

## Proposed Fix

Implement a narrow visible-return rescan in `src/features/inline-edit-engine/InlineEditEngine.ts`.

1. Extend `LivePreviewObserverEntry` with a visibility memory field, for example `lastShown: boolean`.
2. Add a small helper, for example `isMarkdownViewShown(view: MarkdownView): boolean`, that reads `view.containerEl.isShown()` and falls back conservatively only for test/mocked DOM environments.
3. Extract the existing queueing block at `InlineEditEngine.ts:1034` into a helper such as `queueExistingLivePreviewEmbeds(entry: LivePreviewObserverEntry): void`.
   - It should scan `entry.rootEl.querySelectorAll(".internal-embed.markdown-embed")`.
   - It should keep the existing `this.leaves.isNestedWithinEmbed(embed)` guard.
   - It should add candidates to `entry.pendingEmbeds`.
   - It should call `scheduleObserverEntry(entry)` when at least one candidate is queued.
4. In `ensureLivePreviewObserver(view, forceRescan = false)`, compute the current shown state after `rootEl` is found.
5. For the existing-root, non-forced path, replace the current early return with:
   - detect `becameShown = !existing.lastShown && currentShown`;
   - update `existing.lastShown = currentShown`;
   - if `becameShown`, call `queueExistingLivePreviewEmbeds(existing)`;
   - return.
6. For newly created or force-recreated entries, initialize `lastShown` and use the same queue helper instead of duplicating the `rootEl.querySelectorAll(...)` block.
7. Keep `cleanupHiddenEmbeds()` in place. Do not disable hidden cleanup to mask the bug.
8. Keep the `layout-change` callback's current refresh-before-cleanup order unless implementation evidence proves a different order is required. With visibility tracking, the refresh pass records that host A became hidden before cleanup removes its inline-edit host/root; the next refresh can then detect A becoming shown and queue the native shell for remount.

Why this shape is the smallest correct fix:

- The accepted runtime contrast proves that existing DOM queueing is sufficient to remount the editor.
- The parser, shell preparation, detached leaf creation, and cleanup are already capable of remounting when an embed enters `pendingEmbeds`.
- Requeueing on hidden-to-shown transition targets the missing lifecycle edge directly and avoids observer recreation on every layout event.
- Existing idempotency guards at `InlineEditEngine.ts:1641-1649` prevent duplicate mounting when the returned embed is already mounted or currently pending.

## Alternatives Considered

- Force `refreshLivePreviewObservers(true)` on every `layout-change`.
  - Rejected for first implementation because it recreates observers and queues every existing embed after ordinary layout churn. Runtime proves it repairs the bug, but it is broader than the evidence requires.
- Change `layout-change` to `cleanupHiddenEmbeds()` first, then force-rescan when cleanup detached anything.
  - Rejected as insufficient for variants where host B has no inline-edit embed to detach on return. The stale host A still needs a trigger when it becomes visible again.
- Stop detaching hidden embeds in `cleanupHiddenEmbeds()`.
  - Rejected because cleanup is part of the lifecycle safety requirement and prevents detached leaves/editors from leaking while their containers are hidden or disconnected.
- Repair from CodeMirror transaction filtering.
  - Rejected because this symptom occurs without a document transaction; regular `transactionFilter` would also be the wrong layer for undo-bypassed transactions. This design does not use transaction filters.
- Add a public remount API and call it from workspace events outside `InlineEditEngine`.
  - Rejected for this child issue because the existing observer pipeline already owns Live Preview embed discovery and processing.

## Implementation Notes

- Expected source change: `src/features/inline-edit-engine/InlineEditEngine.ts`.
- Expected test additions:
  - Prefer a new focused unit test file such as `src/features/inline-edit-engine/__tests__/InlineEditEngine.live-preview-observer.test.ts`.
  - Reuse the existing Obsidian mock `MarkdownView` and attach a mock `containerEl` with `.markdown-source-view` and `.internal-embed.markdown-embed`.
  - Use a toggleable `containerEl.isShown()` mock to simulate shown -> hidden -> shown.
  - Drive `(engine as any).refreshLivePreviewObservers(false)` with a fake `plugin.app.workspace.getLeavesOfType("markdown")`.
  - Assert that an unchanged visible view does not requeue existing embeds, but a hidden-to-shown transition does requeue the existing native embed shell.
  - Assert `forceRescan=true` still queues existing embeds for newly recreated observers.
- Existing shell tests in `src/features/inline-edit-engine/__tests__/InlineEditEngine.embed-shell.test.ts` should remain unchanged except if helper visibility setup belongs there; they already cover native shell preservation and cleanup behavior.
- Promote the one-off `.tmp/blp2-inline-edit-leaf-switch-repro.js` into a maintained CDP regression snippet, for example `scripts/cdp-snippets/inline-edit-embed-leaf-switch-remount.js`.
  - The promoted snippet should assert the post-fix behavior directly instead of manually calling `refreshLivePreviewObservers(true)` to repair the DOM.
  - Required assertions: A before switch has active/root/host; A after return without reopening has active/root/host; host/root counts are exactly one; visible text is the target block; settings are restored.
  - The old forced-rescan contrast can remain as diagnostic comments or a separate failure message, but the regression must fail if return-to-A requires manual force.
- Do not include Reading View, undo, context menu, or bottom-padding assertions in the new BLP-2 regression. Run adjacent existing snippets separately as regression coverage.

## Validation Plan

Implementation-stage validation should run:

- `corepack pnpm install --frozen-lockfile` if dependencies are not already prepared in the implementation worktree.
- `corepack pnpm test -- InlineEditEngine.live-preview-observer`
- `corepack pnpm test`
- `corepack pnpm run build-with-types`
- Fixed-port runtime setup per `docs/agent/cdp-validation.md`:
  - `$env:OB_CDP_PORT='19225'`
  - `$env:OB_CDP_TITLE_CONTAINS=' - blp - '`
  - `node scripts/obsidian-cdp.js list`
  - if not reachable, `powershell -NoProfile -ExecutionPolicy Bypass -File scripts/start-obsidian-debug-env.ps1 -Port 19225`
- New CDP regression:
  - `node scripts/obsidian-cdp.js eval-file "scripts/cdp-snippets/inline-edit-embed-leaf-switch-remount.js"`
- Adjacent inline-edit smoke checks:
  - `node scripts/obsidian-cdp.js eval-file "scripts/cdp-snippets/inline-edit-embed-jump-affordance.js"`
  - `node scripts/obsidian-cdp.js eval-file "scripts/cdp-snippets/inline-edit-embed-bottom-padding.js"`

Acceptance criteria:

- The new unit test proves non-forced observer refresh requeues existing embed DOM only after the observed view returns from hidden to shown.
- The new CDP snippet proves host A remounts after A -> B -> A without reopening host A and without manual forced refresh.
- Existing jump-affordance and bottom-padding snippets still pass, because this change touches inline-edit shell lifecycle.
- `corepack pnpm test` and `corepack pnpm run build-with-types` pass.

## OpenSpec Gate

- OpenSpec proposal required: no.
- Reason: this is a direct bug fix restoring the existing `inline-editing-embeds` Live Preview lifecycle behavior. It does not add a new capability, setting, API, or intended behavior.
- Checks performed:
  - Read `openspec/AGENTS.md`.
  - Read `docs/agent/openspec-gates.md`.
  - Read `openspec/specs/inline-editing-embeds/spec.md`.
  - Ran `openspec list`; active listed changes are marked complete and none owns this BLP-2 lifecycle repair.
  - Ran `openspec list --specs`; `inline-editing-embeds` is the relevant accepted capability.
  - Searched `openspec/changes` and `openspec/specs` for inline-edit/Live Preview overlap; no pending unaccepted change should block this fix.
- Implementation must stop and request an OpenSpec proposal only if it changes intended behavior beyond remounting Live Preview inline-edit embeds after a file/leaf switch.

## Risks / Open Questions

- The design relies on Obsidian emitting `layout-change` for the tab/leaf visibility transition. The accepted RCA and runtime probe observed that path, but the design reviewer should still challenge split-pane and close-tab variants.
- `HTMLElement.isShown()` is an Obsidian-provided helper, not a standard DOM API. The implementation should avoid making unit tests depend on a browser-native method that JSDOM does not provide.
- Queuing existing DOM on visible return must not create duplicate hosts. The existing `processInlineEmbedWithOptions()` guards should prevent this, but the unit/CDP assertions must prove exact host/root counts.
- The debug runtime used during RCA was Obsidian `1.12.4` on Windows, while the original report named Obsidian `1.12.7` on Ubuntu. Because the scoped bug reproduced in the repo-owned runtime, this is not a design blocker; cross-platform confirmation can remain release validation.
- The pnpm wrapper form `corepack pnpm run obsidian:debug-env -- -Port 19225` mis-forwarded `--` in the investigation shell. The direct PowerShell launcher is acceptable for runtime validation if the wrapper still fails.

## Decision

Proceed to adversarial fix-design review with a narrow `InlineEditEngine` visible-return rescan design. If accepted, the implementation worker should add the `lastShown`/queue-helper lifecycle patch, add a focused observer unit test, promote the leaf-switch CDP regression, and validate with fixed-port Obsidian/CDP plus the adjacent inline-edit shell snippets.
