## Status

- State: Implementation
- Verdict: ready-for-review

## Plane Reply

BLP-10 is implemented for focused File Outliner editors, including focused
Journal Feed detached/embedded editors. This revision fixes stale parser-owned
`_sourceLineRanges` after both directional and existing structural reorders,
makes movement plus structural history restore the captured viewport position
exactly, and makes the detached proof wait for the debounced save. Targeted
tests, the typed build, and fresh post-build normal/detached Obsidian/CDP
proofs pass; the final broad gates are recorded below. No commit or merge was
performed.

## Scope

In scope: the active block subtree in a focused `FileOutlinerView`,
same-level direct-sibling movement, cross-level visible-neighbor alignment,
collapsed and Zoom-root boundaries, persisted global movement mode, standard
Obsidian command registration, Journal Feed detached/embedded availability,
structural undo/redo, and English/Simplified Chinese/Traditional Chinese
labels.

Out of scope: native Markdown editing, Inline Edit Embeds, multi-block
selection movement, drag/drop changes, cross-file movement, block-ID or
serialization changes, per-file/transient mode controls, Zoom/collapse
behavior changes, a second CodeMirror Alt keymap, and a second history model.

## Changes Made

- Added `FileOutlinerMoveMode` and the persisted `fileOutlinerMoveMode` setting
  with `same-level` as the default.
- Added pure `moveBlockByDirection`, which clones input, moves complete source
  and target subtrees, preserves selection and metadata, enforces visible/
  collapsed scope and the Zoom boundary, aligns cross-level depths, validates
  rebuilt depth sequences, and reports changed ids including descendants.
- Kept parser-owned absolute `_sourceLineRanges` out of generic engine clones
  (with defensive invalidation on directional results), so source-line
  navigation falls back to the current tree order until the file is reparsed
  after saving; this covers keyboard and existing drag/drop reorders.
- Added the Cross-level ancestor-overlap guard so an ancestor containing the
  active source cannot be selected as an atomic target.
- Added the Outliner Editing dropdown with the two approved values and
  localized labels/options in all three existing locales.
- Added `FileOutlinerView.moveActiveBlock`, reading the live selection and
  current setting and routing successful moves through
  `applyStructuralEngineResult`; the move path preserves the exact captured
  viewport position through the centralized result/history application.
- Registered named move-up/move-down commands with default
  `Alt+ArrowUp`/`Alt+ArrowDown` hotkeys, focused File Outliner availability,
  detached/embedded candidate lookup, and Obsidian Hotkeys rebinding support;
  no duplicate CM6 Alt keymap was added.
- Added a plugin-scoped active-embed registry in
  `OutlinerEmbedLeafManager`, with registration on mount and removal on
  component unload/detach, because detached Journal Feed leaves are absent
  from normal workspace discovery APIs.

## Tests Added Or Updated

- Extended `src/features/file-outliner-view/__tests__/engine.test.ts` for
  same-level sibling/subtree movement, cross-level Up/Down alignment,
  collapsed/Zoom boundaries, top/bottom and ancestor-overlap no-ops, input
  immutability, selection preservation, and affected ids.
- Added
  `src/ui/__tests__/SettingsTab.file-outliner-move-mode.test.ts` for default,
  exact option values, save behavior, and all three locale labels.
- Added
  `src/features/file-outliner-view/__tests__/commands.test.ts` for command
  ids/default hotkeys, focused availability, one dispatch, and a manager-owned
  detached-leaf topology with `getLeavesOfType` empty.
- Added
  `src/features/file-outliner-view/__tests__/view-move-active-block.test.ts`
  for live selection/setting forwarding, exact viewport-preservation intent,
  one structural apply, and no-op suppression.
- Updated the structural-history regression expectation for exact viewport
  restoration and added engine/resolver regressions using normalized
  frontmatter and legacy tail-after-children source ranges, checking both
  `moveBlockSubtree` reorder directions as well as keyboard movement.
- Existing editor-state and structural-history regression tests remain green.

## Slice Evidence

The worktree already contained the S-1 through S-4 feature implementation and
focused tests when this revision session began. No clean pre-change RED was
recreated for those inherited slices, so their modes are recorded honestly as
characterization/inherited evidence below. The source-range correction was a
new review-driven TDD slice with a genuine failing test before the fix. The
viewport correction was validated through the accepted runtime-fix proof.

