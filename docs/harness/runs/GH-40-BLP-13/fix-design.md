## Status

- State: Fix Design
- Verdict: ready-for-review

## Plane Reply

Recommend one stylesheet-only correction: make the active inline-edit embed's
native-content hiding rule select only the active embed's own direct
`.markdown-embed-content` children. This preserves the BLP host and outer
native-preview replacement while allowing the intentionally non-mounted nested
native embed to render. It does not cover Android-specific behavior, the
reporter's missing fixture, or whole-file/Preview-only paths. The design review
should attack the CSS/DOM regression seam and the repeatability of the runtime
proof, especially the requirement that the outer preview remains hidden while
the nested preview becomes visible.

## RCA Inputs Used

- `docs/harness/runs/GH-40-BLP-13/context/source-issue.md`: GitHub #40 reports
  that an embed nested inside another embed is not shown with Block Link Plus;
  the source snapshot has screenshots but no Markdown fixture or comments.
- `docs/harness/runs/GH-40-BLP-13/investigation.md`: bounded the bug to a
  native file embed nested inside a block embed that BLP takes over for inline
  editing in Live Preview/source mode. It records the native-versus-BLP
  runtime comparison and CSS isolation.
- `docs/harness/runs/GH-40-BLP-13/rca-review.md`: verdict `accepted`. The
  accepted owner layer is the BLP inline-edit stylesheet, not nested mount
  eligibility, block parsing, reparenting, or native rendering.
- `docs/harness/guides/tdd.md`: the implementation must use honest vertical
  slices with a CSS/DOM test seam and a repeated `runtime-fix` proof package.
- `docs/harness/guides/runtime-proof-package.md`: runtime claims must include
  task identity, actual runtime details, commands, visual evidence, and the
  remaining unproved boundaries.

The relevant source seams are current and specific: the hide selector is in
`src/css/Editor/InlineEdit/InlineEditEngine.css:1-3`;
`InlineEditEngine.prepareEmbedShell()` adds the active class and places the BLP
host under the outer embed's direct native content at
`src/features/inline-edit-engine/InlineEditEngine.ts:1531-1598`;
`InlineEditEngine.mountInlineEmbedCore()` intentionally skips nested embeds at
`InlineEditEngine.ts:1661-1673` before reparenting the outer editor at
`InlineEditEngine.ts:1774-1779`; and
`EmbedLeafManager.isNestedWithinEmbed()` defines that nested boundary at
`src/features/inline-edit-engine/EmbedLeafManager.ts:50-53`.

## Problem Boundary

In scope is exactly this path:

1. A host note embeds a block reference.
2. The outer block target contains a native file embed.
3. In Obsidian Live Preview/source mode, `inlineEditBlock` lets BLP mount an
   Inline Edit Embed for the outer block.
4. The nested embed is detected as nested and is deliberately not taken over
   by a second BLP editor.
5. The outer embed receives `blp-inline-edit-active`.

The current first rule in
`src/css/Editor/InlineEdit/InlineEditEngine.css:1-3` uses a descendant
combinator before `.markdown-embed-content`:

```css
.internal-embed.markdown-embed.blp-inline-edit-active .markdown-embed-content > :not(.blp-inline-edit-host) {
	display: none !important;
}
```

Because the nested embed's own `.markdown-embed-content` is also a descendant
of the active outer embed, its direct `.markdown-preview-view` is selected and
hidden. The nested DOM and sentinel remain present, but the rendered body has
`display: none` and a zero rectangle. The accepted runtime package records the
native baseline as visible and the BLP path as hidden; removing only the outer
active class flips the nested body back to visible without changing the host,
editor mount, range, or nested-skip logic.

The issue snapshot does not establish the reporter's exact Markdown, view mode,
Obsidian build, or Android layout. Those facts are validation boundaries, not
reasons to broaden this design. Whole-file embeds that do not enter BLP block
inline-edit mode are also out of scope because the investigation's boundary
check did not reproduce the failure there.

## Proposed Fix

Change only the first hide-rule selector to scope the native-content child
selection to the active embed itself:

```css
.internal-embed.markdown-embed.blp-inline-edit-active > .markdown-embed-content > :not(.blp-inline-edit-host) {
	display: none !important;
}
```

Keep its declaration (`display: none !important`) and the remaining rules in
`InlineEditEngine.css` unchanged in this slice. In particular:

- The direct-child combinator still hides the outer embed's native preview
  while leaving the BLP `.blp-inline-edit-host` available.
- The nested embed's own preview is no longer reached through the outer
  selector, so the native nested body can render.
