## Status

- Verdict: accepted
- Review Snapshot: base `8e8dce0e9bdd91d6c2b5147bb0e0b4493f87e145`; review tree `9497b6a35cabdec4a18cb059d9412a8732d9863f`; diff SHA-256 `0a6cf77d4733efc69a370b1960e4727bff7e3c2c90fa4fee83e4794da2f34d70`
- Freshness: the two changed product files match the review tree exactly; the pinned diff hash recomputes successfully.

## Plane Reply

Accepted for Human Review. The patch applies the approved one-combinator CSS
boundary: the active outer embed still hides its own native preview, while a
native nested embed below the BLP editor host is no longer hidden. The live
task-owned Obsidian proof reproduced the native baseline and passed the
after-fix visibility/geometry assertions after an awaited plugin reload.

## Blocking Findings

None.

## Non-Blocking Risks

- `src/features/inline-edit-engine/__tests__/inline-edit-layout-css.test.ts:7-47`
  proves the selector boundary with `Element.matches()` rather than applying
  a stylesheet and asserting computed display. This is the exact seam required
  by `fix-design.md:168-176`; the runtime proof independently checks computed
  visibility and non-zero geometry, so this is not a release-blocking gap.
- The new test leaves its fixture mounted at line 43. Jest gives this file an
  isolated DOM environment and the following test does not inspect that
  fixture, so no cross-test failure was observed; an `afterEach` cleanup would
  be optional hygiene.

## Contract Compliance

### Axis A — Contract / Spec

Pass. The source issue requires the nested embed to render when BLP is enabled
(`context/source-issue.md:14-16, 33-45`). The accepted design requires only the
first hide selector to change to the direct-child form while keeping the
declaration, jump-link rule, padding rule, nested eligibility, reparenting, and
editor lifecycle unchanged (`fix-design.md:83-108`; `fix-design-review.md:21-44`).

The pinned diff satisfies that contract at
`src/css/Editor/InlineEdit/InlineEditEngine.css:1` and adds the required
stylesheet-derived outer/nested regression at
`src/features/inline-edit-engine/__tests__/inline-edit-layout-css.test.ts:7-47`.
The unchanged implementation seams still place the host under the outer
embed's direct content (`InlineEditEngine.ts:1531-1598`) and skip nested
takeover (`InlineEditEngine.ts:1670-1673`). No unauthorized mode, lifecycle,
generated-file, or package change is present.

The delegated Contract/Spec review found no material finding. I independently
confirmed the exact diff against the accepted design and the current runtime
boundary.

## Correctness And Standards

### Axis B — Correctness / Standards

Pass. The new selector matches the outer native preview but not the nested
preview under the host/editor subtree. An independent DOM sensitivity probe
reported `oldOuter=true, oldNested=true, newOuter=true, newNested=false`.
The delegated Standards review found no hard repository-standard violation and
no material Fowler-smell finding. The CodeMirror history/filter/range checks
are not relevant because the patch changes only CSS and a DOM selector test.

The non-blocking test limitations above are real but do not weaken the accepted
runtime gate. The rebuilt `styles.css` contains the patched selector, and the
live after-fix probe selected the exact outer `src` and asserted:

- one active outer embed, one connected host/editor, and one outer root;
- outer native preview `display: none` with a `0x0` rectangle;
- nested native body connected, `display: block`, visible, sentinel-bearing,
  and `543x71.15625` pixels;
- zero nested active embeds and zero nested BLP roots; and
- a connected, visible top-level jump affordance.

## Validation Limitations

- Independently passed targeted tests (`2 suites / 6 tests`), the full suite
  (`42 suites / 230 tests`), `corepack pnpm exec tsc --noEmit -skipLibCheck`,
  `corepack pnpm run agent:workflow-check`, and `git diff --check`.
- The implementation recorded `corepack pnpm run build-with-types` as passed
  (`implementation.md:63-70`). This read-only review did not rerun the
  write-producing production build; it verified the patched selector in the
  generated `styles.css` and exercised that rebuilt plugin through CDP.
- Independently reran the inherited lease at task `BLP-13`, vault `blp-BLP-13`,
  Obsidian `1.13.4`, plugin `block-link-plus` `2.0.16`, port `19225`:
  `prepare-native-screenshot.js`, `assert-blp-after-fix.js`, the maintained
  `inline-edit-embed-jump-affordance.js` regression, and
  `cleanup-gh40-runtime.js`. All returned passed status; cleanup returned no
  warnings. The native and BLP screenshots were visually inspected at
  `trace/implementation/gh40-nested-block-native.png` and
  `trace/implementation/gh40-nested-block-blp.png`.
- Android 13, the reporter's exact Markdown/view mode, whole-file Preview, and
  broader mobile/block/heading/range variants remain unproved by the accepted
  desktop scope. The first direct `require('jsdom')` ad-hoc probe was unavailable
  under pnpm's layout; rerunning it against the resolved pnpm package path
  passed and produced the sensitivity result above.

## Required Revisions

None.

## Decision

`accepted` — both review axes pass against the current runner-pinned snapshot,
the authorized CSS/test scope is complete, runtime resolution is independently
reproducible with visual evidence and cleanup, and no blocking finding remains.
The remaining mobile and fixture questions are explicit out-of-scope facts for
the Human Review gate, not reasons to broaden this patch.
