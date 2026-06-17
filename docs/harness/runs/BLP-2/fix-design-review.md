## Status

- Verdict: accepted

## Plane Reply

Accepted. The proposed design follows the accepted BLP-2 RCA and is bounded to the Live Preview inline-edit leaf-switch/remount failure.

Implementation should add the `InlineEditEngine` visible-return rescan only: track whether an already-observed MarkdownView was last shown, and when it transitions hidden -> shown, queue the existing `.internal-embed.markdown-embed` DOM through the current observer processing path. Do not disable hidden cleanup, do not force-rescan every layout change as the first implementation, and do not pull Reading View, undo, context-menu, or bottom-padding symptoms into this child issue.

After implementation, the gate is the focused observer unit test, the new fixed-port CDP leaf-switch regression, adjacent inline-edit shell snippets, full tests, and typed build.

## Accepted Design Points

- The design keeps scope aligned with BLP-2: Live Preview host A -> host B -> return to host A without reopening host A.
- The source ownership is correct. `src/features/inline-edit-engine/InlineEditEngine.ts:111-122` handles `layout-change` with non-forced observer refresh followed by hidden cleanup; `:876-884` detaches hidden managed embeds; `:977-982` skips unchanged already-observed roots when not forced; `:1034-1040` queues existing embed DOM only on observer creation/recreation.
- The remount path is the right layer. `InlineEditEngine.ts:1641-1649` already cleans orphaned shell state and skips already-mounted or pending embeds, so requeueing existing DOM is intended to be idempotent.
- Hidden cleanup remains in place, which preserves the lifecycle-safety requirement rather than masking the bug by leaking detached editor leaves.
- The CodeMirror/undo path is correctly excluded. This design does not rely on `transactionFilter`, `transactionExtender`, state fields, effects, or history interception.
- OpenSpec is not required for this fix as designed. The change restores existing `inline-editing-embeds` Live Preview behavior and does not add a capability, setting, API, or intended behavior.

## Challenges

- The hidden-to-shown tracking must update `lastShown` on every unchanged-root, non-forced observer pass, including the hidden pass before `cleanupHiddenEmbeds()` detaches the inline-edit leaf/root.
- The implementation must not only update `lastShown` when queuing. It must also record hidden state when `currentShown` is false, otherwise the return-to-visible edge can be missed.
- The helper around `containerEl.isShown()` must keep runtime semantics tied to Obsidian's `isShown()` behavior. Any fallback should exist for tests/mocked DOM only and must not make production treat hidden tabs as visible.
- `queueExistingLivePreviewEmbeds()` must preserve the current nested-embed guard and schedule only when it added candidates.
- The unit test should prove all three states: unchanged visible view does not requeue, hidden state is remembered, and hidden -> shown requeues the existing native embed shell.
- The CDP regression must prove the fixed behavior directly. It should fail if A after return needs a manual `refreshLivePreviewObservers(true)` repair.

## Required Revisions

- None before implementation.

Implementation-stage clarifications:

- Keep the first patch to `InlineEditEngine.ts` plus focused tests/CDP regression unless the code itself proves another file is necessary.
- Initialize `lastShown` for new or force-recreated observer entries and reuse the same queue helper for initial/forced scans.
- Assert exact host/root counts in the CDP regression: one `.blp-inline-edit-host` and one `.blp-inline-edit-root` for host A after return.
- The promoted CDP snippet should restore plugin settings and avoid accumulating extra tabs/leaves when practical.

## Implementation Readiness

- Ready for implementation.
- Smallest accepted source scope: `src/features/inline-edit-engine/InlineEditEngine.ts`.
- Expected regression scope: a focused observer unit test, plus `scripts/cdp-snippets/inline-edit-embed-leaf-switch-remount.js`.
- Existing code supports the design's idempotency claim through `cleanupOrphanedShell()`, already-mounted root detection, and the `pendingEmbeds` weak set.
- Read-only review CDP snapshot on port `19225` found hidden markdown tab leaves still enumerated by `app.workspace.getLeavesOfType("markdown")` with `containerShown=false`, which supports the design's hidden-to-shown transition model for the reproduced tab/leaf switch.

## Validation Coverage

Required implementation validation:

- `corepack pnpm test -- InlineEditEngine.live-preview-observer`
- `corepack pnpm test`
- `corepack pnpm run build-with-types`
- Fixed-port runtime per `docs/agent/cdp-validation.md` on `19225`.
- `node scripts/obsidian-cdp.js eval-file "scripts/cdp-snippets/inline-edit-embed-leaf-switch-remount.js"`
- `node scripts/obsidian-cdp.js eval-file "scripts/cdp-snippets/inline-edit-embed-jump-affordance.js"`
- `node scripts/obsidian-cdp.js eval-file "scripts/cdp-snippets/inline-edit-embed-bottom-padding.js"`

Review checks performed:

- Read required stage inputs: top-level agent docs, evidence/CDP docs, BLP-2 investigation, RCA review, fix design, and issue context.
- Verified OpenSpec gate with `openspec list`, `openspec list --specs`, `docs/agent/openspec-gates.md`, and `openspec/specs/inline-editing-embeds/spec.md`.
- Verified source references in `InlineEditEngine.ts`, `EmbedLeafManager.ts`, existing inline-edit tests, and current inline-edit CDP snippets.
- Ran a read-only CDP state snapshot against the existing fixed-port BLP runtime to check markdown leaf enumeration and visibility flags.

## Risks / Open Questions

- The design is accepted for the reproduced hidden tab/leaf switch. Split panes where both leaves remain visible should not need this repair, and close/reopen paths should be covered by observer recreation, but the CDP regression should keep the exact BLP-2 A -> B -> A case as the acceptance target.
- If implementation discovers Obsidian does not emit the expected layout refresh in a relevant variant, stop and revise the design instead of broadening silently to force every layout change.
- The previous `.tmp/blp2-inline-edit-leaf-switch-repro.js` referenced in earlier artifacts is not present in this worktree, so implementation should recreate/promote a maintained snippet rather than depend on that temp file.
- The current debug runtime had several leftover markdown leaves from prior probes. That does not block design acceptance, but the new regression should minimize residue so repeated validation remains interpretable.

## Decision

Accepted. The design is specific, follows the accepted RCA, stays within the BLP-2 child scope, uses the existing inline-edit observer/remount owner layer, and has a validation plan that can prove the bug is fixed without relying on manual forced rescan.

Proceed to implementation with the narrow visible-return rescan, focused unit coverage, the promoted fixed-port CDP leaf-switch regression, adjacent inline-edit shell checks, full tests, and typed build.
