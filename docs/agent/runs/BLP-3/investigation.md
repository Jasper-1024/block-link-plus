## Status

- State: Middle-flow
- Task: `BLP-3` / `[GitHub #33B] Inline Editing Enter+undo visible range overflow`
- Workspace: `C:\Users\stati\Documents\Codex\2026-06-13\hermes\outputs\plane-symphony-like-demo\workspaces\BLP-3` on branch `symphony/BLP-3`
- Code changes: none

## Scope

- Classification: confirmed bug, already partitioned from GitHub `#33`
- In scope:
  - Live Preview inline-edit block embeds created from `![[...#^alpha1]]`
  - `Enter` inside the embedded list block, then `Ctrl+Z`
  - CM6 visible/editable range maintenance after line-count-changing transactions
- Out of scope:
  - `#33A` bottom padding
  - `#33` file reopen/lifecycle symptom, context-menu symptom, and Reading View over-render
  - `#36` scroll/lifecycle work
  - implementation or test edits in this stage

## Evidence

- Issue claim:
  - After inserting a child line inside an inline-edit embed and undoing it, the source text returns to the original value but the embed still expands into the following paragraph block.
- Static evidence:
  - Detached inline-edit embed editors are forced to carry `editBlockExtensions()` through `ensureEmbedEditorExtensions()` in [src/features/inline-edit-engine/InlineEditEngine.ts](C:\Users\stati\Documents\Codex\2026-06-13\hermes\outputs\plane-symphony-like-demo\workspaces\BLP-3\src\features\inline-edit-engine\InlineEditEngine.ts:232).
  - Initial visible/editable ranges are resolved and injected with `contentRange` / `editableRange` annotations when the embed mounts in [src/features/inline-edit-engine/InlineEditEngine.ts](C:\Users\stati\Documents\Codex\2026-06-13\hermes\outputs\plane-symphony-like-demo\workspaces\BLP-3\src\features\inline-edit-engine\InlineEditEngine.ts:1758).
  - The only range-maintenance path that updates line ranges after doc line-count changes is `preventModifyTargetRanges` in [src/shared/utils/codemirror/selectiveEditor.ts](C:\Users\stati\Documents\Codex\2026-06-13\hermes\outputs\plane-symphony-like-demo\workspaces\BLP-3\src\shared\utils\codemirror\selectiveEditor.ts:231). Its inside-range branch is at lines `286-304`.
- Runtime evidence:
  - CDP preflight passed on 2026-06-15:
    - `corepack pnpm install --frozen-lockfile`
    - `node -e "require.resolve('ws'); console.log('ws-ok')"`
    - `corepack pnpm run build-with-types`
    - `corepack pnpm run obsidian:debug-env`
    - Launcher returned `status: ready`, `port: 19226`, `blockLinkPlusLoaded: true`.
  - Fresh runtime repro in the disposable vault used `_blp_tmp/issue-inline-source-probe2.md` and `_blp_tmp/issue-inline-host-probe2.md`.
  - Before `Enter`:
    - CM doc lines: `14`
    - inline-edit range state: `[5, 9]`
    - visible embed text: only `Alpha parent block` plus the two children
    - leaked paragraph absent
  - After `Enter`:
    - CM doc lines: `15`
    - range state becomes `[5, 10]`
    - inserted child line is visible
    - leaked paragraph still absent
  - After `Ctrl+Z`:
    - source text returns to the original file content
    - CM doc lines return to `14`
    - range state stays `[5, 10]` instead of shrinking back
    - visible embed leaks `Paragraph block for regular embed ^para1`
  - A follow-up probe on the leaked state ran `requestMeasure()` and no-op dispatches. None of them changed the range back from `[5, 10]`, and none removed the leaked paragraph.
- RCA gap closure:
  - Required gap: prove the exact failing mapping/update branch instead of stopping at "DOM overflow after undo".
  - Closure: a `cm.dispatchTransactions` probe on a fresh `_probe3` run showed:
    - `Enter` transaction: `isInput=true`, `touchesInside=true`, `numberNewLines=1`, expected end line `10`, actual end line `10`
    - `Undo` transaction: `isUndo=true`, `touchesInside=true`, `numberNewLines=-1`, expected end line `9`, actual end line `10`
  - This proves the failing path is the inside-range line-count update path, not initial mount range resolution.
- Commands run:
  - `git status --short`
  - `corepack pnpm install --frozen-lockfile`
  - `node -e "require.resolve('ws'); console.log('ws-ok')"`
  - `corepack pnpm run build-with-types`
  - `corepack pnpm run obsidian:debug-env`
  - `$env:OB_CDP_PORT='19226'; $env:OB_CDP_TITLE_CONTAINS=' - blp - '; node scripts/obsidian-cdp.js list`
  - `$env:OB_CDP_PORT='19226'; $env:OB_CDP_TITLE_CONTAINS=' - blp - '; node scripts/obsidian-cdp.js eval-file "scripts/cdp-snippets/debug-inline-edit-system-line.js"`
  - `$env:OB_CDP_PORT='19226'; $env:OB_CDP_TITLE_CONTAINS=' - blp - '; node scripts/obsidian-cdp.js eval <PowerShell here-string repro/instrumentation probes>`
