## Status

- Verdict: accepted
- Task: BLP-4 / GitHub #36, Android embed scrolling jumps back to initial position.
- Reviewer scope: adversarial RCA review only; no product source, tests, generated files, CDP snippets, package metadata, or OpenSpec files were edited.
- Start git status observed by reviewer: `?? docs/agent/runs/BLP-4/`.
- End git status observed by reviewer: `?? docs/agent/runs/BLP-4/`.

## Plane Reply

The RCA is accepted. The investigation correctly identifies BLP inline-edit embed mounting as the owner layer, and the reviewer reran the CDP runtime plus an additional scroll-while-enabled probe that reproduced host scroll displacement while passive inline-edit embed mounts were happening.

What is accepted: this is not a block-link generation or native Obsidian embed-rendering RCA. Runtime stacks repeatedly point into `InlineEditEngine.mountInlineEmbedCore`, where passive embed mount performs cursor/scrollIntoView work and host/editor measurement while Live Preview embeds are inserted or virtualized.

What is refined: do not overstate the exact Android 13 pattern. The repo runtime is Desktop Obsidian with `app.isMobile === false`, and the GitHub video was not frame-inspected. The accepted RCA is "BLP passive inline-edit embed mounting can move the host editor scroll position"; exact mobile frequency/direction remains validation risk for fix design or implementation.

The next stage may proceed to fix design. It should design against passive mount side effects and preserve user-initiated focus/navigation behavior, especially the native embed jump affordance from the recent inline-edit work.

## Accepted Facts

- `docs/agent/runs/BLP-4/context/source-issue.md` contains the full GitHub #36 claim: while scrolling a note with embeds, the position repeatedly jumps back on Android 13 with latest Obsidian and BLP.
- The task is labeled `cdp-required`, and the investigation used the fixed-port isolated Obsidian/CDP runtime as required by `docs/agent/cdp-validation.md`.
- The reviewer independently started the fixed runtime on port `19225`. The launcher returned `status: ready`, Obsidian `1.12.4`, vault `blp`, BLP loaded as `block-link-plus`, version `2.0.15`, and `blockLinkPlusLoaded: true`.
- The reviewer confirmed the CDP target with `node scripts/obsidian-cdp.js list`: `"start - blp - Obsidian 1.12.4"` at `app://obsidian.md/index.html`.
- Static source ownership is coherent:
  - Inline edit is enabled by default for block and heading embeds in `src/types/index.ts`.
  - `InlineEditEngine` observes `.internal-embed.markdown-embed` additions and queues existing/new Live Preview embeds.
  - `mountInlineEmbedCore` performs embedded-editor `requestMeasure()`, sets the cursor, calls embedded-editor `scrollIntoView(..., true)`, and requests host editor measure.
  - `attachHostRemeasure` installs a `ResizeObserver` that schedules host `requestMeasure()` while inline host size changes.
- The investigation's instrumented runtime evidence is credible: it captured no-user-scroll host scroll changes during inline embed mount, with `editor.scrollIntoView`, `cm.dispatch.scrollIntoView`, and plugin measure events stacked through `InlineEditEngine.mountInlineEmbedCore`.
- The reviewer reran `.tmp/BLP-4/issue36-inline-mount-instrumented.js`. It reproduced a host scroll move from `3273.5` to `2068` (`scrollDelta: -1205.5`) while inline embeds mounted. Event counts were `cm.requestMeasure: 823`, `cm.dispatch.scrollIntoView: 13`, and `editor.scrollIntoView: 13`; scroll stacks pointed to `InlineEditEngine.mountInlineEmbedCore`.
- The reviewer added and ran `.tmp/BLP-4/issue36-scroll-while-enabled-review.js` to challenge scenario fidelity. With inline edit enabled before scrolling, requested scroll targets settled far from the requested positions while new embeds mounted:
  - target `2487` settled at `3652` (`+1165`)
  - target `4974` settled at `4105.5` (`-868.5`)
  - target `7461` settled at `6064` (`-1397`)
  - target `9948` settled at `8936` (`-1012`)
- In that closer scroll-while-enabled probe, event counts were `cm.requestMeasure: 4712`, `cm.dispatch.scrollIntoView: 71`, and `editor.scrollIntoView: 71`; captured scroll stacks again pointed to `InlineEditEngine.mountInlineEmbedCore`.
- Reviewer settings-restoration check after probes showed active file restored to `_debug/start.md` and BLP inline settings restored to defaults: `inlineEditEnabled: true`, `inlineEditBlock: true`, `inlineEditHeading: true`, `inlineEditFile: false`.
- `corepack pnpm run agent:workflow-check` passed after the RCA review probe work.