| Slice | Mode | Before Command / Result | Change | After Command / Result | Refactor / Revalidation | Files Touched |
| --- | --- | --- | --- | --- | --- | --- |
| S-1 | characterization (inherited implementation evidence) | Existing implementation snapshot at entry; no clean pre-change RED was recreated in this revision. | Pure direction/mode engine seam, same-level direct-sibling subtree movement, immutability, selection, and boundary results. | Existing focused engine baseline -> 24 tests passed before the review regression was added. | Same-level behavior remains covered by the inherited implementation tests; existing drag/drop `moveBlockSubtree` contract is unchanged. | `engine.ts`, `engine.test.ts` |
| S-2 | characterization (inherited implementation evidence) | Existing implementation snapshot at entry; no clean pre-change RED was recreated in this revision. | Cross-level eligible-neighbor selection, subtree atomicity, depth alignment, affected-id reporting, collapsed scope, Zoom boundary, and ancestor-overlap guard. | Existing focused engine baseline -> 24 tests passed before the review regression was added. | Current focused engine run -> 25 tests passed, including both directions, boundaries, and source-range correction. | `engine.ts`, `engine.test.ts` |
| S-3 | characterization (inherited implementation evidence) | Existing implementation snapshot at entry; no clean pre-change RED was recreated in this revision. | Persisted union/default, dropdown save path, and English/zh/zh-TW labels/options. | Existing focused settings run -> 6 tests passed; the new setting was already present at revision entry. | Same focused settings command -> 6 tests passed; typed build passed. | `types/index.ts`, `SettingsTab.ts`, `shared/i18n.ts`, settings test |
| S-4 | characterization/regression (inherited implementation plus review correction) | Prior code-review runtime found a focused Journal Feed embed with `embeddedLeafParent: false`, `getLeavesOfTypeCount: 0`, and unchanged `a,b`; the prior test used a fake workspace-discovery result. | Plugin-scoped registry in `OutlinerEmbedLeafManager`; command discovery consults it; test uses a manager-created detached `WorkspaceLeaf` with workspace discovery empty. | Prior failing topology/runtime evidence is recorded in the review artifact; no historical RED was recreated in this revision. | Current focused command/view/history run passes; fresh detached trusted input returns exactly one `up` call and `b,a`. | `OutlinerEmbedLeafManager.ts`, `commands.ts`, `commands.test.ts`, `view.ts` |
| S-5 | runtime-fix/revalidation | Prior approved baseline showed Alt+Arrow order unchanged. The first genuinely scrollable rerun exposed `scrollTop 47 -> 24` during movement. | Added exact viewport restoration for Alt+Arrow structural application and history replay, then rebuilt/reloaded the plugin. | Final `alt-move-proof-rerun.md` and `detached-alt-move-proof.md` both returned `ok: true`; normal proof reports `scrollTop 47 -> 47` with `scrollHeight 1820/clientHeight 160`. | Cleanup, settings/hotkey restoration, modes/directions, history, focus, selection, and disk checks passed; exact commands/output are in the durable traces. | `view.ts`, `view-structural-history-regression.test.ts`, `trace/implementation/alt-move-proof-rerun.md`, `trace/implementation/detached-alt-move-proof.md` |
| R-1 | tdd | `corepack pnpm exec jest --runInBand src/features/file-outliner-view/__tests__/engine.test.ts` -> 1 failed, 25 passed; the new `moveBlockSubtree` case resolved current line 3 to `parent` instead of `sibling`. | Stop generic `cloneBlock` and `cloneBlockShallow` from carrying parser-owned absolute `_sourceLineRanges`; retain defensive directional invalidation and cover both reorder directions. | Repeat of the same command -> 1 suite, 26 tests passed. | The existing directional source-range regression and the new structural-reorder regression both remain green; ranges are regenerated when the file is reparsed after save. | `engine.ts`, `engine.test.ts` |

## Validation

- Dependency gate: `corepack pnpm install --frozen-lockfile` -> exit 0; lockfile
  was current and pnpm reported `Already up to date`.
- Targeted source-range RED: `corepack pnpm exec jest --runInBand
  src/features/file-outliner-view/__tests__/engine.test.ts` -> 1 failed, 25
  passed before the shared clone fix; the failure was the expected stale-range
  resolver result.
- Targeted source-range GREEN: the same engine command -> 1 suite, 26 tests
  passed after the shared clone fix.
- Final focused implementation bundle:
  `corepack pnpm exec jest --runInBand src/features/file-outliner-view/__tests__/engine.test.ts src/features/file-outliner-view/__tests__/source-line-navigation.test.ts src/features/file-outliner-view/__tests__/editor-state.test.ts src/features/file-outliner-view/__tests__/view-structural-history-regression.test.ts src/features/file-outliner-view/__tests__/commands.test.ts src/features/file-outliner-view/__tests__/view-move-active-block.test.ts src/ui/__tests__/SettingsTab.inline-edit-visibility.test.ts src/ui/__tests__/SettingsTab.file-outliner-move-mode.test.ts`
  -> 8 suites, 62 tests passed.
- Full repository suite: `corepack pnpm test` -> 45 suites, 244 tests passed,
  0 snapshots.
- Type/build gate: `corepack pnpm run build-with-types` -> `tsc -noEmit
  -skipLibCheck` and production esbuild passed.
- Workflow gate: `corepack pnpm run agent:workflow-check` -> `agent workflow
  check passed`.
