## Status

- State: Implementation
- Verdict: ready-for-review
- Task: BLP-13 — GitHub #40: Nested embed is not shown

## Plane Reply

Changed the active inline-edit hide selector to scope native-content hiding to
the active embed's direct `.markdown-embed-content` child, and added a
stylesheet-derived DOM regression proving the outer preview still matches while
a nested preview does not. Targeted and full tests, type/build validation, the
accepted desktop CDP proof, the maintained jump-affordance regression, and
cleanup all passed. Code review should verify that the one-combinator CSS
boundary is sufficient for the supported block inline-edit path and that no
unrelated embed mode was changed.

## Scope

Implemented only the accepted bug-lane boundary: a native file embed nested
inside a block embed that BLP takes over for inline editing in Obsidian
Live Preview/source mode. The outer native preview remains replaced by the BLP
editor host; the intentionally skipped nested embed remains native and now
renders its body.

Out of scope: Android/device-specific validation, the reporter's exact missing
Markdown fixture, whole-file embeds in Preview/reading mode, and broader
block/heading/range or mobile smoke coverage.

## Changes Made

- Changed only the first selector in
  `src/css/Editor/InlineEdit/InlineEditEngine.css:1` from a descendant
  combinator to a direct-child combinator.
- Added a regression to
  `src/features/inline-edit-engine/__tests__/inline-edit-layout-css.test.ts:7`.
  The test extracts the first hide-rule selector from the real stylesheet,
  builds the accepted outer/host/editor/nested DOM hierarchy, and uses
  `Element.matches()` to prove both sides of the selector boundary.
- Did not change the hide declaration, jump-link rule, padding rule, nested
  mount eligibility, reparenting, editor lifecycle, generated files, package
  metadata, or maintained CDP snippets.

## Tests Added Or Updated

The CSS layout suite now covers:

- the active outer native preview matching the real first hide selector;
- the nested native preview below `.blp-inline-edit-host > .cm-editor` not
  matching that selector;
- the existing embedded-editor bottom-padding characterization.

The existing `InlineEditEngine.embed-shell.test.ts` suite remains unchanged and
continues to cover host placement, cleanup, and top-level jump-link preservation.

## Slice Evidence

| Slice | Mode | Before Command / Result | Change | After Command / Result | Refactor / Revalidation | Files Touched |
| --- | --- | --- | --- | --- | --- | --- |
| S-1 | `tdd` | `corepack pnpm test -- --runInBand src/features/inline-edit-engine/__tests__/inline-edit-layout-css.test.ts` -> expected RED: the nested assertion received `true` for the current descendant selector; the padding assertion passed. | Added the stylesheet-derived outer/nested DOM assertion, then changed only the first selector's descendant combinator to `>`. | `corepack pnpm test -- --runInBand src/features/inline-edit-engine/__tests__/inline-edit-layout-css.test.ts src/features/inline-edit-engine/__tests__/InlineEditEngine.embed-shell.test.ts` -> 2 suites and 6 tests passed. | `corepack pnpm test` -> 42 suites and 230 tests passed; `git diff --check` reported only existing LF/CRLF warnings. | `InlineEditEngine.css`, `inline-edit-layout-css.test.ts` |
| S-2 | `runtime-fix` | Accepted pre-fix package `trace/investigation/gh40-nested-block-runtime.json` records native nested body `display:block`/non-zero and BLP nested body `display:none`/`0x0`. | Built the linked plugin and used task-local phase probes to create the same fixture, await plugin unload/reload, and assert the real outer/editor/nested DOM boundary. | Native phase passed with nested body 535.85x55.16px; after-fix phase passed with nested body 543x71.16px, outer native body hidden, one outer active embed/host/root, zero nested active/root counts, and visible jump link. Both screenshots, maintained regression, and cleanup passed. | Screenshot visual inspection passed. Cleanup restored plugin/settings, layout, active file, and fixture state with zero warnings. | `.tmp/GH-40-BLP-13/*.js`, implementation runtime JSON, native/BLP screenshots |

## Validation

