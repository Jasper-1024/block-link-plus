## Status

- State: Middle-flow
- Verdict: handoff
- Task: BLP-13 — GitHub #40: Nested embed is not shown
- Workspace: `C:\Users\stati\Documents\Codex\2026-06-13\hermes\outputs\plane-symphony-like-demo\workspaces\GH-40-BLP-13`
- Branch / commit: `symphony/GH-40-BLP-13` / `dd5b8db`
- Plane dossier: Runner-generated from this artifact and the validated Stage Result

## Scope

- Classification: confirmed bug
- In scope: a nested native file embed inside a block embed that BLP turns into an inline-edit surface in Obsidian Live Preview/source mode.
- Out of scope: implementation, Android device validation, the reporter's exact note fixture (the issue snapshot contains images but no Markdown), and unrelated whole-file embeds that do not enter BLP block inline-edit mode.

## Evidence

- Issue claim: GitHub #40 reports that an embed inside another embed is not shown when Block Link Plus is enabled, while the same content renders without the plugin. The report names Android 13 and current Obsidian/plugin versions; no comments or reproducible note text were supplied.
- Tracker feedback review: `tracker-feedback.md` contains no human comments, linked pages, or referenced pages. Its `Todo` review state does not change this investigation's scope or verdict.
- Static evidence:
  - `src/css/Editor/InlineEdit/InlineEditEngine.css:1-3` hides every `:not(.blp-inline-edit-host)` child of every descendant `.markdown-embed-content` under an active embed because the selector uses a descendant combinator after the active outer embed. The rule is `display: none !important`.
  - `src/features/inline-edit-engine/InlineEditEngine.ts:1531-1598` adds `blp-inline-edit-active` to the outer embed and inserts the BLP host into its native `.markdown-embed-content`.
  - `src/features/inline-edit-engine/InlineEditEngine.ts:1661-1779` mounts the outer block target as a detached MarkdownView and reparents that view into the BLP host.
  - `src/features/inline-edit-engine/EmbedLeafManager.ts:50-53` identifies an embed nested inside `.blp-inline-edit-root`; `InlineEditEngine.ts:1028-1031`, `1065-1071`, and `1670-1673` skip a second BLP takeover for such nested embeds. That skip prevents another editor mount, but it does not explain the native preview being `display:none`.
  - Existing targeted tests pass, but they do not cover this stylesheet/nested-DOM combination. `InlineEditEngine.embed-shell.test.ts` checks shell/link preservation and `inline-edit-layout-css.test.ts` checks bottom padding only.
- Runtime evidence:
  - The runner-owned lease was healthy and identity matched: Obsidian `1.12.4`, vault `blp-BLP-13`, plugin `block-link-plus` `2.0.16`, task key `BLP-13`, title filter `blp-BLP-13`, CDP port `19225`.
  - Minimal fixture: `_blp_tmp/gh40-host-block.md` embeds `![[_blp_tmp/gh40-outer-block.md#^gh40outer]]`; the outer block contains `![[_blp_tmp/gh40-inner-block.md]]`. The outer block resolves through metadata cache as `gh40outer` and is a list item containing the nested embed.
  - Red-capable command: `node scripts/obsidian-cdp.js eval-file '.tmp/GH-40-BLP-13/nested-block-embed-repro.js'` exited `1` with `BLP nested embed body missing`.
  - Native baseline with BLP disabled: the outer embed was not inline-edit active; the inner wrapper measured `79.16px`, its preview was `display:block` at `55.16px`, and the inner body was visible.
  - BLP enabled with default block inline-edit settings: the outer embed had one `blp-inline-edit-active` instance; the inner wrapper measured `24px`, its nested `.markdown-preview-view` was `display:none` with a `0×0` rect, and only the inner embed title remained visible in the screenshot. The inner sentinel remained in a hidden DOM subtree, so DOM presence alone is not treated as successful rendering.
  - CSS isolation: `node scripts/obsidian-cdp.js eval-file '.tmp/GH-40-BLP-13/css-nested-body-isolation.js'` removed and restored only the outer active class. Before removal, the inner preview was `display:none`/`0px`; after removal it was `display:block`/`71.16px`; restoring the class returned it to `display:none`/`0px`. This keeps the BLP host/reparenting in place and isolates the visibility change to the active-class CSS.
  - Setting isolation: `node scripts/obsidian-cdp.js eval-file '.tmp/GH-40-BLP-13/inline-edit-block-setting-isolation.js'` reloaded the plugin for each setting. `inlineEditBlock=false` produced `outerActive=false`, inner wrapper `79.16px`, preview `display:block`/`55.16px`; `inlineEditBlock=true` produced `outerActive=true`, inner wrapper `24px`, preview `display:none`/`0px`.