- The second rule, which preserves the outer jump affordance by excluding
  `.markdown-embed-link`, remains unchanged.
- `InlineEditEngine` nested-skip, `EmbedLeafManager.reparent()`, block parsing,
  and CodeMirror/editor lifecycle remain unchanged.
- The separate descendant `.markdown-embed-content` padding rule at CSS
  lines 9-11 is not opportunistically changed. Padding changes would be a
  separate visual behavior and are not required to resolve the proven hidden
  body; the runtime proof must still inspect the resulting nested geometry.

A reversible live design probe replaced only the loaded first selector with
this direct-child form and restored the original rule. Before replacement the
nested body was `display: none` with a `0x0` rectangle. During replacement it
was `display: block` with a `543x71.15625` rectangle; the outer native body
remained `display: none`, the outer active count stayed `1`, the BLP host stayed
connected, and the top-level jump affordance stayed connected. This is
candidate-selector evidence, not post-implementation resolution proof.

## Alternatives Considered

### Remove the active-embed hide rule

Rejected. It would make the nested body visible, but it would also leave the
outer native preview visible alongside the BLP editor host. That changes the
outer embed shell, can produce duplicate content or height, and discards the
existing behavior that the active outer preview is replaced by the editor.

### Change nested-embed eligibility or mount a second BLP editor

Rejected. The accepted RCA shows that nested takeover is intentionally skipped
and that removing only the ancestor active class restores the existing native
view without changing mount state. Altering `isNestedWithinEmbed()` or
reparenting would add lifecycle, focus, and recursion risk while leaving the
ancestor CSS defect unresolved.

### Hide/show nested content from TypeScript after mount

Rejected. A DOM mutation or query-based repair would be timing-sensitive to
Obsidian's native embed rendering and would duplicate CSS ownership. It would
also require lifecycle cleanup on rerender. The selector boundary expresses
the intended ownership directly and is the smallest change supported by the
runtime isolation.

### Broaden the patch to every nested embed or every embed mode

Rejected. The accepted RCA is only for a native file embed inside a BLP block
inline-edit embed in Live Preview/source mode. Whole-file Preview and Android
behavior are not established by the supplied evidence and must not be silently
folded into this bug fix.

## Implementation Notes

- Product file expected to change: `src/css/Editor/InlineEdit/InlineEditEngine.css`.
- Targeted regression file: extend
  `src/features/inline-edit-engine/__tests__/inline-edit-layout-css.test.ts`
  or add a same-directory CSS/DOM test. The fixture hierarchy is normative:

  ```text
  .internal-embed.markdown-embed.blp-inline-edit-active
  `-- > .markdown-embed-content
      |-- > .markdown-preview-view                 (outer native preview)
      `-- > .blp-inline-edit-host
          `-- .cm-editor                           (simulated Live Preview surface)
              `-- .internal-embed.markdown-embed   (nested native embed)
                  `-- > .markdown-embed-content
                      `-- > .markdown-preview-view (nested native preview)
  ```

  The test must extract the first hide-rule selector from
  `InlineEditEngine.css`; it must not hard-code only the proposed selector. The
  current descendant selector provides honest RED evidence because it matches
  both the outer and nested preview. After the one-combinator correction, the
  same stylesheet-derived seam must prove that the outer direct preview still
  matches while the nested preview no longer matches.
- Preserve the existing `InlineEditEngine.embed-shell.test.ts` coverage for
  `prepareEmbedShell()` host placement, cleanup, and top-level jump-link
  preservation. Do not rewrite it as a CSS test.
- Do not change generated files, package metadata, maintained CDP snippets, or
  temporary probes in the fix-design or implementation slice.
- Before runtime validation, build the linked plugin with
  `corepack pnpm run build-with-types`, then reload only the linked plugin in
  the inherited task runtime with:

  ```powershell
  node scripts/obsidian-cdp.js eval "app.plugins.disablePlugin('block-link-plus'); app.plugins.enablePlugin('block-link-plus')"
  ```

- Runtime identity is an implementation acceptance criterion, not copied
  historical metadata. Immediately before the after-fix proof, record the
  actual inherited page title, Obsidian version, vault name, plugin id and
  manifest version, task key, branch, worktree, and CDP port. At design time
  these are `BLP-13`, `blp-BLP-13`, plugin `block-link-plus` 2.0.16, port
  `19225`, branch `symphony/GH-40-BLP-13`, and Obsidian `1.13.4`; the earlier
  `1.12.4` trace is historical investigation evidence only and must not be
  copied into the implementation result.

## TDD Slice Plan

