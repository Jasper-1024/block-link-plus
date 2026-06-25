## Status

- State: Implementation
- Verdict: ready-for-review

## Plane Reply

Implemented the AFK child by adding a file-embed-specific mount-scroll regression for Live Preview `![[MOC]]` with `inlineEditFile` enabled. The test proves passive automatic mount does not call embedded or host `setCursor`, `scrollIntoView`, focus, or element scroll/focus APIs, while the existing outliner/user-command cursor and reveal behavior remains covered. Targeted tests, build-with-types, and fixed-port Desktop CDP smoke passed. Android Mobile root cause remains unproved.

## Scope

- Work item: BLP-6
- Archive key: PLANE-BLP-6
- Branch: `symphony/PLANE-BLP-6`
- Accepted implementation contract: AFK child body in `docs/harness/runs/PLANE-BLP-6/context/source-issue.md`
- In scope: harden mock-evidence coverage for Live Preview file-embed automatic mount with `inlineEditFile` enabled.
- Out of scope: Android 13, Obsidian Mobile/WebView fixes, parent BLP-5 Android RCA closure, and unrelated outliner, journal, or enhanced-list behavior.

## Changes Made

- Added a real file-embed regression in `src/features/inline-edit-engine/__tests__/InlineEditEngine.mount-scroll.test.ts` using `src="MOC"` and `inlineEditFile: true`.
- Expanded the mount-scroll test helper to optionally use the real `parseInlineEmbed` path and expose host editor cursor/reveal/focus mocks.
- Preserved the existing production owner guard in `mountInlineEmbedCore`: passive Live Preview mounts skip the embedded editor cursor/reveal block at `src/features/inline-edit-engine/InlineEditEngine.ts:1833`.
- No production source behavior was broadened.

## Tests Added Or Updated

- `InlineEditEngine.mount-scroll.test.ts`: added `passive Live Preview file embed mount skips cursor, reveal, and synthetic focus APIs`.
- Existing assertions still cover passive Live Preview block-style mount suppression, intentional non-passive outliner cursor/reveal behavior, and post-mount user interaction focus without reveal calls.

## TDD Slices

| Slice | Behavior | Public Seam | RED Command / Result | GREEN Change | GREEN Command / Result | REFACTOR Command / Result | Files Touched |
| --- | --- | --- | --- | --- | --- | --- | --- |
| TDD-1 | A Live Preview `![[MOC]]` file embed with `inlineEditFile` enabled automatically mounts without calling embedded or host scroll-moving/focus APIs. | Existing inline edit mount regression seam: `mountInlineEmbedCore` with mocked Obsidian leaf/editor collaborators. | `corepack pnpm test -- InlineEditEngine.mount-scroll.test.ts --runInBand` after reversible mutation of the passive guard to `if (true)` failed as expected: the new file-embed test reported `editor.setCursor` called once with `{ line: 1, ch: 0 }`; the two existing passive tests also failed for the same owner path. | Restored `if (!passiveLivePreviewMount)` and kept the new file-embed regression/helper updates. | `corepack pnpm test -- InlineEditEngine.file-embed.test.ts InlineEditEngine.mount-scroll.test.ts --runInBand` passed: 2 suites, 7 tests. | N/A. | `src/features/inline-edit-engine/__tests__/InlineEditEngine.mount-scroll.test.ts` |

## Validation

- `corepack pnpm install --frozen-lockfile` passed; 607 packages linked from the lockfile.
- Initial pre-install targeted test attempt failed because `node_modules` was missing and `jest` was not available; dependencies were then installed from the frozen lockfile.
- Baseline after install: `corepack pnpm test -- InlineEditEngine.file-embed.test.ts InlineEditEngine.mount-scroll.test.ts --runInBand` passed before the new regression, 2 suites and 6 tests.
- RED mutation check: `corepack pnpm test -- InlineEditEngine.mount-scroll.test.ts --runInBand` failed for the expected passive-mount cursor call when the guard was temporarily disabled.
- Final targeted validation: `corepack pnpm test -- InlineEditEngine.file-embed.test.ts InlineEditEngine.mount-scroll.test.ts --runInBand` passed, 2 suites and 7 tests.
- `corepack pnpm run build-with-types` passed; `tsc -noEmit -skipLibCheck` completed and production esbuild renamed `main.css` to `styles.css`.
- `corepack pnpm run agent:workflow-check` passed with `agent workflow check passed`.

## Runtime Evidence

- Task key: BLP-6
- Source issue: `docs/harness/runs/PLANE-BLP-6/context/source-issue.md`
- Archive key: PLANE-BLP-6
- Worktree: `C:\Users\stati\Documents\Codex\2026-06-13\hermes\outputs\plane-symphony-like-demo\workspaces\PLANE-BLP-6`
- Branch: `symphony/PLANE-BLP-6`
- Obsidian version: 1.12.4
- Vault name: `blp`
- Plugin id: `block-link-plus`
- Plugin version: 2.0.15
- CDP port: 19225
- Build before smoke: `corepack pnpm run build-with-types` passed.
- Runtime start command: `powershell -NoProfile -ExecutionPolicy Bypass -File scripts/start-obsidian-debug-env.ps1 -Port 19225`
- Runtime start output: status `ready`; title `start - blp - Obsidian 1.12.4`; active file `_debug/start.md`; `blockLinkPlusLoaded: true`; `blockLinkPlusEnabled: true`.
- Probe command: `$env:OB_CDP_PORT='19225'; $env:OB_CDP_TITLE_CONTAINS=' - blp - '; node scripts/obsidian-cdp.js list`
- Probe output included page target `start - blp - Obsidian 1.12.4` at `app://obsidian.md/index.html`.
- Probe command: `$env:OB_CDP_PORT='19225'; $env:OB_CDP_TITLE_CONTAINS=' - blp - '; node scripts/obsidian-cdp.js eval "JSON.stringify({vaultName: app.vault.getName(), activeFile: app.workspace.getActiveFile()?.path, pluginLoaded: !!app.plugins.plugins['block-link-plus'], pluginVersion: app.plugins.plugins['block-link-plus']?.manifest?.version})"`
- Probe output: `{"vaultName":"blp","activeFile":"_debug/start.md","pluginLoaded":true,"pluginVersion":"2.0.15"}`
- Unproved: this Desktop CDP smoke does not prove the parent Android Mobile scroll-jump root cause fixed.

## Files Changed

- `src/features/inline-edit-engine/__tests__/InlineEditEngine.mount-scroll.test.ts`
- `docs/harness/runs/PLANE-BLP-6/implementation.md`
- `docs/harness/runs/PLANE-BLP-6/publish/implementation.json`

## Risks / Open Questions

- The child archive lacks prior local `implementation-routing.md`, `investigation.md`, `rca-review.md`, `fix-design.md`, and `fix-design-review.md` artifacts. I proceeded because BLP-6 is labeled `afk` and the child body explicitly says the RCA review accepted this mitigation child with concrete acceptance criteria.
- Production behavior was already guarded by `passiveLivePreviewMount`; this patch hardens the requested file-embed mock evidence rather than changing runtime behavior.
- Android Mobile root cause remains unproved and must stay with the parent RCA unless a separate runtime proof establishes it.

## Decision

Ready for code review. Review should attack whether the file-embed regression proves the accepted child boundary, whether the test seam is acceptable for `mountInlineEmbedCore`, and whether the implementation artifact correctly avoids claiming the Android Mobile parent bug is fixed.
