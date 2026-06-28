## Status

- State: Middle-flow
- Task: BLP-9, Autocomplete selection leaves cursor inside wiki link and keeps suggestion list open
- Workspace: `C:\Users\stati\Documents\Codex\2026-06-13\hermes\outputs\plane-symphony-like-demo\workspaces\PLANE-BLP-9`
- Branch: `symphony/PLANE-BLP-9`
- Plane dossier: none supplied to this worker
- Verdict: handoff to RCA review

## Scope

- Classification: confirmed bug
- In scope: BLP File Outliner custom CM6 editor bridge for Obsidian `[[` wiki-link suggestions.
- Out of scope: native Obsidian Markdown editor autocomplete, slash command suggest behavior, implementation changes, package metadata, and child work item creation.
- Cluster split: not recommended. The evidence supports one fix unit in the BLP-owned `OutlinerSuggestEditor.transaction()` adapter.

## Tracker Feedback Review

Tracker feedback contains no human comments, links, or referenced pages. This run accepts the original tracker claim as the active scope and does not add, narrow, defer, reject, or convert any human feedback into child scope.

## Evidence

- Issue claim: selecting a `[[` autocomplete item inserts a completed wiki link but leaves the caret inside the link and keeps the completion list visible.
- Source issue context: `docs/harness/runs/PLANE-BLP-9/context/source-issue.md` contains the full task claim, observed behavior, expected behavior, and `cdp-required` label.
- Static evidence:
  - `src/features/file-outliner-view/editor-suggest-bridge.ts:21` converts Obsidian `EditorPosition` values to CM6 offsets against the current CM document and clamps positions to the current line length.
  - `src/features/file-outliner-view/editor-suggest-bridge.ts:340` captures `const doc = this.cm.state.doc` before applying transaction changes.
  - `src/features/file-outliner-view/editor-suggest-bridge.ts:357` converts `tx.selection` against that pre-change `doc`; `src/features/file-outliner-view/editor-suggest-bridge.ts:365` then dispatches the replacement and precomputed selection together.
  - `src/features/file-outliner-view/editor-state.ts:120` calls `onMaybeTriggerSuggest()` on every doc change.
  - `src/features/file-outliner-view/view.ts:1029` triggers Obsidian `workspace.editorSuggest` again when the custom editor still has focus.
  - `src/features/file-outliner-view/editor-suggest-bridge.ts:423` prefers Obsidian's editor-suggest manager entrypoint, so the BLP adapter is handing Obsidian core a custom editor facade.
- Runtime evidence:
  - Fixed-port runtime started on `19225`: Obsidian title `PLANE-BLP-9-wiki-link-suggest - blp - Obsidian 1.12.4`, vault `blp`, plugin `block-link-plus` loaded at version `2.0.16`.
  - Probe trace: `docs/harness/runs/PLANE-BLP-9/trace/investigation/wiki-link-suggest-selection-probe.json`.
  - Screenshot: `docs/harness/runs/PLANE-BLP-9/trace/investigation/wiki-link-suggest-selection-open.png`.
  - Temporary probe: `.tmp/PLANE-BLP-9/wiki-link-suggest-selection-probe.js`.
  - The probe created target note `2026-6-27.md`, opened `_blp_tmp/PLANE-BLP-9-wiki-link-suggest.md` in BLP File Outliner, inserted `[[`, clicked suggestion item `2026-6-27`, and waited 600 ms.
  - Final runtime state after click: `finalDoc` was `[[2026-6-27]]`; `finalSelection.anchor` was `2`; `finalSuggests.currentOpen` was `true`; one `.suggestion-container` remained visible.
  - The same trace shows Obsidian's autocomplete transaction requested `selection.from.ch = 13` and `selection.to.ch = 13`, which is the expected caret location after the completed `[[2026-6-27]]` string.
  - The BLP adapter dispatched that same transaction with `selection.anchor = 2`, because the requested `ch = 13` was converted against the old `[[` document, whose length was only `2`.
  - Follow-up runtime check confirmed `beforeCursor` was exactly `[[`, `afterCursor` was `2026-6-27]]`, and `expectedAnchorAfterLink` was `13`; this explains why link suggest retriggered.
  - Control monkeypatch probe: `docs/harness/runs/PLANE-BLP-9/trace/investigation/wiki-link-suggest-selection-control-patch.json`. With only the live adapter instance patched to interpret transaction selection against the post-change text, the same UI selection ended with `finalSelection.anchor = 13`, `afterCursor = ""`, and `openSuggests.currentOpen = false`.

