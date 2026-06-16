## Status

- Verdict: accepted

## Plane Reply

Accepted. The scoped RCA is strong enough to leave the RCA loop for BLP-2.

The hard runtime fact is that host A returns as a connected, `is-loaded` native embed after the A -> B -> A leaf switch, but it no longer has `.blp-inline-edit-root`, `.blp-inline-edit-host`, or `.blp-inline-edit-active`. A non-forced observer refresh does not restore it, while `refreshLivePreviewObservers(true)` does. Static source evidence matches that runtime behavior: hidden-leaf cleanup detaches the managed inline-edit leaf/root, and the normal layout refresh skips an already-observed MarkdownView when the source-view root is unchanged.

This review does not accept any broader GitHub #33 symptoms into this child issue. Reading View over-render, undo overflow, context-menu dismissal, and bottom padding remain separate scopes.

## Accepted Facts

- Context is sufficient. `docs/agent/runs/BLP-2/context/source-issue.md` contains the full upstream GitHub #33 claim and the child scope for the leaf-switch lifecycle/remount failure.
- The issue is `cdp-required`; the prior investigation used the fixed Obsidian/CDP runtime on port `19225`, and this review independently rechecked that target.
- Review runtime check: `$env:OB_CDP_PORT='19225'; $env:OB_CDP_TITLE_CONTAINS=' - blp - '; node scripts/obsidian-cdp.js list` found the isolated BLP Obsidian target, title `blp2-switch-host-a - blp - Obsidian 1.12.4`.
- Review repro check: `node scripts/obsidian-cdp.js eval-file ".tmp/blp2-inline-edit-leaf-switch-repro.js"` returned `ok: true`, plugin version `2.0.15`, and `forcedRescanRestored: true`.
- The repro states showed:
  - `A before switch`: connected loaded embed with `.blp-inline-edit-active`, `.blp-inline-edit-root`, and `.blp-inline-edit-host`.
  - `A returned without reopen`: connected loaded embed with all three inline-edit markers absent.
  - `A after non-forced refresh`: markers still absent.
  - `A after force rescan`: all three inline-edit markers restored.
- `src/features/inline-edit-engine/InlineEditEngine.ts:110` registers a `layout-change` callback that calls `refreshLivePreviewObservers()` without `forceRescan`, then `cleanupHiddenEmbeds()`.
- `src/features/inline-edit-engine/InlineEditEngine.ts:876` detaches active managed embeds whose container is disconnected or no longer shown.
- `src/features/inline-edit-engine/InlineEditEngine.ts:977` skips an already-observed `MarkdownView` when the root element is unchanged and `forceRescan` is false.
- `src/features/inline-edit-engine/InlineEditEngine.ts:1034` queues existing `.internal-embed.markdown-embed` DOM only when an observer is created or recreated, which is why a forced rescan can remount the inline editor.
- `src/features/inline-edit-engine/InlineEditEngine.ts:1497` and `src/features/inline-edit-engine/EmbedLeafManager.ts:107` establish the `.blp-inline-edit-host` and `.blp-inline-edit-root` markers that disappear during cleanup.

## Challenges

- The prior investigation's owner-layer claim survives review: this is in the `InlineEditEngine` Live Preview observer/remount lifecycle, not in parsing, block-reference resolution, or source content.
- The phrase "layout-change calls refresh before cleanup" should be treated as a source fact, but the user-visible break is proven by the combined lifecycle: cleanup can remove inline-edit state from a hidden leaf, and the already-observed view is not forced to rescan existing embed DOM when it becomes visible again.
- The exact production fix trigger is not decided in this stage. Runtime evidence proves that a forced rescan restores the broken state; it does not by itself prove whether implementation should force every layout-change, only the active returned leaf, or another narrower lifecycle point.
- The Obsidian version mismatch is not a blocker. The original report named Obsidian `1.12.7` on Ubuntu, while the repo runtime is Obsidian `1.12.4` on this Windows host. The scoped failure reproduces in the repo-owned runtime, which is sufficient for RCA acceptance.

## Evidence Gaps

- No blocking RCA evidence gaps remain.
- Non-blocking design-stage gap: choose and justify the narrowest remount trigger so the implementation does not create unnecessary observer churn or double-mount behavior.
- Non-blocking validation gap: after implementation, the A -> B -> A return scenario needs to become a reusable regression check, not remain only a one-off `.tmp` probe.

## Required Investigation Follow-up

- None for the RCA loop.
- The next stage may proceed to fix design for BLP-2 only.
- The fix-design stage must keep the scope limited to the Live Preview file/leaf-switch remount failure and must not fold in Reading View, undo overflow, context-menu dismissal, or bottom-padding behavior.

## Decision

The RCA is accepted because it has matching issue scope, runtime reproduction, runtime contrast between non-forced and forced observer refresh, and source-level explanation for why the visible returned leaf is not remounted.

This is complete enough for a later fix-design stage. The accepted RCA is: hidden-leaf cleanup removes BLP's inline-edit host/root state from the previously viewed file's native embed shell, and the subsequent non-forced Live Preview observer refresh does not rescan already-existing embed DOM for that MarkdownView. A forced rescan queues the existing embed DOM and restores the inline editor.

## Research Notes

- OpenSpec path: direct bug restoration. `docs/agent/openspec-gates.md` says OpenSpec is for changed intended behavior; this task restores existing inline-edit Live Preview behavior.
- Expected behavior reference: `openspec/specs/inline-editing-embeds/spec.md` requires inline-edit mounting for standard Live Preview embeds and lifecycle-safe cleanup during mode/DOM changes.
- Stage files read: `AGENTS.md`, `WORKFLOW.md`, `docs/agent/index.md`, `docs/agent/evidence-format.md`, `docs/agent/cdp-validation.md`, `docs/agent/stages/rca-review.md`, `docs/agent/runs/BLP-2/context/source-issue.md`, `docs/agent/runs/BLP-2/context/issue-context.json`, and `docs/agent/runs/BLP-2/investigation.md`.
- Later-stage artifacts `fix-design.md`, `fix-design-review.md`, `implementation.md`, and `code-review.md` were not present in this worktree, which is consistent with this being the RCA-review gate.
- No product source, tests, package metadata, generated files, CDP snippets, or OpenSpec specs were edited in this review.

## Risks / Open Questions

- The implementation may be tempted to force-rescan every layout change. That is plausible but not yet reviewed for performance, duplicate scheduling, or jump-affordance side effects.
- The one-off repro probe disables and re-enables the plugin to create a clean runtime, then restores settings. Promote or replace it with a maintained regression surface during implementation.
- Parent GitHub #33 is a cluster. This accepted RCA covers only BLP-2's lifecycle/remount failure after file switch.
