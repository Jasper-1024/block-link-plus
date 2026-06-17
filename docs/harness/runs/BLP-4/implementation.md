## Status

- State: Implementation
- Verdict: ready-for-review
- Task: BLP-4 / GitHub #36, Android embed scrolling jumps back to initial position.
- Start git status before edits: `?? docs/agent/runs/BLP-4/`
- End git status after validation: `M scripts/cdp-snippets/inline-edit-embed-jump-affordance.js`; `M src/features/inline-edit-engine/InlineEditEngine.ts`; `?? docs/agent/runs/BLP-4/`; `?? src/features/inline-edit-engine/__tests__/InlineEditEngine.mount-scroll.test.ts`
- Implementation scope followed the accepted fix-design review: first patch only, no host scroll guard.

## Plane Reply

Implemented the accepted narrow fix in `InlineEditEngine.mountInlineEmbedCore`: passive Live Preview inline-edit mounts now skip embedded-editor `setCursor` and `scrollIntoView(..., true)`, while non-passive outliner mounts keep the existing cursor/reveal behavior.

Validation passed: targeted inline-edit tests, full Jest, type/build, fixed-port Obsidian/CDP scroll probes, click/focus probe, jump-affordance regression, bottom-padding regression, leaf-switch remount regression, and workflow check. Jest still prints the pre-existing worker teardown warning after passing; it did not fail the run.

Code review should attack whether the passive/non-passive split is narrow enough, and whether the CDP residual numeric `scrollTop` adjustment with stable visible content is acceptable without adding the rejected first-patch scroll guard.

## Scope

- In scope: passive Live Preview inline-edit embed mount in `src/features/inline-edit-engine/InlineEditEngine.ts`.
- In scope: focused regression tests for passive mount, outliner mount, and user interaction focus after passive mount.
- In scope: one validation-snippet repair so the mandatory jump-affordance CDP regression checks visible text via `innerText` instead of hidden DOM `textContent`.
- Out of scope: host scroll preservation guard, Android-specific code paths, disabling inline edit on mobile, OpenSpec changes, block-link generation, native Obsidian embed virtualization.

## Changes Made

- Added `isPassiveLivePreviewMount()` to classify passive Live Preview observer mounts.
- Computed the passive flag in `mountInlineEmbedCore` after the existing skip checks.
- Wrapped only the embedded editor `setCursor` / `scrollIntoView(..., true)` block so it does not run for passive `origin: "live-preview"` mounts.
- Preserved the rest of passive mount setup: shell preparation, embedded leaf creation/reparenting, `contentEditable`, embedded/host measure requests, inline-edit extensions, range annotation dispatch, debug fields, event listeners, and native `.markdown-embed-link` ownership.
- Updated `scripts/cdp-snippets/inline-edit-embed-jump-affordance.js` to use `embed.innerText ?? embed.textContent` for the hidden-tail assertion. The previous `textContent` check failed on hidden native preview DOM while visible text was clean.

## Tests Added Or Updated

- Added `src/features/inline-edit-engine/__tests__/InlineEditEngine.mount-scroll.test.ts`.
- Test coverage added:
  - passive Live Preview mount does not call embedded editor `setCursor` or `scrollIntoView`;
  - passive mount still dispatches inline-edit range annotations and requests embedded/host measures;
  - non-passive outliner mount still calls the existing cursor/reveal path;
  - mousedown after passive mount focuses the embedded editor without cursor/reveal calls.

## Validation

- `corepack pnpm install --frozen-lockfile`: passed; lockfile already up to date. Printed Node `DEP0169` warning from tooling.
- `corepack pnpm test -- src/features/inline-edit-engine`: passed, 6 suites / 15 tests. Jest printed a worker teardown warning after pass.
- `corepack pnpm test`: passed, 40 suites / 219 tests. Same non-failing Jest worker teardown warning.
- `corepack pnpm run build-with-types`: passed (`tsc -noEmit -skipLibCheck` and production esbuild). The ignored local runtime bundle `main.js` contains `isPassiveLivePreviewMount`; `main.js` / `styles.css` are gitignored release artifacts.
- Initial `node scripts/obsidian-cdp.js list` on port `19225`: failed with `ECONNREFUSED`, so the fixed runtime was started as required.
- `powershell -NoProfile -ExecutionPolicy Bypass -File scripts/start-obsidian-debug-env.ps1 -Port 19225`: passed with `status: ready`, process `315528`, Obsidian `1.12.4`, vault `blp`, `blockLinkPlusLoaded: true`, BLP version `2.0.15`.
- `node scripts/obsidian-cdp.js list`: passed, target `"start - blp - Obsidian 1.12.4"` at `app://obsidian.md/index.html`.
- `corepack pnpm run agent:workflow-check`: passed.
- Runtime cleanup: `Stop-Process -Id 315528 -Force` completed; follow-up process check found no process.

## Runtime Evidence

- `.tmp/BLP-4/issue36-inline-mount-instrumented.js`: passed. Passive mount produced `scrollIntoViewEvents: []`, `eventCounts: { "cm.requestMeasure": 622 }`, first visible text stayed `tail 24`, and numeric `scrollDelta` was `-105.5` while scroll height changed during inline replacement.
- `.tmp/BLP-4/issue36-scroll-while-enabled-review.js`: passed. Scroll-while-enabled produced `scrollIntoViewEvents: []`; settled deltas were `-301`, `-13.5`, `-82.5`, and `+2`, instead of the accepted pre-fix large mount-correlated jumps.
- `.tmp/BLP-4/issue36-click-focus-postfix.js`: passed. Click/mousedown after passive mount focused inside `.blp-inline-edit-root`, visible text stayed clean, and host `scrollDelta` was `0`.
- `scripts/cdp-snippets/inline-edit-embed-jump-affordance.js`: first run failed because `textContent` included hidden native preview DOM with `blp_sys`; follow-up eval showed `innerText` and inline root visible text were clean. After the snippet repair, rerun passed with one active embed, one direct native link, visible link, navigation before/after inline edit, and clean visible text.
- `scripts/cdp-snippets/inline-edit-embed-bottom-padding.js`: passed with `paddingBottom: "0px"`, visible target text, and native jump link present.
- `scripts/cdp-snippets/inline-edit-embed-leaf-switch-remount.js`: passed; host A/B/remount each had exactly one host/root while visible, and no visible system tail tokens after return.

## Files Changed

- `src/features/inline-edit-engine/InlineEditEngine.ts`
- `src/features/inline-edit-engine/__tests__/InlineEditEngine.mount-scroll.test.ts`
- `scripts/cdp-snippets/inline-edit-embed-jump-affordance.js`
- `docs/agent/runs/BLP-4/implementation.md`
- Temporary ignored probe: `.tmp/BLP-4/issue36-click-focus-postfix.js`

## Risks / Open Questions

- Android/mobile Obsidian remains unvalidated. This implementation is validated in the repo's Windows Desktop Obsidian/CDP runtime (`app.isMobile === false`), consistent with the accepted RCA/design caveat.
- The passive-mount probe still shows a small numeric `scrollTop` adjustment while inline replacement changes scroll height, but the visible content marker remains stable and plugin-origin scroll/reveal stacks are gone.
- `cm.requestMeasure` and host remeasure activity still occur by design. If Android still reports jumps after this patch, the next design should revisit the previously rejected guard with fresh post-patch evidence.
- Jest passes but prints a worker teardown warning after completion.

## Decision

Ready for code review. The accepted first patch is implemented, tested, built, and runtime-validated without adding the rejected host scroll guard or changing OpenSpec.
