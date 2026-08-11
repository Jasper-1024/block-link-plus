## Status

- Verdict: accepted
- Reviewer: BLP adversarial RCA review
- Task: BLP-13 — GitHub #40: Nested embed is not shown
- Reviewed commit: `dd5b8db1ee224134173dd2fab7029caf3784f7f5`

## Plane Reply

The RCA is accepted for the explicitly bounded path: a native file embed nested
inside a block embed that BLP takes over for inline editing in Live Preview/source
mode. Independent CDP checks reproduce the failure and isolate it to the outer
`blp-inline-edit-active` stylesheet rule. The parent may leave the RCA loop and
continue to fix design. Do not generalize this acceptance to Android, the
reporter’s exact note, or whole-file embeds in Preview; those remain validation
boundaries.

## Accepted Facts

- The source issue reports that an embed inside another embed disappears with
  Block Link Plus enabled, on Android 13, but provides no Markdown fixture or
  comments. The investigation correctly narrowed the reproducible boundary
  instead of claiming every nested-embed path is affected.
- `src/css/Editor/InlineEdit/InlineEditEngine.css:1-3` uses a descendant
  combinator before `.markdown-embed-content`. With the outer embed active, the
  selector can therefore select the direct children of a nested embed’s own
  `.markdown-embed-content`; `display: none !important` hides the nested native
  preview body.
- `InlineEditEngine.ts:1531-1598` adds the active class and mounts the BLP host
  in the outer embed’s direct native content. `InlineEditEngine.ts:1670-1673`
  and the observer guards at `1028-1031`, `1065-1071` intentionally skip a
  second BLP takeover for nested embeds. That skip does not prevent the
  ancestor stylesheet from hiding the native nested preview.
- On the healthy task lease (Obsidian 1.12.4, vault `blp-BLP-13`, plugin
  `block-link-plus` 2.0.16, CDP port 19225), the minimal block fixture showed:
  native nested preview `display:block` with a non-zero body rectangle; BLP
  block inline-edit active with the nested preview `display:none` and a zero
  body rectangle. The nested DOM and sentinel remained present, so DOM presence
  was not mistaken for rendered visibility.
- Removing only the outer active class restored the nested body while the BLP
  host/reparented editor remained in place; restoring only that class hid the
  body again. A full plugin reload with `inlineEditBlock=false` versus `true`
  produced the same visible-versus-hidden transition.
- The native and BLP screenshots in
  `trace/investigation/gh40-nested-block-native.png` and
  `trace/investigation/gh40-nested-block-blp.png` match the DOM measurements:
  the native screenshot shows the inner heading and sentinel, while the BLP
  screenshot retains only the inner embed title.
- The targeted characterization suites pass: 2 suites and 5 tests. No product
  source, tests, or package files were changed during this review.

## Challenges

- Reparenting or nested-embed eligibility was challenged by removing only the
  outer active class. The nested view became visible without changing the BLP
  host, editor mount, block range, or nested-skip logic. This makes the CSS rule
  the supported primary mechanism rather than an editor-lifecycle inference.
- Block parsing or CodeMirror truncation was challenged by the metadata cache,
  the retained nested DOM, and the retained sentinel. The body’s geometry—not
  merely text presence—changed with the active class.
- Native Obsidian rendering was challenged with the same fixture and runtime
  after disabling BLP; the inner body rendered normally. This does not prove
  Android behavior, but it does establish a BLP-specific desktop failure.
- The issue cluster was challenged with a whole-file nested embed in Preview;
  that boundary did not reproduce. The investigation’s block-embed/source-mode
  scope is therefore necessary and appropriately conservative.
- The missing regression assertion at the nested CSS/DOM seam is a downstream
  test-coverage gap, not a blocking RCA gap: the runtime proof directly
  exercises the disputed visibility mechanism and the source selector is exact.

## Evidence Gaps

- The reporter’s exact Markdown, Obsidian build, plugin build, and view mode are
  unknown; the issue snapshot contains screenshots but no note text.
- The runner proves the mechanism on desktop Obsidian 1.12.4, not on Android 13
  or a specific mobile layout. Mobile confirmation remains a release risk.
- No post-change resolution evidence exists because no implementation was
  authorized or made in this stage. Full build and fix validation belong to
  later stages.

## Required Investigation Follow-up

None is required to resolve the RCA. The evidence is current, source-specific,
runtime-reproduced, and sufficiently narrow for the parent item to continue to
fix design. Downstream validation must retain the nested block boundary and
check that the outer inline-edit shell still behaves correctly; it must not
reinterpret this review as proof for Android or unrelated whole-file paths.

## Created Child Items

None. The prior investigation did not recommend a split or a bounded mitigation
child, and the evidence supports one scoped stylesheet RCA.

## Decision

`accepted` — the owner layer is BLP inline-edit stylesheet scoping, the blocking
mechanism is directly demonstrated by runtime CSS isolation, and the affected
path is specific enough for a later implementation agent to work without
reopening the RCA loop. The unresolved device and fixture questions are
validation risks, not competing root causes or grounds for human-review deferral.

## Research Notes

- Runtime lease was validated with `blp_control_plane.ensure_runtime` and
  `node scripts/obsidian-cdp.js list`; the exact task page remained selected
  throughout review.
- Maintained snippet inventory was checked with
  `node scripts/obsidian-cdp.js catalog list`; the task-specific probes remained
  temporary under `.tmp/GH-40-BLP-13/`.
- Independent probe commands and key results:
  - `node scripts/obsidian-cdp.js eval-file '.tmp/GH-40-BLP-13/nested-block-embed-repro.js'`
    failed at the intended red assertion: `BLP nested embed body missing`.
  - `node scripts/obsidian-cdp.js eval-file '.tmp/GH-40-BLP-13/css-nested-body-isolation.js'`
    returned `none/0` before, `block/71.15625px` after removing the outer class,
    and `none/0` after restoring it.
  - `node scripts/obsidian-cdp.js eval-file '.tmp/GH-40-BLP-13/inline-edit-block-setting-isolation.js'`
    returned visible for `inlineEditBlock=false` and hidden for `true` after
    plugin reloads.
  - `corepack pnpm test -- --runInBand src/features/inline-edit-engine/__tests__/InlineEditEngine.embed-shell.test.ts src/features/inline-edit-engine/__tests__/inline-edit-layout-css.test.ts`
    passed 2 suites and 5 tests.
- Durable runtime evidence is in
  `docs/harness/runs/GH-40-BLP-13/trace/investigation/gh40-nested-block-runtime.json`.
  No external framework research was needed; the browser behavior is directly
  established by the task runtime and repository source.

## Risks / Open Questions

- A later selector change must be validated against the outer native-preview
  replacement, top-level jump affordances, and other block/heading/range paths;
  this review does not validate an unmade change.
- Android/mobile rendering may expose additional layout differences or a
  separate defect. It should be treated as follow-up validation, not silently
  folded into this desktop RCA.
- The whole-file Preview boundary was not reproduced and should remain out of
  scope unless new evidence demonstrates a separate failure.