### Runtime Proof Package

- Task key: BLP-9
- Source issue: `docs/harness/runs/PLANE-BLP-9/context/source-issue.md`
- Archive key: PLANE-BLP-9
- Worktree path: `C:\Users\stati\Documents\Codex\2026-06-13\hermes\outputs\plane-symphony-like-demo\workspaces\PLANE-BLP-9`
- Branch: `symphony/PLANE-BLP-9`
- Obsidian version: 1.12.4, from the fixed-runtime window title
- Vault name: `blp`
- Plugin id/version: `block-link-plus` / `2.0.16`
- CDP port: `19225`
- Build command before probe: `corepack pnpm run build-with-types` succeeded.
- Failure proof before fix: `wiki-link-suggest-selection-probe.json` and `wiki-link-suggest-selection-open.png`.
- Resolution proof after fix: not applicable; no source fix was made. The control monkeypatch is only RCA support.
- Remaining unproved: exact production fix shape, regression test implementation, and behavior after a source patch/rebuild.

### Commands Run

- `corepack pnpm install --frozen-lockfile` succeeded.
- `Test-Path .\node_modules` returned `True`.
- `node -e "console.log(require.resolve('ws'))"` resolved `node_modules\.pnpm\ws@8.21.0\node_modules\ws\index.js`.
- `corepack pnpm run build-with-types` succeeded and rebuilt production output.
- `$env:OB_CDP_PORT='19225'; $env:OB_CDP_TITLE_CONTAINS=' - blp - '; node scripts/obsidian-cdp.js list` initially failed with `ECONNREFUSED 127.0.0.1:19225`, so the fixed runtime was launched.
- `powershell -NoProfile -ExecutionPolicy Bypass -File scripts/start-obsidian-debug-env.ps1 -Port 19225` returned `status: ready`, `blockLinkPlusLoaded: true`, and `blockLinkPlusVersion: 2.0.16`.
- `$env:OB_CDP_PORT='19225'; $env:OB_CDP_TITLE_CONTAINS=' - blp - '; node scripts/obsidian-cdp.js eval-file '.tmp/PLANE-BLP-9/wiki-link-suggest-selection-probe.js'` reproduced the bug.
- `$env:OB_CDP_PORT='19225'; $env:OB_CDP_TITLE_CONTAINS=' - blp - '; node scripts/obsidian-cdp.js screenshot 'docs\harness\runs\PLANE-BLP-9\trace\investigation\wiki-link-suggest-selection-open.png'` captured the visible stuck suggestion list.
- `$env:OB_CDP_PORT='19225'; $env:OB_CDP_TITLE_CONTAINS=' - blp - '; node scripts/obsidian-cdp.js eval-file '.tmp/PLANE-BLP-9/wiki-link-suggest-selection-control-patch.js'` supported the RCA with a reversible runtime-only monkeypatch.

### Files Inspected

- `AGENTS.md`
- `WORKFLOW.md`
- `CONTEXT.md`
- `docs/harness/README.md`
- `docs/harness/workflow.json`
- `docs/harness/guides/evidence-format.md`
- `docs/harness/guides/cdp-runtime.md`
- `docs/harness/guides/publishing.md`
- `docs/harness/guides/quality-gates.md`
- `docs/harness/guides/runtime-proof-package.md`
- `docs/harness/stages/investigation.md`
- `docs/agents/domain.md`
- `docs/harness/runs/PLANE-BLP-9/context/source-issue.md`
- `docs/harness/runs/PLANE-BLP-9/context/tracker-feedback.md`
- `docs/harness/runs/PLANE-BLP-9/context/tracker-feedback.json`
- `docs/harness/runs/PLANE-BLP-9/context/issue-context.json`
- `src/features/file-outliner-view/editor-suggest-bridge.ts`
- `src/features/file-outliner-view/editor-state.ts`
- `src/features/file-outliner-view/view.ts`
- `scripts/cdp-snippets/file-outliner-editor-suggest.js`
- `scripts/obsidian-cdp.js`
- `package.json`
- `manifest.json`

## Root Cause

- Owner layer: BLP File Outliner custom editor adapter.
- Exact files/functions:
  - `src/features/file-outliner-view/editor-suggest-bridge.ts:340`, `OutlinerSuggestEditor.transaction()`
  - `src/features/file-outliner-view/editor-suggest-bridge.ts:21`, `posToOffset()`
  - `src/features/file-outliner-view/editor-state.ts:120`, doc-change suggest retrigger
  - `src/features/file-outliner-view/view.ts:1029`, `maybeTriggerEditorSuggest()`
