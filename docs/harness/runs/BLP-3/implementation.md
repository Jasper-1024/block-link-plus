## Status

- State: Implementation
- Verdict: ready-for-review
- Task: `BLP-3` / `[GitHub #33B] Inline Editing Enter+undo visible range overflow`
- Workspace: `C:\Users\stati\Documents\Codex\2026-06-13\hermes\outputs\plane-symphony-like-demo\workspaces\BLP-3`

## Plane Reply

Implemented the scoped `#33B` fix in `selectiveEditor.ts` and added a bounded CM6 history regression. The targeted unit test, full Jest suite, type/build, and cold fixed-port Obsidian keyboard repro pass: real `Enter` expands live ranges from `[5,9]` to `[5,10]`, real `Ctrl+Z` restores `[5,9]` with no leaked paragraph, and redo returns `[5,10]`.

Code review should specifically attack the final hook choice. Runtime evidence showed the accepted `transactionExtender` design was insufficient in Obsidian's actual history path, so the final patch moves line-count range synchronization into the range state fields themselves and keeps `preventModifyTargetRanges` as edit blocking only. One required adjacent snippet, `inline-edit-embed-jump-affordance.js`, still fails on a pre-existing-looking `textContent` system-tail assertion even though the visible `innerText` is clean and `debug-inline-edit-system-line.js` passes; review should decide whether that separate adjacent failure blocks this child fix.

## Scope

- In scope:
  - Live Preview inline-edit block embeds using selective visible/editable line ranges.
  - Line-count-changing edits inside the range, including real keyboard `Enter`, `Ctrl+Z`, and redo.
  - Keeping out-of-range edit rejection separate from range maintenance.
- Out of scope:
  - Other GitHub `#33` symptoms: padding, file reopen/lifecycle, context menu, Reading View over-render.
  - OpenSpec changes.
  - Inline edit engine lifecycle or embed shell refactors.

## Changes Made

- Moved line-count range synchronization into the `frontmatterFacet` and `selectiveLinesFacet` state-field update paths in `src/shared/utils/codemirror/selectiveEditor.ts`.
- Kept `preventModifyTargetRanges` responsible only for rejecting `input` / `delete` / `move` transactions outside the selective range.
- Preserved the existing before-range and inside-range math using `tr.startState`, `tr.changes`, and `tr.newDoc.lines`.

## Tests Added Or Updated

- Updated `src/shared/utils/codemirror/__tests__/selectiveEditor.systemLine.test.ts`.
- Added `restores inline-edit visible range after Enter undo and redo`, which asserts:
  - Enter-like insertion changes both range fields from `[5,9]` to `[5,10]`.
  - CodeMirror `undo(...)` returns the doc line count and both fields to `[5,9]`.
  - `redo(...)` returns both fields to `[5,10]`.
  - The following paragraph does not become visible.

## Validation

- `corepack pnpm install --frozen-lockfile`
  - First run hit pnpm's interactive reinstall prompt.
  - Re-run with `CI=1` completed successfully and recreated `node_modules` from the lockfile.
- `corepack pnpm test -- selectiveEditor.systemLine.test.ts`
  - Passed: 1 suite, 4 tests.
- `corepack pnpm test`
  - Passed: 38 suites, 214 tests.
  - Jest printed the existing worker-teardown warning: "A worker process has failed to exit gracefully..."
- `corepack pnpm run build-with-types`
  - Passed: `tsc -noEmit -skipLibCheck` and production esbuild.
- `corepack pnpm run obsidian:debug-env -- -Port 19225`
  - Failed on this Windows shell because pnpm passed a literal `--` to PowerShell.
- `powershell -NoProfile -ExecutionPolicy Bypass -File scripts/start-obsidian-debug-env.ps1 -Port 19225`
  - Passed.
  - Runtime JSON: `status: ready`, `port: 19225`, `blockLinkPlusLoaded: true`, `blockLinkPlusVersion: 2.0.15`, plugin link type `Junction`.

## Runtime Evidence

- Fixed-port target: `OB_CDP_PORT=19225`, `OB_CDP_TITLE_CONTAINS=' - blp - '`.
- A cold Obsidian process was required. Reusing/reloading the old Electron process kept stale plugin module/editor state and continued reproducing the bug; closing the debug target and starting a fresh isolated runtime loaded the rebuilt `main.js`.
- Targeted keyboard repro in the fresh runtime:
  - before Enter: doc lines `11`, live ranges `[[5,9],[5,9]]`, leaked paragraph `false`
  - after real CDP `Enter`: doc lines `12`, live ranges `[[5,10],[5,10]]`, leaked paragraph `false`
  - after real CDP `Ctrl+Z`: doc lines `11`, live ranges `[[5,9],[5,9]]`, leaked paragraph `false`
  - after real CDP `Ctrl+Y`: doc lines `12`, live ranges `[[5,10],[5,10]]`, leaked paragraph `false`
- `node scripts/obsidian-cdp.js eval-file "scripts/cdp-snippets/debug-inline-edit-system-line.js"`
  - Passed: `ok: true`, `dvKeys: 0`, `textHits: 0`, active embed range `[6,8]`.
- `node scripts/obsidian-cdp.js eval-file "scripts/cdp-snippets/inline-edit-embed-jump-affordance.js"`
  - Failed: `system tail tokens leaked in inline edit embed`.
  - Follow-up inspection showed `fileOutlinerHideSystemLine: true`, visible `innerText` contained only the target block and nested child, but `textContent` still contained hidden system-tail tokens. This appears adjacent to system-tail DOM/text assertion behavior rather than the scoped Enter/undo overflow.

## Files Changed

- `src/shared/utils/codemirror/selectiveEditor.ts`
- `src/shared/utils/codemirror/__tests__/selectiveEditor.systemLine.test.ts`
- `docs/agent/runs/BLP-3/implementation.md`

## Risks / Open Questions

- The final implementation differs from the accepted fix-design hook. The accepted design expected `transactionExtender` to handle history transactions; real Obsidian runtime evidence showed that hook path did not repair `Ctrl+Z`. The state-field update path did.
- The adjacent jump-affordance snippet failure needs review. The scoped bug is fixed in runtime, and the system-line-specific snippet passes, but the required adjacent snippet still fails before it reaches its active-link click assertions.
- Because a cold Obsidian process was required to load rebuilt code, future runtime validation should not trust plugin enable/disable alone after changing CM extensions.

## Decision

- Ready for code review of the scoped patch.
- Code review should attack:
  - whether field-owned range sync is the right final owner,
  - whether overriding stale range carriers on doc-changing transactions can affect any intentional range reset,
  - whether the `inline-edit-embed-jump-affordance.js` failure should block this child issue or be split as adjacent system-tail/textContent validation debt.