- `corepack pnpm test -- --runInBand src/features/inline-edit-engine/__tests__/inline-edit-layout-css.test.ts src/features/inline-edit-engine/__tests__/InlineEditEngine.embed-shell.test.ts` — passed, 2 suites / 6 tests.
- `corepack pnpm test` — passed, 42 suites / 230 tests.
- `corepack pnpm run build-with-types` — passed (`tsc -noEmit -skipLibCheck` and production esbuild).
- `corepack pnpm run agent:workflow-check` — passed.
- `git diff --check` — passed; Git emitted only line-ending normalization warnings for the two edited source files.
- `corepack pnpm install --frozen-lockfile` was not rerun because dependencies were already installed and no package or lockfile changed.

## Runtime Evidence

Runtime proof package: `trace/implementation/gh40-nested-block-runtime.json`.

Identity captured from the inherited runner lease:

- task `BLP-13`, archive `GH-40-BLP-13`, source `Jasper-1024/block-link-plus#40`;
- branch `symphony/GH-40-BLP-13`;
- worktree `C:/Users/stati/Documents/Codex/2026-06-13/hermes/outputs/plane-symphony-like-demo/workspaces/GH-40-BLP-13`;
- page title `gh40-host-block - blp-BLP-13 - Obsidian 1.13.4`;
- Obsidian `1.13.4`, vault `blp-BLP-13`, plugin `block-link-plus` `2.0.16`, CDP port `19225`.

The runtime sequence was:

1. `corepack pnpm run build-with-types` passed.
2. `node scripts/obsidian-cdp.js eval-file '.tmp/GH-40-BLP-13/prepare-native-screenshot.js'` passed with BLP unloaded and the nested native body visible/non-zero.
3. Native screenshot captured at `trace/implementation/gh40-nested-block-native.png`.
4. `node scripts/obsidian-cdp.js eval-file '.tmp/GH-40-BLP-13/assert-blp-after-fix.js'` passed after an awaited disable/enable reload, with `inlineEditBlock=true`.
5. BLP screenshot captured at `trace/implementation/gh40-nested-block-blp.png`.
6. `node scripts/obsidian-cdp.js eval-file 'scripts/cdp-snippets/regression/inline-edit/embed-jump-affordance.js'` returned `status: passed` and `cleanup.status: passed`.
7. `node scripts/obsidian-cdp.js eval-file '.tmp/GH-40-BLP-13/cleanup-gh40-runtime.js'` returned `cleanup.status: passed` with no warnings.

The after-fix probe selected the outer embed by its exact `src`, resolved the
host and nested embed only below the outer host's `.cm-editor` subtree, and
checked computed visibility and non-zero geometry. It did not treat global DOM
presence as proof.

Two task-local probe instrumentation issues were corrected and rerun: the
native phase initially checked Obsidian's stale enabled-plugin set after the
plugin instance had unloaded, and the first after-fix helper omitted nested body
text from its returned description. Neither was a product validation failure;
the final awaited phases passed on the same healthy lease.

The desktop runtime does not prove Android 13, the reporter's exact note or
view mode, whole-file Preview behavior, or mobile/block-variant coverage.

## Files Changed

Product and regression coverage:

- `src/css/Editor/InlineEdit/InlineEditEngine.css`
- `src/features/inline-edit-engine/__tests__/inline-edit-layout-css.test.ts`

Implementation artifacts and runtime proof:

- `docs/harness/runs/GH-40-BLP-13/implementation.md`
- `docs/harness/runs/GH-40-BLP-13/trace/implementation/gh40-nested-block-runtime.json`
- `docs/harness/runs/GH-40-BLP-13/trace/implementation/gh40-nested-block-native.png`
- `docs/harness/runs/GH-40-BLP-13/trace/implementation/gh40-nested-block-blp.png`

Task-local temporary probes remain under `.tmp/GH-40-BLP-13/` and are not
maintained product scripts.

## Risks / Open Questions

- Android/mobile rendering and the reporter's exact fixture remain unproved.
- The accepted design intentionally leaves the descendant padding rule and
  other embed modes unchanged; any spacing or variant-specific issue requires
  separate evidence and design.
- Code review should independently inspect the direct-child selector against
  the outer shell and the stylesheet-derived regression seam.

## Decision

`ready-for-review` — the accepted S-1 and S-2 slices were executed with honest
RED/runtime-before evidence, the smallest authorized CSS change, passing
targeted and full validation, a passing rebuilt-runtime resolution proof, and
successful cleanup. No commit or merge was made.
