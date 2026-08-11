## Status

- Verdict: accepted
- Reviewer: BLP adversarial fix-design reviewer
- Task: BLP-13 — GitHub #40: Nested embed is not shown
- Reviewed design: `docs/harness/runs/GH-40-BLP-13/fix-design.md`

## Plane Reply

The fix design is accepted for implementation. The single direct-child selector
change follows the accepted CSS RCA, is bounded to the reproduced block
inline-edit path, and preserves the outer shell. The design has an honest TDD
slice plus a concrete runtime-fix package. Implementation must capture the new
test's expected RED result, use an awaited plugin reload, prove the nested body
with geometry in the actual host/editor subtree, and report cleanup success.
Android, whole-file Preview, and the reporter's exact fixture remain validation
boundaries rather than implementation scope.

## Accepted Design Points

- The owner and change boundary are correct: change only the first hide-rule
  selector in `src/css/Editor/InlineEdit/InlineEditEngine.css:1-3` from the
  descendant form to the direct-child form. Keep the declaration, the jump-link
  rule, and the padding rule unchanged.
- The proposed selector preserves the intended outer behavior while stopping
  the ancestor rule from selecting the nested embed's native preview. This is
  consistent with the accepted RCA's evidence that nested takeover is already
  intentionally skipped in `InlineEditEngine.ts:1670-1673` and that shell
  placement is handled by `prepareEmbedShell()` at `InlineEditEngine.ts:1531-1598`.
- The alternatives are correctly rejected. Removing the hide rule would expose
  duplicate outer content; changing nested eligibility or reparenting would
  alter lifecycle ownership; a TypeScript DOM repair would duplicate CSS
  ownership and introduce timing risk; and broadening to other modes would
  exceed the accepted RCA boundary.
- The design does not claim that desktop CDP proves Android 13. It also keeps
  whole-file/Preview-only behavior and any padding-quality issue out of this
  corrective slice.
- The proposed test seam is stable and honest: derive the first hide-rule
  selector from the real stylesheet and exercise it with `Element.matches()` on
  an explicit outer/nested DOM hierarchy. The test must prove both sides of the
  boundary: the outer direct preview matches and the nested preview does not.
- The runtime plan is concrete enough for implementation: identity snapshot,
  native baseline, BLP after-state, two screenshots, outer-shell invariants,
  nested active/root counts, maintained jump regression, and cleanup output.

## Challenges

- The live task runtime reproduced the disputed mechanism. With the current
  loaded selector, the probe matched three native preview bodies; the proposed
  direct-child selector matched only the outer direct preview. The nested body
  changed from `display: none`, `0x0` to `display: block`, `543x71.15625` when
  only the loaded rule was temporarily replaced. The outer native body stayed
  hidden, the outer active count stayed `1`, the BLP host stayed connected, and
  the top-level jump link stayed connected. The rule was restored before the
  probe returned.
- The repository baseline is green: the targeted CSS and embed-shell suites
  passed 2 suites and 5 tests. This is baseline evidence only; no new RED
  assertion exists until implementation adds S-1, so the implementation agent
  must record the expected failing run before changing CSS.
- The design's sketch showing `.blp-inline-edit-host > .cm-editor` is a
  simplified test model, not the exact Obsidian DOM. The live nested embed is
  below the host through source-view/scroller wrappers. The implementation
  must use subtree containment beneath the exact outer host/editor and must not
  turn the sketch into a direct host-to-editor runtime assumption.
- The standalone reload example in the design uses a semicolon-separated
  disable/enable expression. Because plugin lifecycle methods are asynchronous,
  the implementation proof must await disable completion before enable (or have
  the phase probe own that awaited reload). A race-prone reload command cannot
  satisfy S-2, but correcting this execution detail does not change the design
  or product scope.
- The after-fix proof must assert computed visibility and non-zero geometry, not
  DOM presence alone. It must also scope every nested lookup below the selected
  outer embed; global duplicate matches would make a false positive possible.

## Required Revisions

No design-scope revision is required. The following are mandatory
implementation-proof conditions:

1. S-1 must add the stylesheet-derived CSS/DOM regression and preserve the
   existing `InlineEditEngine.embed-shell.test.ts` characterization coverage.
   The before run must fail for the current descendant selector, and the after
   run must pass with the one-combinator CSS change.
2. S-2 must use an awaited plugin disable/enable sequence, record the actual
   inherited runtime identity, and persist a cleanup snapshot that the final
   cleanup probe can consume across phase calls. Any cleanup warning or error
   fails the slice.
3. The runtime assertion must select the outer block embed by its exact `src`,
   resolve its host/editor subtree, and prove the outer native preview remains
   replaced while the nested native body is connected, visible, and
   non-zero-sized. It must not satisfy the claim from a global nested match.