- Patch hygiene: `git diff --check` passed; Git emitted only existing
  LF/CRLF conversion warnings.

## Runtime Evidence

Durable runtime traces:

- `docs/harness/runs/PLANE-BLP-10/trace/implementation/alt-move-proof-rerun.md`
- `docs/harness/runs/PLANE-BLP-10/trace/implementation/detached-alt-move-proof.md`

The inherited task runtime was validated with `ensure_runtime({ fresh: false })`
and used without overriding its lease: task `BLP-10`, identity
`blp-BLP-10`, vault `blp-BLP-10`, Obsidian `1.13.6`, plugin
`block-link-plus` `2.0.16`, CDP port `19225`. The current bundle, including
the shared clone fix, was rebuilt with `corepack pnpm run build-with-types`
before the runtime packages.

The mixed-depth package registered default Alt+Arrow commands, exercised
trusted default Up/Down input plus an `Alt+ArrowLeft` rebind, and returned
`ok: true`. It proved same-level subtree movement, cross-level Up/Down
alignment, collapsed-target atomicity, Zoom/top no-ops without side effects,
on-disk order/depth, one-step undo/redo, focus/cursor/selection/viewport
preservation, and setting persistence across plugin reload. Its wrapper
observed exactly `['up', 'down', 'up']` for the three trusted command inputs.
The viewport fixture had `clientHeight: 160`, `scrollHeight: 1820`, and a
non-zero `scrollTop: 47`; the move, undo, and redo all preserved
`{scrollTop: 47, scrollLeft: 0}`.

The detached package created a real Journal Feed Outliner embed and focused
block `b`. Setup reported `focused: true`, `embeddedLeafParent: false`,
`getLeavesOfTypeCount: 0`, and no embedded Outliner in
`workspace.iterateAllLeaves`. The command still handled an unmodified trusted
`Alt+ArrowUp` input exactly once, moving the model and disk order from `a,b`
to `b,a` while preserving block `b`, selection `{ from: 1, to: 1 }`, and
editor focus. It returned `ok: true` without manually installing a hotkey
mapping; the finalizer waited for the debounced save and reported
`diskWaitMs: 0` before asserting the on-disk order. Cleanup restored
`_debug/start.md`, removed temporary files, left zero Journal Feed/detached
Outliner DOM nodes, and restored Same-level mode.

## Files Changed

Feature and focused-test surfaces:

- `src/types/index.ts`
- `src/features/file-outliner-view/engine.ts`
- `src/features/file-outliner-view/commands.ts`
- `src/features/file-outliner-view/labels.ts`
- `src/features/file-outliner-view/view.ts`
- `src/features/file-outliner-view/__tests__/engine.test.ts`
- `src/features/file-outliner-view/__tests__/view-structural-history-regression.test.ts`
- `src/features/file-outliner-view/__tests__/commands.test.ts`
- `src/features/file-outliner-view/__tests__/view-move-active-block.test.ts`
- `src/features/journal-feed-view/OutlinerEmbedLeafManager.ts`
- `src/shared/i18n.ts`
- `src/ui/SettingsTab.ts`
- `src/ui/__tests__/SettingsTab.file-outliner-move-mode.test.ts`

Stage artifacts:

- `docs/harness/runs/PLANE-BLP-10/implementation.md`
- `docs/harness/runs/PLANE-BLP-10/trace/implementation/alt-move-proof-rerun.md`
- `docs/harness/runs/PLANE-BLP-10/trace/implementation/detached-alt-move-proof.md`

## Risks / Open Questions

- The detached command test uses a minimal mocked `WorkspaceLeaf` to exercise
  the manager registry, while the required live fixture exercised the actual
  Journal Feed detached-leaf topology. The live proof is the authority for
  that runtime behavior.
- No screenshot or video was captured; the normal runtime proof now uses a
  genuinely scrollable fixture and records non-zero geometry/offset equality.
- The broad mixed-depth runtime fixture had no active custom hotkey mappings
  after reload and explicitly installed the registered defaults before its
  trusted input. The detached fixture separately proved unmodified default
  Alt+ArrowUp input without that step; the real rebind path also passed.
- No native Markdown, Inline Edit Embed, multi-selection, drag/drop semantics,
  cross-file, block-ID/serialization, per-file setting, Zoom behavior, or
  second-history scope was introduced. Existing drag/drop reorder output now
  intentionally drops stale parser line metadata while preserving its move
  behavior.
- No unresolved product or architecture decision remains.

## Decision

The accepted implementation contract and the review-requested corrections are
complete at the available public seams. The shared structural-clone
source-range regression has a genuine RED/GREEN record, the detached proof
waits for persistence, the final runtime package proves non-zero viewport
preservation, and both normal and detached File Outliner command paths have
valid cleanup. Frozen install, 45-suite Jest, typed build, workflow, focused
tests, and diff checks pass. Verdict: `ready-for-review`. This stage does not
commit or merge.