| Slice | Mode | Behavior | Public Seam | Before Evidence | Minimum Change | After Evidence | Refactor Allowance |
| --- | --- | --- | --- | --- | --- | --- | --- |
| S-1 | tdd | An active outer inline-edit embed hides only its own native preview; a native preview inside an intentionally skipped nested embed remains eligible to render. | Extract the first selector from the real stylesheet and apply `Element.matches()` to the explicit hierarchy above; the nested embed is beneath `.blp-inline-edit-host > .cm-editor`. Retain `InlineEditEngine.embed-shell.test.ts` as shell characterization. | The new assertion is RED with the current descendant selector because it matches the nested preview as well as the outer preview. Existing shell tests are the green baseline. | Replace only the first selector's descendant combinator with `>`. Keep its declaration and all other rules unchanged. | The same stylesheet-derived test proves the outer direct preview still matches and the nested preview no longer matches; the embed-shell suite remains green. | Test helper cleanup and selector whitespace normalization only; no CSS refactor or adjacent padding change. |
| S-2 | runtime-fix | With `inlineEditBlock=true`, the nested native file-embed body is visibly rendered inside the BLP outer block Inline Edit Embed, while the outer native preview remains replaced. | Task-owned identity snapshot, two phase-specific task-local CDP probes, native/BLP screenshots, and maintained `embed-jump-affordance.js`. | Existing investigation proof: native nested body visible/non-zero; BLP nested body `display:none`/`0x0`. Capture the current runtime identity before changing state. | Build/reload after S-1. Task-local probes may be split only to make native and BLP screenshot states deterministic; product lifecycle and maintained snippets remain unchanged. | Require exactly one outer active embed, one connected outer host/root, hidden outer direct native preview, connected and visible top-level jump link, visible nested sentinel and non-zero nested body, zero nested active embeds/BLP roots, two durable screenshots, and maintained jump regression `status: passed` plus `cleanup.status: passed`. | No refactor allowance. Any selector change beyond the first hide rule, or any runtime lifecycle change, routes back to design review. |

The implementation agent should execute S-1 before S-2. If the selector test
does not go RED for the accepted reason, or the runtime output contradicts the
accepted boundary, stop with a design-mismatch result instead of broadening the
patch.

## Validation Plan

### Targeted tests

After the regression assertion is added:

```powershell
corepack pnpm test -- --runInBand src/features/inline-edit-engine/__tests__/inline-edit-layout-css.test.ts src/features/inline-edit-engine/__tests__/InlineEditEngine.embed-shell.test.ts
```

The expected result is a green CSS/DOM regression plus the existing shell tests.
Then broaden proportionally with:

```powershell
corepack pnpm test
corepack pnpm run build-with-types
```

### Runtime proof package to repeat after implementation

Use only the inherited runner lease; do not launch Obsidian directly, scan
ports, or override the task port. Ensure the identity still matches `BLP-13`
and `blp-BLP-13`. Record identity with the following commands and their output:

```powershell
node scripts/obsidian-cdp.js list
node scripts/obsidian-cdp.js eval "({title:document.title,obsidianVersion:document.title.match(/Obsidian ([0-9.]+)$/)?.[1]??null,vault:app.vault.getName(),plugin:app.plugins.manifests['block-link-plus']})"
git branch --show-current
git rev-parse --show-toplevel
Write-Output "task=$env:BLP_RUNTIME_TASK_KEY port=$env:OB_CDP_PORT"
```

The title-derived version expression above was executed successfully against
the task-owned runtime and returned `1.13.4`; a null match is a failed identity
gate. The implementation runtime JSON must also contain the fixed source
identity `https://github.com/Jasper-1024/block-link-plus/issues/40`, archive key
`GH-40-BLP-13`, Plane task `BLP-13`, plus the observed branch and worktree.

Then build the linked plugin. The implementation may split or extend the
existing task-local probe into the following two task-local phase probes so
the screenshot state is deterministic; these are evidence helpers, not
maintained product scripts:

```powershell
node scripts/obsidian-cdp.js eval-file '.tmp/GH-40-BLP-13/prepare-native-screenshot.js'
node scripts/obsidian-cdp.js screenshot 'docs/harness/runs/GH-40-BLP-13/trace/implementation/gh40-nested-block-native.png'
node scripts/obsidian-cdp.js eval-file '.tmp/GH-40-BLP-13/assert-blp-after-fix.js'
node scripts/obsidian-cdp.js screenshot 'docs/harness/runs/GH-40-BLP-13/trace/implementation/gh40-nested-block-blp.png'
node scripts/obsidian-cdp.js eval-file 'scripts/cdp-snippets/regression/inline-edit/embed-jump-affordance.js'
node scripts/obsidian-cdp.js eval-file '.tmp/GH-40-BLP-13/cleanup-gh40-runtime.js'
```