## Implementation Readiness

Ready for the implementation stage. The smallest implementation scope is:

- `src/css/Editor/InlineEdit/InlineEditEngine.css`: replace only the first
  hide-rule descendant combinator with `>`.
- `src/features/inline-edit-engine/__tests__/inline-edit-layout-css.test.ts`
  (or an equivalent same-directory CSS/DOM test): add the stylesheet-derived
  nested-boundary regression.

No change is authorized to nested mount eligibility, reparenting, editor
lifecycle, generated files, package metadata, maintained CDP snippets, or
unrelated embed modes. If S-1 does not go RED for the accepted selector reason,
or if S-2 contradicts the accepted boundary, stop with a design-mismatch
result instead of broadening the patch.

## TDD Slice Review

| Slice | Mode | Review result | Public seam | Before evidence | Required after evidence |
| --- | --- | --- | --- | --- | --- |
| S-1 | `tdd` | Accepted | First hide selector parsed from the real CSS and applied with `Element.matches()` to the explicit outer/nested hierarchy; existing shell tests remain characterization coverage. | Current targeted baseline is green (2 suites/5 tests). The new nested assertion must be added and shown RED before the CSS change. | The same stylesheet-derived assertion passes: outer direct preview matches, nested preview does not; shell suite remains green. |
| S-2 | `runtime-fix` | Accepted | Task-owned CDP identity, phase probes, screenshots, DOM/geometry assertions, and maintained `inline-edit-embed-jump-affordance.js`. | Existing investigation trace proves native nested body visible and BLP body hidden. The design probe independently reproduced `none/0x0` and candidate `block/543x71.15625`. | After build/reload: one exact outer active embed, one connected host/root, outer native preview hidden, jump link visible, nested body visible/non-zero, nested active/root counts zero, two screenshots, and regression/cleanup statuses passed. |

The declared modes are appropriate: S-1 introduces a new observable selector
behavior, while S-2 must repeat the real runtime symptom after rebuild/reload.
No refactor allowance is needed.

## Validation Coverage

- Targeted tests passed before implementation with:
  `corepack pnpm test -- --runInBand src/features/inline-edit-engine/__tests__/inline-edit-layout-css.test.ts src/features/inline-edit-engine/__tests__/InlineEditEngine.embed-shell.test.ts`
  Result: 2 suites and 5 tests passed. This does not substitute for the future
  S-1 RED/green evidence.
- The current source baseline built with:
  `corepack pnpm run build-with-types`
  Result: passed; no product or generated-file diff was left by the build.
- The healthy runner-owned runtime was validated as task `BLP-13`, vault
  `blp-BLP-13`, Obsidian `1.13.4`, plugin `block-link-plus` `2.0.16`, branch
  `symphony/GH-40-BLP-13`, worktree
  `C:/Users/stati/Documents/Codex/2026-06-13/hermes/outputs/plane-symphony-like-demo/workspaces/GH-40-BLP-13`,
  CDP port `19225`.
- The reversible candidate-selector probe passed its isolation checks, and the
  maintained `inline-edit-embed-jump-affordance` regression returned
  `status: passed` with `cleanup.status: passed`. These are design-stage
  evidence, not after-fix resolution claims.
- Pre-fix visual/runtime evidence remains under
  `docs/harness/runs/GH-40-BLP-13/trace/investigation/`, including
  `gh40-nested-block-runtime.json`, `gh40-nested-block-native.png`, and
  `gh40-nested-block-blp.png`. The implementation must write its distinct
  after-fix package under `trace/implementation/`.

## Risks / Open Questions

- The reporter's Android 13 build, exact Markdown, and view mode remain
  unknown. The desktop runtime does not prove mobile behavior.
- The accepted pre-fix trace used Obsidian `1.12.4`; the current lease is
  `1.13.4`. Implementation evidence must record the actual runtime identity,
  not copy historical metadata.
- The live DOM contains source-view/scroller wrappers between the host and
  nested embed. The CSS fix is insensitive to those wrappers, but the runtime
  assertion must be scoped to the selected outer subtree.
- The descendant padding rule intentionally remains unchanged. If the fix
  reveals a separate spacing defect, it requires separate evidence and design.
- Full-suite execution and Android/mobile smoke coverage belong to later
  implementation/release validation, not this pre-implementation gate.

## Decision

`accepted` — the design is specific, bounded, consistent with the accepted RCA,
and ready for implementation. The single selector correction has a stable
stylesheet/DOM regression seam and a repeatable runtime-fix proof that checks
both nested visibility and preservation of the outer inline-edit shell. The
implementation stage may proceed within the two slices above and must retain
the stated runtime identity, awaited reload, cleanup, and scope boundaries.
