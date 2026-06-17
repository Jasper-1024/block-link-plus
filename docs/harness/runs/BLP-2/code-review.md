## Status

- Verdict: accepted

## Plane Reply

Accepted. The revised implementation is ready for human review or merge decision within the BLP-2 scope.

The source patch follows the accepted visible-return rescan design: `InlineEditEngine` tracks whether an observed Live Preview MarkdownView was last shown, records hidden state, and requeues existing `.internal-embed.markdown-embed` DOM when the view returns hidden -> shown. Hidden cleanup remains in place, and the patch does not touch Reading View, undo/redo behavior, transaction filtering, range-maintenance semantics, context-menu behavior, or bottom-padding product logic.

Review validation passed against the current worktree: targeted observer test, full Jest suite, typed production build, fixed-port Obsidian target check, built-plugin reload, the new leaf-switch remount CDP regression, the previously blocking jump-affordance CDP check, and the adjacent bottom-padding CDP check.

## Review Summary

This review covers the implementation patch after the earlier code-review gate reported a blocking failure in `scripts/cdp-snippets/inline-edit-embed-jump-affordance.js`.

Current review `git status --short` before writing this artifact:

```text
 M scripts/cdp-snippets/inline-edit-embed-jump-affordance.js
 M src/features/inline-edit-engine/InlineEditEngine.ts
?? docs/agent/runs/BLP-2/
?? scripts/cdp-snippets/inline-edit-embed-leaf-switch-remount.js
?? src/features/inline-edit-engine/__tests__/InlineEditEngine.live-preview-observer.test.ts
```

The reviewed source diff modifies `InlineEditEngine.ts`, updates the jump-affordance CDP snippet, and adds a focused observer unit test plus the BLP-2 leaf-switch CDP regression.

## Findings

No blocking findings.

The previous blocking validation mismatch is resolved in this review runtime. `inline-edit-embed-jump-affordance.js` now waits for stable inline-edit shell/link state at `scripts/cdp-snippets/inline-edit-embed-jump-affordance.js:86-100`, and the command passed after a fresh build and plugin reload.

Non-blocking note: that snippet still uses `textContent` for its tail-token snapshot, and the passing result reported `text: ""` for active/remount states. For this gate that is acceptable because the snippet is validating native jump-link preservation and stable shell counts, while the direct BLP-2 regression and bottom-padding snippet separately validate visible inline-edit text. Future visible-text leak checks should prefer `innerText` or another visible-text surface.

## Design Compliance

- `InlineEditEngine.load()` now registers both `layout-change` and `active-leaf-change` to the same lifecycle refresh scheduler at `src/features/inline-edit-engine/InlineEditEngine.ts:111-116`. The additional active-leaf hook is broader than the original wording, but it is still scoped to the same lifecycle refresh and is covered by the A -> B -> A CDP regression.
- `scheduleLivePreviewLifecycleRefresh()` preserves the previous inactive cleanup behavior and still runs non-forced observer refresh before hidden cleanup at `src/features/inline-edit-engine/InlineEditEngine.ts:265-277`.
- The accepted hidden-to-shown design is implemented at `src/features/inline-edit-engine/InlineEditEngine.ts:987-995`: unchanged roots update `lastShown`, record the hidden state, and queue existing embeds only on hidden -> shown.
- New and force-recreated observer entries initialize `lastShown` at `src/features/inline-edit-engine/InlineEditEngine.ts:1003-1012`.
- `queueExistingLivePreviewEmbeds()` preserves the connected-element check, nested-embed guard, and schedules only when it adds new candidates at `src/features/inline-edit-engine/InlineEditEngine.ts:1065-1075`.
- Existing processing remains idempotent: queued embeds are drained once at `src/features/inline-edit-engine/InlineEditEngine.ts:1104-1109`, and already-mounted/pending embed guards remain at `src/features/inline-edit-engine/InlineEditEngine.ts:1675-1684`.
- The patch does not rely on `transactionFilter` for this `filter:false` lifecycle issue. Existing `filter:false` dispatches remain at `src/features/inline-edit-engine/InlineEditEngine.ts:248` and `src/features/inline-edit-engine/InlineEditEngine.ts:1801-1809`, but the BLP-2 change is DOM observer/remount lifecycle only.
- Undo/redo, edit rejection semantics, and range-maintenance effects are not changed by this patch. No new undo/redo coverage is required for this child issue because the accepted BLP-2 scope explicitly excludes the parent #33 undo overflow symptom.

## Test And Validation Review

Commands run in review:

```powershell
git diff --check
node --check scripts/cdp-snippets/inline-edit-embed-jump-affordance.js
node --check scripts/cdp-snippets/inline-edit-embed-leaf-switch-remount.js
Test-Path .\node_modules
node -e "console.log(require.resolve('ws'))"
corepack pnpm test -- InlineEditEngine.live-preview-observer
corepack pnpm test
corepack pnpm run build-with-types
$env:OB_CDP_PORT='19225'; $env:OB_CDP_TITLE_CONTAINS=' - blp - '; node scripts/obsidian-cdp.js list
$env:OB_CDP_PORT='19225'; $env:OB_CDP_TITLE_CONTAINS=' - blp - '; node scripts/obsidian-cdp.js eval "(async () => { const id = 'block-link-plus'; if (app.plugins.plugins[id]) await app.plugins.disablePlugin(id); await app.plugins.enablePlugin(id); return { loaded: !!app.plugins.plugins[id], version: app.plugins.plugins[id]?.manifest?.version ?? null, activeFile: app.workspace.getActiveFile?.()?.path ?? null, title: document.title }; })()"
$env:OB_CDP_PORT='19225'; $env:OB_CDP_TITLE_CONTAINS=' - blp - '; node scripts/obsidian-cdp.js eval-file "scripts/cdp-snippets/inline-edit-embed-leaf-switch-remount.js"
$env:OB_CDP_PORT='19225'; $env:OB_CDP_TITLE_CONTAINS=' - blp - '; node scripts/obsidian-cdp.js eval-file "scripts/cdp-snippets/inline-edit-embed-jump-affordance.js"
$env:OB_CDP_PORT='19225'; $env:OB_CDP_TITLE_CONTAINS=' - blp - '; node scripts/obsidian-cdp.js eval-file "scripts/cdp-snippets/inline-edit-embed-bottom-padding.js"
```

Results:

- `git diff --check`: pass; Git printed LF-to-CRLF working-copy warnings for the two modified tracked files.
- CDP snippet syntax checks: pass for both changed/new snippets.
- Dependency presence: `Test-Path .\node_modules` returned `True`; `ws` resolved from `node_modules\.pnpm\ws@8.21.0\node_modules\ws\index.js`.
- `corepack pnpm test -- InlineEditEngine.live-preview-observer`: pass, 1 suite / 2 tests.
- `corepack pnpm test`: pass, 39 suites / 216 tests. Jest printed the existing force-exited worker/open-handle warning after passing.
- `corepack pnpm run build-with-types`: pass; output included `Renaming main.css to styles.css`.
- Fixed-port target check: pass, found `issue33-padding-host - blp - Obsidian 1.12.4` on port `19225`.
- Plugin reload after build: pass, returned `{ loaded: true, version: "2.0.15", activeFile: "_blp_tmp/issue33-padding-host.md", title: "issue33-padding-host - blp - Obsidian 1.12.4" }`.
- New leaf-switch remount CDP regression: pass, `ok: true`, plugin `2.0.15`; after A -> B -> A, host A returned with `active: true`, `rootCount: 1`, `hostCount: 1`, and visible Alpha target text.
- Jump-affordance CDP regression: pass, `ok: true`; active/remount states had one active inline editor, one direct native link, one host, one root, and a visible link.
- Bottom-padding CDP regression: pass, `paddingBottom: "0px"`, `hasJumpLink: true`, visible text `- Editable target block ^i33pad\n  - nested child remains visible`.

Focused test coverage:

- `src/features/inline-edit-engine/__tests__/InlineEditEngine.live-preview-observer.test.ts:58-89` proves unchanged visible views do not requeue, hidden state is remembered, and hidden -> shown requeues existing native embed DOM.
- `src/features/inline-edit-engine/__tests__/InlineEditEngine.live-preview-observer.test.ts:92-109` proves force rescan still recreates an observer and queues existing embed DOM.

Runtime coverage:

- `scripts/cdp-snippets/inline-edit-embed-leaf-switch-remount.js:114-121` waits for exactly one active/root/host mounted inline editor.
- `scripts/cdp-snippets/inline-edit-embed-leaf-switch-remount.js:170-175` directly asserts that host A is remounted after return without reopening and without system tail-token leakage.

## Required Revisions

None.

## Risks / Open Questions

- `layout-change` and `active-leaf-change` can both schedule the same delayed lifecycle refresh. The current implementation is acceptably idempotent because candidate queuing uses a `Set`, observer processing clears pending embeds, and mount processing skips already-mounted or pending embeds.
- The new `isMarkdownViewShown()` fallback treats connected mocked DOM as shown when Obsidian `containerEl.isShown()` is unavailable. Production runtime should use Obsidian's `isShown()` path; build and CDP validation confirm the production path is viable in the repo runtime.
- The CDP runtime is Obsidian `1.12.4` on Windows, while the original report named Obsidian `1.12.7` on Ubuntu. The scoped lifecycle failure and fix are proven in the repo-owned fixed-port runtime.
- `corepack pnpm install --frozen-lockfile` was not rerun in this review pass because dependencies were already present and both full tests and build passed. The implementation artifact records dependency preparation from earlier in the run.

## Decision

Accepted. The patch implements the accepted BLP-2 design, stays within the child issue scope, fixes the previously blocking validation gap, and passes the required source, unit, build, and fixed-port Obsidian/CDP checks.
