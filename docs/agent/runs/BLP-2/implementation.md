## Status

- State: Implementation
- Verdict: ready-for-review

## Plane Reply

Implemented the scoped BLP-2 inline-edit remount fix. `InlineEditEngine` now remembers Live Preview MarkdownView visibility, requeues existing embed DOM when an observed view returns hidden -> shown, and runs that lifecycle refresh on both `layout-change` and `active-leaf-change`.

Current validation passed: focused observer unit test, full Jest suite, typed production build, plugin reload in the fixed-port runtime, new fixed-port CDP leaf-switch regression, and adjacent jump-affordance/bottom-padding CDP checks. This pass also addresses the existing `code-review.md` needs-revision finding by making the jump-affordance snippet wait for the stable inline-edit state instead of snapshotting after a fixed delay. Code review should attack the `active-leaf-change` hook for duplicate scheduling or unintended churn, and verify the new CDP snippet is not depending on forced rescan.

## Scope

- In scope: Live Preview inline-edit embeds after host A -> host B -> return to host A without reopening host A.
- Out of scope: Reading View over-render, undo overflow, context-menu dismissal, persistent bottom padding, and unrelated File Outliner behavior.
- Accepted design followed: keep hidden cleanup, do not force-rescan every layout change, and remount by sending existing `.internal-embed.markdown-embed` DOM through the current observer queue.

## Changes Made

- Updated `src/features/inline-edit-engine/InlineEditEngine.ts`.
- Added `lastShown` to Live Preview observer entries.
- Extracted existing embed DOM queueing into `queueExistingLivePreviewEmbeds()`.
- Added `isMarkdownViewShown()` using Obsidian `containerEl.isShown()` with a test/mock fallback.
- On unchanged existing roots, non-forced refresh now records hidden state and queues existing embed DOM only when the view transitions hidden -> shown.
- Added `scheduleLivePreviewLifecycleRefresh()` and registered it for both `layout-change` and `active-leaf-change`.
- The `active-leaf-change` hook is included so tab activation drives the same visible-return lifecycle refresh as layout changes; the fixed-port CDP regression exercises that A -> B -> A tab-return path.
- Updated `scripts/cdp-snippets/inline-edit-embed-jump-affordance.js` to wait for one active inline editor, one direct native jump link, one host/root, visible link state, and no system tail tokens before asserting. This resolves the prior code-review validation flake without changing product behavior.

## Tests Added Or Updated

- Added `src/features/inline-edit-engine/__tests__/InlineEditEngine.live-preview-observer.test.ts`.
- Added `scripts/cdp-snippets/inline-edit-embed-leaf-switch-remount.js`.
- Updated `scripts/cdp-snippets/inline-edit-embed-jump-affordance.js`.
- Unit coverage proves:
  - unchanged visible view does not requeue existing embeds
  - hidden state is remembered
  - hidden -> shown requeues existing native embed DOM
  - `forceRescan=true` still queues existing embed DOM for recreated observers
- CDP regression proves host A remounts after A -> B -> A without manual forced rescan and with exactly one `.blp-inline-edit-host` / `.blp-inline-edit-root`.

## Validation

- `Test-Path .\node_modules`
  - `True`
- `node -e "console.log(require.resolve('ws'))"`
  - Resolved `node_modules\.pnpm\ws@8.21.0\node_modules\ws\index.js`.
- `git diff --check`
  - Exit 0; Git printed the existing LF-to-CRLF working-copy warning for `InlineEditEngine.ts`.
- `node --check scripts/cdp-snippets/inline-edit-embed-jump-affordance.js`
  - PASS.
- `corepack pnpm test -- InlineEditEngine.live-preview-observer`
  - PASS, 1 suite / 2 tests.
- `corepack pnpm test`
  - PASS, 39 suites / 216 tests.
  - Jest printed the existing open-handle shutdown warning: a worker was force exited after tests passed.