- Runtime proof package:
  - Runtime setup/reload: the root coordinator validated the inherited runner lease; the plugin was reloaded through the CDP setting-isolation probe before the final BLP run. No product build was run because this stage is investigation-only and no product files were changed.
  - Failure proof is captured in [`gh40-nested-block-runtime.json`](trace/investigation/gh40-nested-block-runtime.json).
  - Native screenshot: [`gh40-nested-block-native.png`](trace/investigation/gh40-nested-block-native.png) shows the inner heading and `GH40_INNER_BLOCK_SENTINEL`.
  - BLP screenshot: [`gh40-nested-block-blp.png`](trace/investigation/gh40-nested-block-blp.png) shows the outer block and inner embed title but not the inner body.
  - The runtime proof establishes the behavior on the runner's desktop Obsidian instance. Android 13, the reporter's exact Obsidian build, and any device-specific differences remain unproved.
- Commands run:
  - `node scripts/obsidian-cdp.js list` — resolved exactly one task page target, `start - blp-BLP-13 - Obsidian 1.12.4`, on port `19225`.
  - `node scripts/obsidian-cdp.js catalog list` — confirmed the maintained CDP catalog; no existing nested-embed regression matched this issue, so the temporary probe stayed under `.tmp/GH-40-BLP-13/`.
  - `node scripts/obsidian-cdp.js eval-file '.tmp/GH-40-BLP-13/nested-embed-repro.js'` — whole-file nested embed in Preview did not reproduce; native and BLP both showed the inner sentinel. This is a boundary check, not a reason to reject the block-embed reproduction.
  - `corepack pnpm test -- --runInBand src/features/inline-edit-engine/__tests__/InlineEditEngine.embed-shell.test.ts src/features/inline-edit-engine/__tests__/inline-edit-layout-css.test.ts` — 2 suites passed, 5 tests passed.
  - No product source, test, package, generated, or maintained CDP snippet files were changed. The only temporary probes are under `.tmp/GH-40-BLP-13/`; durable runtime evidence is under `trace/investigation/`.
- Files inspected:
  - `CONTEXT.md`
  - `src/css/Editor/InlineEdit/InlineEditEngine.css`
  - `src/features/inline-edit-engine/InlineEditEngine.ts`
  - `src/features/inline-edit-engine/EmbedLeafManager.ts`
  - `src/features/inline-edit-engine/__tests__/InlineEditEngine.embed-shell.test.ts`
  - `src/features/inline-edit-engine/__tests__/inline-edit-layout-css.test.ts`
  - `src/main.ts`
  - `docs/harness/stages/investigation.md`
  - `docs/harness/guides/evidence-format.md`
  - `docs/harness/guides/cdp-runtime.md`
  - `docs/harness/guides/runtime-proof-package.md`

## Investigation Loop

- Feedback loop: the temporary block repro creates deterministic notes, waits for metadata resolution, compares native and BLP rendering, asserts the nested preview body's computed visibility, and leaves the BLP fixture open for screenshot capture. It has been run red on the current runtime.
- Minimised scenario: one host note, one outer list-item block target, and one nested whole-file embed. Removing the nested embed makes the BLP outer block render normally; disabling only block inline-edit restores native nested rendering.
- Ranked hypotheses and probes:
  1. Broad active-embed CSS hides the nested preview body. Supported: removing only the outer active class restores the body while the BLP host remains mounted.
  2. `reparent()` or the nested-embed skip independently collapses the nested view. Not supported as primary cause: the same mounted DOM becomes visible when only the active class is removed.
  3. Block-range/CodeMirror truncation drops nested content. Not supported as primary cause: the nested DOM and sentinel remain, and the body returns without changing the range or editor mount.
  4. Native Obsidian/Android rendering is the cause. Not supported by the desktop baseline: BLP disabled renders the same fixture's inner body; the failure follows `inlineEditBlock=true` after a full plugin reload.

