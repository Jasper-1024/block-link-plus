## Status

- State: Middle-flow; ready for RCA review.
- Task: BLP-4 / GitHub #36, "Android embed scrolling jumps back to initial position".
- Workspace: `C:\Users\stati\Documents\Codex\2026-06-13\hermes\outputs\plane-symphony-like-demo\workspaces\BLP-4`.
- Start git status: `?? docs/agent/runs/BLP-4/`.
- End git status: `?? docs/agent/runs/BLP-4/`.
- Artifact validation: `corepack pnpm run agent:workflow-check` passed.
- Code changes: no product source, test, generated, CDP snippet, or OpenSpec files were edited. Temporary probes and the downloaded attachment were kept under `.tmp/BLP-4/`.

## Scope

- Classification: confirmed BLP runtime bug with an Android-specific caveat.
- Confirmed: in the isolated Obsidian/CDP runtime, Live Preview block embeds can move the host editor scroll position without user input while BLP inline-edit embeds are being mounted.
- Not fully confirmed: the exact Android 13 "returns back to the initial place" direction/pattern, because the available repo runtime is Obsidian Desktop on Windows and reports `app.isMobile === false`.
- In scope: source issue, tracker context, repo workflow/stage docs, OpenSpec boundary check, isolated CDP runtime, disposable embed notes, inline-edit mount instrumentation.
- Out of scope: implementation, generated bundle edits, permanent CDP snippet promotion, Plane/GitHub API writes, Android device validation.

## Evidence

- Issue claim: `docs/agent/runs/BLP-4/context/source-issue.md` contains the full GitHub #36 report. The reporter says that while scrolling a note with embeds, the scroll position repeatedly jumps back to the initial place on Android 13 with latest Obsidian and latest BLP. The linked attachment was downloaded to `.tmp/BLP-4/20260527_023622_001.mp4` (12,961,690 bytes). `ffmpeg`/`ffprobe` and local Python video libraries were not available, so the video was not frame-inspected in this run.
- Runtime setup: `powershell -NoProfile -ExecutionPolicy Bypass -File scripts/start-obsidian-debug-env.ps1 -Port 19225` returned `status: ready`, Obsidian `1.12.4`, vault `blp`, active file `_debug/start.md`, plugin `block-link-plus` loaded, version `2.0.15`, `blockLinkPlusLoaded: true`.
- Runtime target check: `$env:OB_CDP_PORT='19225'; $env:OB_CDP_TITLE_CONTAINS=' - blp - '; node scripts/obsidian-cdp.js list` returned the page target `"start - blp - Obsidian 1.12.4"` / `app://obsidian.md/index.html`.
- Dependency/build checks: `corepack pnpm install --frozen-lockfile` completed with the lockfile already up to date; `Test-Path .\node_modules` returned `True`; `node -e "require.resolve('ws')"` resolved repo-local `ws`; `corepack pnpm run build-with-types` passed.
- OpenSpec boundary: `openspec list` showed existing complete changes only; `openspec list --specs` listed current specs. No OpenSpec proposal was created because this is direct bug restoration/investigation.
- Static evidence: inline edit is enabled by default for block and heading embeds (`src/types/index.ts:135-139`). `InlineEditEngine` observes Live Preview DOM additions and queues `.internal-embed.markdown-embed` nodes (`src/features/inline-edit-engine/InlineEditEngine.ts:1014-1038`, `1065-1074`), then processes queued embeds (`src/features/inline-edit-engine/InlineEditEngine.ts:1104-1108`).
- Static evidence: during each inline embed mount, BLP calls the embedded editor's `cm.requestMeasure()` (`src/features/inline-edit-engine/InlineEditEngine.ts:1784-1788`), sets the embedded editor cursor, then calls `embed.view.editor?.scrollIntoView(..., true)` (`src/features/inline-edit-engine/InlineEditEngine.ts:1828-1834`). It also forces the host editor measure (`src/features/inline-edit-engine/InlineEditEngine.ts:1842-1843`) and installs a `ResizeObserver` that repeatedly calls host `requestMeasure()` for inline host size changes (`src/features/inline-edit-engine/InlineEditEngine.ts:1600-1621`).
- Control probe: `.tmp/BLP-4/issue36-scroll-probe.js` with inline edit disabled scrolled a disposable note containing 36 block embeds from `scrollTop: 0` to `5728`, with `snappedNearStart: false` and `finalNearStart: false`.
- Broad enabled probe: the same probe with inline edit enabled did not snap to top in Desktop, but it changed normal scroll dynamics while embeds virtualized. Example requested/observed samples: target `1074` settled at `616`, target `2507` settled at `1227.5`, target `3939` settled at `2655.5`, later target `5372` settled at `6399`; `snappedNearStart: false`, `finalNearStart: false`, app runtime `appIsMobile: false`.
- Instrumented repro, run 1: `.tmp/BLP-4/issue36-inline-mount-instrumented.js` opened a host note, scrolled it with native embeds visible, then enabled inline edit. The host scroll moved from `3273.5` with first visible text `tail 24` to `7151` with first visible text block `46`, without user scrolling. Delta: `+3877.5`. Event counts: `cm.requestMeasure: 1737`, `cm.dispatch.scrollIntoView: 28`, `editor.scrollIntoView: 28`.
- Instrumented repro, run 2: same probe moved the host scroll from `3273.5` / `tail 24` to `2068` / block `19`, without user scrolling. Delta: `-1205.5`. Event counts: `cm.requestMeasure: 821`, `cm.dispatch.scrollIntoView: 13`, `editor.scrollIntoView: 13`.
- Instrumented stack evidence: every captured `editor.scrollIntoView` event came from `InlineEditEngine.mountInlineEmbedCore` in `plugin:block-link-plus`, immediately after `setCursor`; every captured `cm.dispatch.scrollIntoView` event came through Obsidian `setSelection` from the same `mountInlineEmbedCore` path. Captured plugin measure events also came from the same mount path and the host remeasure callback.