- Files inspected:
  - `docs/agent/runs/BLP-3/context/source-issue.md`
  - `docs/agent/runs/BLP-3/context/issue-context.json`
  - `AGENTS.md`
  - `WORKFLOW.md`
  - `docs/agent/index.md`
  - `docs/agent/stages/investigation.md`
  - `docs/agent/evidence-format.md`
  - `docs/agent/cdp-validation.md`
  - [src/shared/utils/codemirror/selectiveEditor.ts](C:\Users\stati\Documents\Codex\2026-06-13\hermes\outputs\plane-symphony-like-demo\workspaces\BLP-3\src\shared\utils\codemirror\selectiveEditor.ts:231)
  - [src/features/inline-edit-engine/InlineEditEngine.ts](C:\Users\stati\Documents\Codex\2026-06-13\hermes\outputs\plane-symphony-like-demo\workspaces\BLP-3\src\features\inline-edit-engine\InlineEditEngine.ts:232)
  - [src/features/inline-edit-engine/InlineEditEngine.ts](C:\Users\stati\Documents\Codex\2026-06-13\hermes\outputs\plane-symphony-like-demo\workspaces\BLP-3\src\features\inline-edit-engine\InlineEditEngine.ts:1758)

## Root Cause

- Owner layer:
  - inline-edit embed selective-range maintenance in CM6, specifically the undo path through `preventModifyTargetRanges`
- Exact files/functions/selectors:
  - `preventModifyTargetRanges` in [src/shared/utils/codemirror/selectiveEditor.ts](C:\Users\stati\Documents\Codex\2026-06-13\hermes\outputs\plane-symphony-like-demo\workspaces\BLP-3\src\shared\utils\codemirror\selectiveEditor.ts:231)
  - initial range injection in [src/features/inline-edit-engine/InlineEditEngine.ts](C:\Users\stati\Documents\Codex\2026-06-13\hermes\outputs\plane-symphony-like-demo\workspaces\BLP-3\src\features\inline-edit-engine\InlineEditEngine.ts:1766)
  - leaked DOM surface: `.internal-embed.markdown-embed.blp-inline-edit-active .cm-line`
- Why this explains the evidence:
  - Fresh mount is correct: the embed starts at `[5, 9]` and hides the following paragraph.
  - `Enter` inside the visible block changes doc lines from `14` to `15` and expands the end line from `9` to `10`. That matches the inside-range branch in `preventModifyTargetRanges`.
  - `Undo` reverses the exact line-count change inside the same visible block. Runtime logging proved `touchesInside=true` and `numberNewLines=-1`, so the same branch should reduce the end line back to `9`.
  - The undo transaction leaves both tracked ranges at `[5, 10]`, so the paragraph line remains inside the visible range and leaks into the inline-edit DOM.
  - `requestMeasure()` and no-op dispatches do not repair the state, so this is not just a transient paint/height bug. The visible/editable range state itself remains too large after undo.
- Cluster split, if any:
  - This artifact only closes `#33B` Enter + undo overflow. Other `#33` symptoms remain separate sub-bugs.

## Fix Plan

- Proposed change:
  - Make the inside-range line-count adjustment survive undo/history transactions in `preventModifyTargetRanges`.
  - Add a bounded regression for `Enter -> Ctrl+Z` restoring the inline-edit range end back to the pre-Enter value.
  - Safest first target: the annotation/effect update path used by `preventModifyTargetRanges`. The file already defines the effect-based API (`setEditableRange` / `setContentRange`), so the implementation agent should verify whether the current annotation-only update is being ignored on undo and switch to the smallest path that keeps undo shrink working.
- Files expected to change:
  - `src/shared/utils/codemirror/selectiveEditor.ts`
  - a targeted regression test near `src/shared/utils/codemirror/__tests__/` or the inline-edit-engine test area
- Why this is the smallest correct fix:
  - Initial mount is already correct.
  - `Enter` growth is already correct.
  - The failure is bounded to the undo shrink path for a line-count-changing edit inside the current visible range.
- Risks:
  - `preventModifyTargetRanges` also protects other selective-editor cases, so the fix must not regress insert-before-range, delete, or move behavior.
  - If the problem is deeper than the annotation carrier, a naive change could fix undo here while breaking other history composition paths.

## Validation Plan

- Targeted tests:
  - Add a CM6 regression that starts from visible/editable range `[5, 9]`, applies the Enter split change inside the range, then applies the undo transaction, and asserts the end line returns to `9`.
- Full tests/build:
  - `corepack pnpm test`
  - `corepack pnpm run build-with-types`
- CDP/runtime checks:
  - Re-run the disposable-vault probe and verify:
    - before `Enter`: range `[5, 9]`, no leaked paragraph
    - after `Enter`: range `[5, 10]`
    - after `Ctrl+Z`: range `[5, 9]`, no leaked paragraph
  - Re-run `scripts/cdp-snippets/debug-inline-edit-system-line.js`
  - Re-run adjacent inline-edit regression `scripts/cdp-snippets/inline-edit-embed-jump-affordance.js`
- Manual checks:
  - Repeat the same Enter/undo path in Live Preview on a block embed whose source note contains a following paragraph block.

## Open Questions / Risks

- Unproved detail:
  - The runtime evidence proves the undo transaction satisfies the inside-range branch conditions and still leaves the end line too large. It does not yet prove the exact internal discard point, meaning whether the returned annotation spec is dropped during undo composition or applied and then overwritten later.
- No implementation files or tests were changed in this run.
- `corepack pnpm test` was not run during this investigation-only stage.
- `docs/agent/runs/BLP-3/rca-review.md` did not exist in this worktree at run start, so this artifact answers the tracker-level evidence gap directly.