- RCA: Obsidian's link suggest sends a transaction replacing `[[` with `[[2026-6-27]]` and asks the editor adapter to move the caret to `ch = 13`, after the completed link. BLP computes that requested selection against the pre-change document `[[`; `posToOffset()` clamps `ch = 13` to offset `2`. The completed link is inserted, but the caret remains immediately after the opening brackets. Because the custom editor still has focus and its doc-change listener retriggers Obsidian editor suggest, Obsidian sees the cursor after `[[` and opens the wiki-link suggestion list again.
- Why this explains the evidence: the final text is correct, the final caret is at offset `2` instead of `13`, the suggestion list reappears after the transaction has closed the original popup, and a runtime-only post-change selection mapping removes both symptoms.

## Fix Plan

- Proposed change: update `OutlinerSuggestEditor.transaction()` so transaction selections are mapped against the post-change document, or equivalently through the same change mapping used by the dispatched CM6 transaction, before dispatching the selection to CM6.
- Files expected to change:
  - `src/features/file-outliner-view/editor-suggest-bridge.ts`
  - focused tests under `src/features/file-outliner-view/__tests__/`
  - optional reusable CDP regression snippet only if fix-design accepts promoting the temporary probe.
- Why this is the smallest correct fix: `replaceRange()` and `replaceSelection()` already place the caret after inserted text; the reproduced failure path uses `transaction()`, and the trace shows Obsidian provides the correct target selection. The bug is the adapter's coordinate space, not suggestion closing itself.
- Risks: transaction changes can be multi-change or multi-line; the fix should not assume one-line replacements. It should preserve existing behavior for `replaceSelection`, explicit `tx.changes`, and no-selection transactions.

## Validation Plan

- Targeted tests:
  - Add a unit test for `OutlinerSuggestEditor.transaction()` where old doc is `[[`, the transaction inserts `[[2026-6-27]]`, and `tx.selection` is `{ line: 0, ch: 13 }`; expected CM selection is offset `13`.
  - Add a multiline transaction-selection test so post-change mapping is not one-line-only.
- Full tests/build:
  - `corepack pnpm test`
  - `corepack pnpm run build-with-types`
- CDP/runtime checks:
  - Repeat the BLP File Outliner wiki-link suggestion selection in fixed runtime `19225`.
  - Expected: final editor text `[[2026-6-27]]`, final selection anchor equals text length, and no `.suggestion-container` remains open after 600 ms.
- Manual checks:
  - Click a wiki-link suggestion in File Outliner edit mode.
  - Press Enter on a highlighted wiki-link suggestion in File Outliner edit mode.
  - Verify slash suggest still opens and commits normally.

## Open Questions / Risks

- Need RCA review to challenge whether `transaction()` should map `tx.selection` by applying changes first or by using CM6 change descriptions. The implementation must support multi-change and multiline transactions.
- No native Markdown editor control run was needed for ownership because the trace shows Obsidian core passed the correct post-change selection to the BLP adapter. RCA review may still request a native control if it wants broader comparison evidence.
- The temporary probes intentionally left disposable runtime notes in the isolated vault to preserve screenshot/debug state. No product source, tests, package metadata, or formal docs were edited.

## Publication Targets

- Work item comment: Runtime investigation confirmed BLP-9 in File Outliner. `OutlinerSuggestEditor.transaction()` clamps Obsidian's post-insert caret to the old `[[` doc, leaving cursor at offset 2 and reopening link suggest. Artifact: `repo:docs/harness/runs/PLANE-BLP-9/investigation.md`
- Work item links:
  - `repo:docs/harness/runs/PLANE-BLP-9/investigation.md`
  - `repo:docs/harness/runs/PLANE-BLP-9/trace/investigation/wiki-link-suggest-selection-probe.json`
  - `repo:docs/harness/runs/PLANE-BLP-9/trace/investigation/wiki-link-suggest-selection-open.png`
- Project Page dossier: include Evidence, Root Cause, Fix Plan, and Open Questions / Risks sections from this artifact.
- Wiki/doc collection: none.
- Repo artifact: `docs/harness/runs/PLANE-BLP-9/investigation.md`
- Publish Plan JSON: `docs/harness/runs/PLANE-BLP-9/publish/investigation.json`