- `corepack pnpm run build-with-types`
  - PASS.
  - Output included `Renaming main.css to styles.css`.
- `corepack pnpm install --frozen-lockfile`
  - Not rerun in the final verification pass because `node_modules` was already present and `ws` resolved from the repo lockfile install.

## Runtime Evidence

- Fixed-port target check:
  - `$env:OB_CDP_PORT='19225'; $env:OB_CDP_TITLE_CONTAINS=' - blp - '; node scripts/obsidian-cdp.js list`
  - Found BLP Obsidian target on `19225`: `issue35-arrow-host - blp - Obsidian 1.12.4`.
- Plugin reload after build:
  - `$env:OB_CDP_PORT='19225'; $env:OB_CDP_TITLE_CONTAINS=' - blp - '; node scripts/obsidian-cdp.js eval "(async () => { const id = 'block-link-plus'; if (app.plugins.plugins[id]) await app.plugins.disablePlugin(id); await app.plugins.enablePlugin(id); return { loaded: !!app.plugins.plugins[id], version: app.plugins.plugins[id]?.manifest?.version ?? null, activeFile: app.workspace.getActiveFile?.()?.path ?? null, title: document.title }; })()"`
  - Returned `{ loaded: true, version: "2.0.15", activeFile: "_blp_tmp/issue33-padding-host.md", title: "issue33-padding-host - blp - Obsidian 1.12.4" }`.
- New regression:
  - `node scripts/obsidian-cdp.js eval-file "scripts/cdp-snippets/inline-edit-embed-leaf-switch-remount.js"`
  - PASS, `ok: true`, plugin `2.0.15`.
  - A before switch: active/root/host all present, host/root counts 1/1.
  - A hidden after B: connected `is-loaded` embed, active false, host/root counts 0/0.
  - B active: active/root/host all present, host/root counts 1/1.
  - A after return without reopen: active/root/host all restored, host/root counts 1/1.
- Adjacent runtime checks:
  - `node scripts/cdp-snippets/inline-edit-embed-jump-affordance.js`: PASS after stable-state wait update, direct native link count 1, host/root counts 1/1, no system tail-token leak in active or remount snapshots.
  - `node scripts/cdp-snippets/inline-edit-embed-bottom-padding.js`: PASS, `paddingBottom: "0px"`, `hasJumpLink: true`.

## Files Changed

- `src/features/inline-edit-engine/InlineEditEngine.ts`
- `src/features/inline-edit-engine/__tests__/InlineEditEngine.live-preview-observer.test.ts`
- `scripts/cdp-snippets/inline-edit-embed-leaf-switch-remount.js`
- `scripts/cdp-snippets/inline-edit-embed-jump-affordance.js`
- `docs/agent/runs/BLP-2/implementation.md`

Final `git status --short`:

```text
 M scripts/cdp-snippets/inline-edit-embed-jump-affordance.js
 M src/features/inline-edit-engine/InlineEditEngine.ts
?? docs/agent/runs/BLP-2/
?? scripts/cdp-snippets/inline-edit-embed-leaf-switch-remount.js
?? src/features/inline-edit-engine/__tests__/InlineEditEngine.live-preview-observer.test.ts
```

## Risks / Open Questions

- `active-leaf-change` and `layout-change` can both schedule the same delayed lifecycle refresh during some workspace operations. The remount queue is idempotent, but review should check whether duplicate timers are acceptable.
- The new `isMarkdownViewShown()` fallback treats connected mocked DOM as shown only when Obsidian `isShown()` is unavailable. Production runtime should use Obsidian `isShown()`.
- The CDP runtime is Obsidian `1.12.4` on Windows; the original report named Obsidian `1.12.7` on Ubuntu. The scoped bug and fix are proven in the repo-owned runtime.

## Decision

Ready for code review. The patch exists, targeted and full tests pass, typed build passes, the required fixed-port CDP return-to-previous-file regression passes, and adjacent inline-edit shell runtime checks pass.
