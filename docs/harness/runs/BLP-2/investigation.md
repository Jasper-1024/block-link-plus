## Status

- State: Middle-flow / RCA ready
- Task: BLP-2 / [GitHub #33A] Inline Editing lifecycle/remount failure after file switch
- Workspace: `C:\Users\stati\Documents\Codex\2026-06-13\hermes\outputs\plane-symphony-like-demo\workspaces\BLP-2`
- Stage: runtime investigation
- Git status at start: `?? docs/agent/runs/BLP-2/`
- Code changed: no product source, tests, package metadata, generated files, CDP snippets, or OpenSpec specs were edited. This artifact was updated. A temporary ignored probe was kept under `.tmp/`.

## Scope

- Classification: confirmed bug in the scoped GitHub #33 child issue.
- In scope: Live Preview inline-edit embed lifecycle after opening host A, opening host B in another leaf/tab, then returning to host A without reopening host A from disk.
- Out of scope: Reading View over-render, undo overflow, context-menu dismissal, persistent bottom padding, and jump-affordance changes except as adjacent regression risks.
- Context status: `docs/agent/runs/BLP-2/context/source-issue.md` and `docs/agent/runs/BLP-2/context/source-issue.json` contain the full GitHub issue claim; this is not Context Blocked.
- Prior RCA artifacts: `docs/agent/runs/BLP-2/rca-review.md` was absent/empty. The source snapshot names `docs/agent/runs/BLP-1/rca-review.md`, but that file is not present in this worktree, so this run relies on the current source snapshot and fresh runtime evidence.

## Evidence

- Issue claim: `docs/agent/runs/BLP-2/context/source-issue.md` scopes this child issue to the leaf-switch lifecycle/remount failure. The claimed symptom is an `is-loaded` embed shell that loses both `.blp-inline-edit-root` and `.blp-inline-edit-host` after returning to host A without reopening the file.
- Tracker context: `docs/agent/runs/BLP-2/context/issue-context.json` repeats the accepted scope, the non-forced observer refresh hypothesis, and the requirement for real Obsidian/CDP runtime evidence plus a return-to-previously-viewed-file regression check.
- OpenSpec gate: `docs/agent/openspec-gates.md` keeps this as direct bug investigation because the task restores existing inline-edit behavior rather than adding a new capability.
- Expected behavior reference: `openspec/specs/inline-editing-embeds/spec.md` requires Live Preview inline-edit embeds for standard block embeds and lifecycle safety without leaked leaves/editors, although parts of the spec text are mojibake.

## Static Evidence

- `src/features/inline-edit-engine/InlineEditEngine.ts:110-123` handles `layout-change` by scheduling `refreshLivePreviewObservers()` with the default `forceRescan = false`, then `cleanupHiddenEmbeds()`.
- `src/features/inline-edit-engine/InlineEditEngine.ts:876-884` detaches managed embed leaves whose container is disconnected or `!isShown()`.
- `src/features/inline-edit-engine/InlineEditEngine.ts:951-982` skips an already-observed MarkdownView when the `.markdown-source-view` root is unchanged and `forceRescan` is false.
- `src/features/inline-edit-engine/InlineEditEngine.ts:999-1041` only queues existing embed DOM during observer creation/rescan; otherwise it depends on child-list added-node mutations.
- `src/features/inline-edit-engine/InlineEditEngine.ts:1044-1077` processes queued embeds and calls `processInlineEmbed()`.
- `src/features/inline-edit-engine/InlineEditEngine.ts:1497-1563` creates `.blp-inline-edit-host` and removes it during cleanup.
- `src/features/inline-edit-engine/InlineEditEngine.ts:1709-1733` wires managed embed restore to that cleanup.
- `src/features/inline-edit-engine/EmbedLeafManager.ts:100-128` adds `.blp-inline-edit-root` when a detached embed leaf is created and registers unload cleanup.
- `src/features/inline-edit-engine/EmbedLeafManager.ts:137-165` removes the root class and detaches the leaf during cleanup.

## Runtime Evidence

- Dependency preparation succeeded: `corepack pnpm install --frozen-lockfile`.
- Dependency checks succeeded: `Test-Path .\node_modules` returned `True`; `node -e "console.log(require.resolve('ws'))"` resolved `node_modules\.pnpm\ws@8.21.0\node_modules\ws\index.js`.
- Build succeeded: `corepack pnpm run build-with-types` exited 0 and printed `Renaming main.css to styles.css`.
- Fixed-port preflight before launch failed as expected: `node scripts/obsidian-cdp.js list` with `OB_CDP_PORT=19225` returned `connect ECONNREFUSED 127.0.0.1:19225`.
- The documented pnpm wrapper command failed in this Windows shell because a literal `--` was forwarded to PowerShell: `Parameter cannot be processed because the parameter name '' is ambiguous`.
- Direct fixed-port launcher succeeded: `powershell -NoProfile -ExecutionPolicy Bypass -File scripts/start-obsidian-debug-env.ps1 -Port 19225`.
- Launcher output: `status=ready`, `port=19225`, Obsidian `1.12.4`, vault `blp`, active file `_debug/start.md`, `blockLinkPlusLoaded=true`, plugin version `2.0.15`, plugin link type `Junction`, profile root under `C:\Users\stati\AppData\Local\Temp\blp-obsidian-debug\20260615-235829-p19225`.
- Target verification succeeded: `node scripts/obsidian-cdp.js list` showed page target `start - blp - Obsidian 1.12.4` on `app://obsidian.md/index.html`.

### Repro Probe

- Probe command: `$env:OB_CDP_PORT='19225'; $env:OB_CDP_TITLE_CONTAINS=' - blp - '; node scripts/obsidian-cdp.js eval-file ".tmp/blp2-inline-edit-leaf-switch-repro.js"`.
- Probe setup: created temporary notes in the disposable vault under `_blp_tmp/`, enabled inline edit block/heading settings, opened host A in one leaf, opened host B in a second tab leaf, switched back to host A without reopening it, then compared non-forced and forced observer refresh.
- A before switch: `isShown=true`, embed connected, class `internal-embed markdown-embed inline-embed is-loaded blp-inline-edit-active`, `.blp-inline-edit-root=true`, `.blp-inline-edit-host=true`, text `- Alpha editable target ^blp2a - Alpha child`.
- A hidden after B open: `isShown=false`, embed still connected and `is-loaded`, `.blp-inline-edit-active=false`, `.blp-inline-edit-root=false`, `.blp-inline-edit-host=false`.
- B active after B open: B had `.blp-inline-edit-active=true`, `.blp-inline-edit-root=true`, `.blp-inline-edit-host=true`.
- A returned without reopen: `isShown=true`, embed still connected and `is-loaded`, but `.blp-inline-edit-active=false`, `.blp-inline-edit-root=false`, `.blp-inline-edit-host=false`; visible text was native preview text `Alpha editable target Alpha child`.
- A after explicit non-forced refresh: still `.blp-inline-edit-root=false` and `.blp-inline-edit-host=false`.
- A after explicit forced rescan: `.blp-inline-edit-active=true`, `.blp-inline-edit-root=true`, `.blp-inline-edit-host=true`, text `- Alpha editable target ^blp2a - Alpha child`.
- Probe result: `forcedRescanRestored=true`.
- Settings cleanup: the probe restored the original inline-edit settings. Final CDP sanity check showed plugin loaded and settings `{ inlineEditEnabled: true, inlineEditBlock: true, inlineEditHeading: true, inlineEditFile: false }`, matching the original snapshot.

## Commands Run

- `git status --short`
- `corepack pnpm install --frozen-lockfile`
- `Test-Path .\node_modules`
- `node -e "console.log(require.resolve('ws'))"`
- `corepack pnpm run build-with-types`
- `$env:OB_CDP_PORT='19225'; $env:OB_CDP_TITLE_CONTAINS=' - blp - '; node scripts/obsidian-cdp.js list`
- `corepack pnpm run obsidian:debug-env -- -Port 19225`
- `powershell -NoProfile -ExecutionPolicy Bypass -File scripts/start-obsidian-debug-env.ps1 -Port 19225`
- `$env:OB_CDP_PORT='19225'; $env:OB_CDP_TITLE_CONTAINS=' - blp - '; node scripts/obsidian-cdp.js eval-file ".tmp/blp2-inline-edit-leaf-switch-repro.js"`
- `$env:OB_CDP_PORT='19225'; $env:OB_CDP_TITLE_CONTAINS=' - blp - '; node scripts/obsidian-cdp.js eval "({activeFile: app.workspace.getActiveFile?.()?.path ?? null, pluginLoaded: !!app.plugins.plugins['block-link-plus'], settings: app.plugins.plugins['block-link-plus'] ? { inlineEditEnabled: app.plugins.plugins['block-link-plus'].settings.inlineEditEnabled, inlineEditBlock: app.plugins.plugins['block-link-plus'].settings.inlineEditBlock, inlineEditHeading: app.plugins.plugins['block-link-plus'].settings.inlineEditHeading, inlineEditFile: app.plugins.plugins['block-link-plus'].settings.inlineEditFile } : null, title: document.title})"`

## Files Inspected

- `AGENTS.md`
- `WORKFLOW.md`
- `docs/agent/index.md`
- `docs/agent/stages/investigation.md`
- `docs/agent/evidence-format.md`
- `docs/agent/cdp-validation.md`
- `docs/agent/openspec-gates.md`
- `docs/agent/runs/BLP-2/context/source-issue.md`
- `docs/agent/runs/BLP-2/context/source-issue.json`
- `docs/agent/runs/BLP-2/context/issue-context.json`
- `docs/agent/runs/BLP-2/investigation.md`
- `doc/debug/cdp-script-inventory.md`
- `openspec/specs/inline-editing-embeds/spec.md`
- `src/main.ts`
- `src/features/inline-edit-engine/InlineEditEngine.ts`
- `src/features/inline-edit-engine/EmbedLeafManager.ts`
- `src/features/inline-edit-engine/__tests__/InlineEditEngine.embed-shell.test.ts`
- `scripts/obsidian-cdp.js`
- `scripts/cdp-snippets/inline-edit-embed-bottom-padding.js`
- `.codex/skills/obsidian-runtime-debug/SKILL.md`

## Root Cause

- Owner layer: `InlineEditEngine` Live Preview observer/remount lifecycle.
- Exact files/functions/selectors: `InlineEditEngine.load()`, `cleanupHiddenEmbeds()`, `refreshLivePreviewObservers()`, `ensureLivePreviewObserver()`, `processObserverEntry()`, `prepareEmbedShell()`, `EmbedLeafManager.detach()`, `.blp-inline-edit-root`, `.blp-inline-edit-host`, `.blp-inline-edit-active`.
- Why this explains the evidence: when host A becomes hidden, `cleanupHiddenEmbeds()` detaches A's managed embed because its container is no longer shown. That cleanup removes the inline-edit host/root state but leaves the native Obsidian embed shell connected and `is-loaded`. Returning to A does not add a new embed DOM node, and the existing MarkdownView observer is skipped because `refreshLivePreviewObservers(false)` short-circuits unchanged roots. Therefore A remains a native loaded embed without the inline-edit root/host. A forced rescan recreates the observer, queues existing `.internal-embed.markdown-embed` DOM, and remounts the inline editor.
- Cluster split: this confirms only the file-switch lifecycle/remount child issue. Reading View, undo overflow, bottom padding, and context-menu behavior remain separate GitHub #33 sub-bugs.

## RCA Review Gap Mapping

- `cdp-required` runtime evidence: closed. Fixed-port Obsidian/CDP runtime on `19225` was launched and verified with Block Link Plus loaded.
- Forced-rescan/remount trigger: closed. Non-forced refresh left A broken; forced rescan restored `.blp-inline-edit-root` and `.blp-inline-edit-host`.
- Avoid folding other #33 symptoms into this issue: closed for this stage. The probe exercised only the host A -> host B -> return to host A lifecycle.
- Prior parent RCA artifact: still unavailable in this worktree. The current artifact records fresh runtime evidence rather than relying on the missing file.

## Fix Plan

- Proposed change: in the leaf visibility/layout lifecycle, force a rescan of existing Live Preview embed DOM when a previously hidden Markdown leaf becomes visible/active again. The implementation should preserve hidden-embed cleanup but ensure the active visible leaf is rescanned after cleanup has removed stale detached embed state.
- Files expected to change: likely `src/features/inline-edit-engine/InlineEditEngine.ts`, plus a focused regression test and/or a reusable CDP snippet promoted from `.tmp/blp2-inline-edit-leaf-switch-repro.js`.
- Why this is the smallest correct fix: the parser, embed shell preparation, detached leaf creation, and cleanup paths already remount correctly when an embed is queued. The missing step is repopulating `pendingEmbeds` for existing DOM after a leaf switch, which `forceRescan=true` already proves.
- Risks: forcing every layout-change can add redundant observer churn and repeated already-mounted checks. A fix-design pass should choose the narrowest trigger, likely active/visible Markdown leaf return or post-cleanup layout-change rescan, and verify no double mount or jump-affordance regression.

## Validation Plan

- Targeted runtime: rerun the host A -> host B -> return to host A CDP check and require root/host to be present after return without manually forcing rescan.
- Adjacent runtime: run `scripts/cdp-snippets/inline-edit-embed-jump-affordance.js` and `scripts/cdp-snippets/inline-edit-embed-bottom-padding.js` after implementation because this fix touches inline-edit shell lifecycle.
- Targeted tests: add a focused unit/regression test around the observer/rescan behavior if feasible; otherwise encode the lifecycle as a reusable CDP regression snippet.
- Full tests/build: run `corepack pnpm test` and `corepack pnpm run build-with-types` after implementation.
- Manual/runtime cleanup: keep temporary notes in the disposable vault only and snapshot/restore inline-edit settings in any CDP snippet.

## Open Questions / Risks

- The debug runtime is Obsidian `1.12.4` on this Windows host, while the original GitHub report mentioned Obsidian `1.12.7` on Ubuntu 22.04. The bug reproduced in the repo-owned isolated runtime, so the RCA is valid for this worktree; cross-platform confirmation can be part of release validation if needed.
- The exact implementation trigger is still a design decision: broad `layout-change` force rescan is proven but may be more work than necessary; active-leaf-change or visible-leaf-only rescan may be tighter.
- The `corepack pnpm run obsidian:debug-env -- -Port 19225` wrapper currently mis-forwards `--` under this shell. Direct `scripts/start-obsidian-debug-env.ps1 -Port 19225` works and was used for evidence.