## Root Cause

- Owner layer: BLP inline-edit stylesheet scoping.
- Exact files/functions/selectors: `src/css/Editor/InlineEdit/InlineEditEngine.css:1-3`, specifically `.internal-embed.markdown-embed.blp-inline-edit-active .markdown-embed-content > :not(.blp-inline-edit-host)`. The outer active embed is an ancestor of the nested embed's own `.markdown-embed-content`; the descendant selector therefore applies `display:none !important` to the nested `.markdown-preview-view` even though that nested embed was intentionally skipped from another BLP editor mount.
- Why this explains the evidence: the selector is active only after `InlineEditEngine.mountInlineEmbedCore()` adds `blp-inline-edit-active` to the outer block embed. The native baseline has no active class and keeps the inner body at `55.16px`; BLP has the class and hides the inner body at `0px`. Removing/restoring only that class flips the computed style and geometry in lockstep. The screenshot pair matches the same transition: native inner content is visible; BLP leaves only the inner title.
- Cluster split, if any: none. The evidence points to one scoped CSS defect in the nested block-embed path, not independently fixable sub-bugs.

## Fix Plan

- Proposed change: constrain the active-embed hiding rule to the active embed's own direct `.markdown-embed-content` children, preserving the outer native preview replacement while allowing nested embed previews to render. The implementation agent should choose the compatible selector form and keep the existing top-level jump-affordance behavior intact.
- Files expected to change: `src/css/Editor/InlineEdit/InlineEditEngine.css`; add or extend a regression test at the CSS/DOM seam (the current layout CSS test is the nearest existing seam) and repeat the runtime probe after the fix.
- Why this is the smallest correct fix: runtime isolation rules out changing nested mount eligibility, block-range parsing, `EmbedLeafManager.reparent()`, or Android-specific behavior. The failure is caused by one over-broad selector, so the fix should narrow that selector rather than changing editor lifecycle behavior.
- Risks: selector scoping must still hide the outer native preview while the BLP host is mounted, preserve the top-level jump affordance, and work for block/heading/range variants. A desktop fix still requires an Android/mobile smoke check before release.
- No implementation was made in this investigation stage.

## Validation Plan

- Targeted tests: current characterization tests pass (`InlineEditEngine.embed-shell.test.ts` and `inline-edit-layout-css.test.ts`, 5/5). Add a regression assertion for nested preview visibility at the correct CSS/DOM seam, then rerun these tests.
- Full tests/build: not run in investigation; run `corepack pnpm test` and `corepack pnpm run build-with-types` after implementation.
- CDP/runtime checks: rebuild/reload the linked plugin, rerun `nested-block-embed-repro.js`, require native `innerBodyVisible=true` and BLP `innerBodyVisible=true` after the fix, and recapture both screenshots. Verify `inlineEditBlock=true` and the nested block boundary in source/Live Preview.
- Manual checks: confirm outer inline editing still hides only its own native preview, nested file/block/heading embeds display their bodies, and native jump affordances remain usable. Repeat on Obsidian Mobile/Android 13 or a current supported mobile build.

## Open Questions / Risks

- The GitHub snapshot does not include the reporter's Markdown, so the exact outer/inner target syntax and whether the report was in Live Preview or Reading mode are not confirmed. The reproduced boundary is the smallest BLP block-inline-edit scenario consistent with the claim.
- The runner desktop runtime proves the BLP mechanism, not Android-specific layout behavior. Mobile validation remains a release risk, not a blocker for this bounded RCA handoff.
- A fix must be reviewed for the separate whole-file path (`inlineEditFile`) and for reading-range/heading embeds; those variants were not claimed as independently reproduced here.

## Publication Targets

- Work item comment: Runner-generated concise handoff from the validated Stage Result.
- Work item links: none added by this worker.
- Project Page dossier: Runner-generated from the Stage Result/artifact; no direct tracker API calls made.
- Wiki/doc collection: none.
- Repo artifact: `docs/harness/runs/GH-40-BLP-13/investigation.md`.
- Runtime trace: `docs/harness/runs/GH-40-BLP-13/trace/investigation/`.
- Runner-generated Publish Plan JSON: derived by the outer Runner from the validated Stage Result.