## Challenges

- The investigation's strongest original reproduction toggled inline edit while already scrolled. That proved passive mount can move the host scroll, but it was not identical to the user's "while scrolling" sequence.
- The added reviewer probe addressed that challenge for the Desktop runtime by enabling inline edit first, then scrolling through a long embed host note while instrumentation recorded passive mount-time scroll/measure activity.
- The RCA should not claim the exact Android "returns back to the initial place" direction is reproduced. Current evidence proves large host scroll displacement in the same embed/Live Preview/inline-edit area, not the precise Android visual pattern.
- The root cause should stay at the owner-layer/mechanism level. The evidence supports `InlineEditEngine.mountInlineEmbedCore` and passive mount side effects; it does not yet isolate whether the minimal implementation fix is only removing embedded-editor `scrollIntoView`, only preserving host scroll around mount/measure, or both.
- The GitHub attachment was downloaded but not frame-inspected in the investigation because local video tooling was unavailable. That limits visual matching against the reporter's screen recording.

## Evidence Gaps

- Non-blocking: Android/mobile validation remains open. The available runtime reports `app.isMobile === false`.
- Non-blocking: the reporter video still needs frame inspection if the team wants exact visual comparison or to distinguish "jump back to initial place" from broader scroll-anchor displacement.
- Non-blocking for RCA, but important for fix design: isolate the relative contribution of embedded-editor `setCursor`/`scrollIntoView`, embedded editor `requestMeasure`, host `requestMeasure`, and `ResizeObserver` remeasure before choosing the smallest patch.

## Required Investigation Follow-up

- None blocking. The RCA has enough runtime and source evidence to leave the RCA loop.
- Do not send the next run back to broad investigation unless new evidence contradicts the inline-edit mount owner layer.
- If a follow-up investigation is requested anyway, make it narrow: run the same probe on Android/mobile Obsidian or inspect the GitHub video to compare direction/frequency, rather than redoing static owner mapping.

## Decision

Accepted. The investigation's main RCA survives adversarial review: BLP passive inline-edit embed mounting can relocate the host Live Preview scroll position while embeds are inserted or virtualized. The owner layer is `src/features/inline-edit-engine/InlineEditEngine.ts`, especially `mountInlineEmbedCore` plus the host remeasure path.

This is complete enough for fix design because the accepted failure boundary is narrow: passive inline-edit mount must not cause host editor scroll jumps. A later design can refine the exact patch while preserving user-initiated focus/edit behavior.

## Research Notes

- Commands run by reviewer:
  - `git status --short`
  - `node scripts/obsidian-cdp.js list` with `OB_CDP_PORT=19225` and `OB_CDP_TITLE_CONTAINS=' - blp - '`
  - `powershell -NoProfile -ExecutionPolicy Bypass -File scripts/start-obsidian-debug-env.ps1 -Port 19225`
  - `node scripts/obsidian-cdp.js eval-file '.tmp/BLP-4/issue36-inline-mount-instrumented.js'`
  - `node scripts/obsidian-cdp.js eval-file '.tmp/BLP-4/issue36-scroll-while-enabled-review.js'`
  - `node scripts/obsidian-cdp.js eval "JSON.stringify(...settings...)"` for state restoration
  - `corepack pnpm run agent:workflow-check`
  - `Stop-Process -Id 166972 -Force` to stop the disposable Obsidian debug runtime launched by this review
- No external framework research was needed for this verdict; repo source plus live Obsidian/CDP primary runtime evidence was sufficient.
- No OpenSpec proposal was created because this remains direct bug restoration, not a new capability or intended behavior change.

## Risks / Open Questions

- Fix design must preserve deliberate user-initiated focus, selection, and navigation into inline embeds. Passive mount should be made scroll-neutral without breaking actual editing readiness.
- Recent inline-edit work preserved the native `.markdown-embed-link`; any fix should rerun that regression because scroll-neutral mounting must not regress the jump/open affordance.
- Android may amplify the same passive-mount problem differently because viewport size, touch scroll, mobile CodeMirror behavior, and Obsidian mobile virtualization can differ from Desktop.
- End git status showed only run artifacts under `docs/agent/runs/BLP-4/`; the temporary probe is under ignored `.tmp/BLP-4/`.