## Root Cause

- Owner layer: BLP inline-edit embed mounting in `src/features/inline-edit-engine/InlineEditEngine.ts`.
- Exact files/functions/selectors: `InlineEditEngine.ensureLivePreviewObserver`, `queueExistingLivePreviewEmbeds`, `processObserverEntry`, `mountInlineEmbedCore`, `attachHostRemeasure`, and the selector `.internal-embed.markdown-embed`.
- What is happening: as Obsidian Live Preview inserts or virtualizes embed DOM while scrolling, BLP queues each embed and replaces the native preview with an embedded CodeMirror editor. Mounting each embed performs cursor/scroll operations inside the embedded editor and multiple measure requests against both the embedded editor and host editor.
- Why this explains the evidence: the instrumented runtime captured host scroll changes with no user scroll input at the same time that `mountInlineEmbedCore` emitted repeated `editor.scrollIntoView(..., true)`, `cm.dispatch(scrollIntoView)`, and host `requestMeasure()` activity. The direction varied by timing (`+3877.5` in one run, `-1205.5` in the next), which matches a race between Live Preview virtualization, inline editor replacement heights, and CodeMirror scroll anchoring/measurement rather than a deterministic navigation command.
- Cluster split:
  - Confirmed sub-bug: inline-edit embed mounting can relocate the host Live Preview scroll position during embed mount/remount.
  - Remaining environment gap: Android-specific repeated "back to initial position" behavior still needs an Android/mobile runtime or reporter video inspection to prove the exact direction and frequency.

## Fix Plan

- Proposed change: in fix-design, remove or gate mount-time embedded-editor scroll/focus side effects and preserve the host editor scroll around inline-embed mount/remeasure. The embedded editor should not call `scrollIntoView(..., true)` during passive mount while the user is scrolling the host note.
- Files expected to change: likely `src/features/inline-edit-engine/InlineEditEngine.ts`; add or update focused unit coverage under `src/features/inline-edit-engine/__tests__/` and a CDP regression probe only if implementation stage promotes the `.tmp` repro.
- Why this is the smallest correct fix: the runtime stack points to inline-edit mount side effects, not block-link generation, file-outliner routing, or native embed rendering. A fix can stay inside InlineEditEngine's passive mount path.
- Risks: removing all embedded-editor cursor initialization may affect keyboard/edit readiness after the user intentionally interacts with an inline embed. The design should distinguish passive mount from user-initiated focus/click.

## Validation Plan

- Targeted tests: add coverage that passive inline-embed mount does not request scroll into view on the embedded editor, while user-initiated focus behavior remains intact.
- Full tests/build: run `corepack pnpm test` and `corepack pnpm run build-with-types` during implementation.
- CDP/runtime checks: rerun `.tmp/BLP-4/issue36-inline-mount-instrumented.js` or a promoted equivalent on port `19225`; expected result is host `scrollTop` and visible text staying stable while inline embeds mount. Also rerun `scripts/cdp-snippets/inline-edit-embed-jump-affordance.js` because recent inline-edit fixes must preserve the native `.markdown-embed-link`.
- Manual checks: Android 13 or mobile Obsidian validation remains needed before claiming the exact reporter environment is fully fixed.

## Open Questions / Risks

- The source video could not be frame-inspected in this environment because video tooling was missing; it should be inspected later if exact UI direction matters.
- The isolated runtime is Windows Desktop Obsidian, not Android. It proves BLP-owned scroll relocation in the same embed/Live Preview area, but not Android-only app behavior.
- There may be two related effects: mount-time `scrollIntoView(..., true)` and repeated host `requestMeasure()` from inline host resize. Fix-design should test them independently before choosing the minimal patch.