`prepare-native-screenshot.js` must create/open the same deterministic host,
outer block, and nested file-embed fixture with BLP disabled, wait for render,
and return/assert native nested-body visibility and non-zero width/height.
`assert-blp-after-fix.js` must enable/reload BLP with `inlineEditBlock=true`,
wait for the same fixture, identify the exact outer block embed by its `src`,
then resolve `.blp-inline-edit-host` beneath that outer embed and resolve the
nested embed only beneath that host/editor subtree. Global duplicate matches
must not satisfy the assertion. It must return/assert every after-state
invariant below.
Persist both probe outputs and the identity snapshot in
`trace/implementation/gh40-nested-block-runtime.json`. Resolution evidence
must show:

- native baseline: nested preview body visible with a non-zero rectangle;
- BLP path: one active outer inline-edit embed, a connected
  `.blp-inline-edit-host`, nested preview body visible with non-zero width and
  height, and the nested DOM sentinel visible;
- outer behavior: the outer native preview remains hidden/replaced and the
  top-level jump affordance remains connected and visibly rendered;
- exactly one connected outer `.blp-inline-edit-host` and exactly one outer
  `.blp-inline-edit-root` are present;
- nested `blp-inline-edit-active` and nested `.blp-inline-edit-root` counts are
  both zero;
- the maintained jump-affordance regression returns both `status: passed` and
  `cleanup.status: passed`.

The phase probes must snapshot the original plugin enabled state/settings,
workspace layout and active file, and whether each GH-40 fixture path existed.
`cleanup-gh40-runtime.js` must restore those values, restore or delete every
task-created file as appropriate, remove an empty task folder, and return
`cleanup.status: passed`; any cleanup warning or thrown cleanup error fails S-2.
Persist that cleanup output alongside the identity, probe, and screenshot
paths in the runtime JSON.

The native screenshot is captured after the native preparation probe has
opened the fixture with BLP disabled. The BLP screenshot is captured after the
after-fix probe has enabled/reloaded the plugin and asserted the fixed state,
using the same fixture and viewport.
The implementation artifact must record the actual Obsidian version, vault,
plugin version, CDP port, reload command, probe output, and screenshot paths.
The pre-fix failure package remains
`docs/harness/runs/GH-40-BLP-13/trace/investigation/gh40-nested-block-runtime.json`
with its native and BLP screenshots. The reversible selector probe used during
this design is not a substitute for the after-build proof.

### Manual boundaries

Before release, smoke-test the corrected selector on the supported Obsidian
Mobile/Android path if available, and check the relevant block/heading/range
outer-embed variants for regressions in the outer shell. These checks are
validation risks, not additional implementation scope. Do not claim the
reporter's Android environment is proved by the desktop CDP runtime.

## Behavior Change Gate

The intended change is corrective: an already-native nested embed body that the
issue and native baseline establish as visible should remain visible when BLP
takes over only the outer block. It is not a new feature, a refactor, or a
product-level choice about how nested embeds should work. The normal bug-lane
fix-design review remains the required pre-implementation gate; no separate
Human Review decision is needed unless review finds that the requested scope
has expanded beyond the accepted RCA boundary.

## Risks / Open Questions

- The current runtime reports Obsidian `1.13.4`, while the accepted pre-fix
  trace reports `1.12.4`. The current design probe still reproduces the hidden
  nested body, but implementation evidence must pin its actual runtime version.
- The selector fix may expose theme- or version-specific nested layout effects;
  the proof must use body visibility and geometry, not merely DOM presence.
- The descendant padding rule remains intentionally unchanged. If the visible
  nested body has unacceptable spacing after the selector fix, that is a new,
  separately evidenced styling issue and should not be folded into this slice.
- The supplied issue does not prove Android 13, the exact note syntax, or a
  reading-mode failure. Mobile/device and fixture variation remain open until
  a human or later validation run supplies evidence.
- The whole-file nested embed boundary did not reproduce in Preview and stays
  out of scope.

## Decision

`ready-for-review` — the accepted RCA supports a single, executable CSS change
with a stable CSS/DOM RED test and a repeatable runtime-fix proof. The design
preserves the outer Inline Edit Embed and jump affordance, leaves nested mount
logic untouched, records the required non-goals, and does not claim
post-implementation resolution.
