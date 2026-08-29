## Status

- State: Implementation Routing
- Verdict: same-task-ready
- Work item: BLP-10 (archive key: PLANE-BLP-10)

## Plane Reply

The human-approved File Outliner design is bounded enough for the normal implementation and code-review loop on BLP-10. The feature remains scoped to focused File Outliner editors, uses Obsidian commands with default Alt+Arrow hotkeys, keeps subtree and Zoom-boundary invariants, and adds one persisted movement-mode setting. No child work items are needed.

## Accepted Design

The accepted contract is the source issue together with `approved-design.md`; the earlier design-intake artifact is not an additional authority.

- Approval binding: Plane page `f98a5ee2-5612-47c9-a47d-e70e93d023ea`, content hash `5d231b56738280261ef3ba4cbb3dcb711172b6217ee03c0a6300f717705e2292`, approved at `2026-08-25T15:35:21Z` as recorded in `approved-design.json`.
- Surface: focused `FileOutlinerView` block editors, including a detached or embedded Outliner editor when that editor owns focus. Native Markdown editing and Inline Edit Embeds are out of scope.
- Commands: expose separate named move-up and move-down Obsidian commands with default `Alt+ArrowUp` and `Alt+ArrowDown` hotkeys. Users must be able to remove or rebind them through Obsidian Hotkeys. Both commands use one view operation, `moveActiveBlock("up" | "down")`; do not add duplicate fixed Alt+Arrow CodeMirror bindings.
- Setting: add one global persisted `fileOutlinerMoveMode` union with `"same-level"` as the conservative default and `"cross-level-align"` as the alternative. Render both options in the existing Outliner Editing settings group with English, Simplified Chinese, and Traditional Chinese labels. Read the value when a move is invoked.
- Movement unit and targets: the active block and all descendants move as one subtree. Same-level mode uses only the adjacent direct sibling subtree and never changes indentation. Cross-level-align mode uses the immediate eligible previous/next visible-scope block outside the source subtree, treats its descendants as one target subtree, and aligns the moved root to the target root while preserving descendant-relative depths. Collapsed hidden descendants are not individual targets.
- Direction and boundaries: move before the target subtree for Up and after it for Down. The current Zoom root is a hard, non-crossable boundary. Missing active state, invalid targets, and top/bottom or Zoom-boundary cases are handled no-ops.
- Preservation and application: keep block ids, text, system data, and subtree structure; return the original block selection on success and `didChange: false` for no-ops; report every affected id needed for rendering and persistence, including descendants whose depths change. Apply successful results through `applyStructuralEngineResult` so structural undo/redo, stale-editor protection, focus, cursor/selection range, viewport restoration, and debounced save remain centralized. A no-op must create no history, dirty state, or save.
- Non-goals: native Markdown or arbitrary Markdown-block movement, multi-block selection movement, drag/drop changes, block-ID or serialization changes, cross-file movement, Zoom/collapse behavior changes, per-file or transient mode controls, and a second global history model.

## Human Feedback Considered

The tracker gate is `Review Approved` with `agent-ready`, `cdp-required`, and `enhancement` labels. The feedback does not reject or amend the approved product contract:

- The latest comment records repair of the isolated Obsidian launcher and successful fresh runtime startup. This removes an infrastructure concern; it does not change feature scope.
- The reset comment says the worktree restarted from the current BLP master and that old implementation artifacts and traces are recoverable snapshots. Those old traces are not treated as current product evidence.
- The earlier runtime comments describe cleanup of a temporary proof script and prior successful proof. They are operational history only; implementation must still collect fresh post-build CDP evidence for this worktree.

The current runner-owned preflight is healthy (`BLP_RUNTIME_TASK_KEY=BLP-10`, identity `blp-BLP-10`, port `19225`, target title `start - blp-BLP-10 - Obsidian 1.13.6`). The active file is `_debug/start.md`, and the pre-change setting probe returns no `fileOutlinerMoveMode` key. This confirms runtime availability and the expected baseline only; it is not post-change feature validation.

## Routing Decision

Route as `same-task-ready` on BLP-10.

The change is one coherent File Outliner behavior with one engine result type, one view history/persistence boundary, one command pair, and one setting. The existing seams (`moveBlockSubtree` plus linearize/rebuild helpers in `engine.ts`, `applyStructuralEngineResult` in `view.ts`, the Outliner CodeMirror host in `editor-state.ts`, command registration in `commands.ts`, and the existing settings/localization surfaces) make the slices independently testable while keeping their integration contract in one implementation loop. Splitting them would create dependent children around the same move operation and history path rather than independent deliverables.

No child work items are created. The implementation stage should proceed on the same item and then enter the normal code-review loop. Because the source item is `cdp-required`, implementation must include fresh runtime proof after rebuilding or reloading the plugin.

## Implementation Contract

Implementation may modify only the product and focused test surfaces required by the accepted design. The expected behavior contract is:

1. Add the movement-mode type/default and persisted settings UI. Existing saved settings must load with `same-level` when the new key is absent, and selecting either option must save through the existing settings path. Labels/options must be present in all three existing Outliner locales.
2. Add a pure direction-plus-mode engine operation rather than embedding target selection in the DOM or command layer. It must clone input rather than mutate it, select complete source and target subtrees, enforce the two target policies, enforce the Zoom boundary, recompute valid depths, preserve the active selection, and return affected ids. Preserve existing drag/drop `moveBlockSubtree` behavior unless a shared helper can be extended without changing its contract.
3. Add one `FileOutlinerView.moveActiveBlock("up" | "down")` path that obtains the live editor selection, reads the current setting, invokes the engine, and sends the result through `applyStructuralEngineResult`. Command availability must be limited to a focused active File Outliner block editor, including the existing detached/embedded focus case. A single command invocation must produce at most one engine move.
4. Register two named commands using the existing command-label pattern and default Alt+Arrow hotkeys. Do not install a second Alt+Arrow CM6 keymap. Users must be able to rebind/remove the commands through Obsidian Hotkeys while plain ArrowUp/Down navigation remains unchanged.
5. Add focused tests for same-level sibling/subtree movement, cross-level Up and Down alignment, collapsed and Zoom boundaries, invalid-target and top/bottom no-ops, input immutability, affected ids, selection preservation, command availability and single dispatch, settings default/save behavior, and structural-history integration. The full implementation validation should also run the repository test suite, type/build check, and workflow check.
6. After rebuild/reload, collect a durable implementation trace under `docs/harness/runs/PLANE-BLP-10/trace/implementation/`. The proof must use the task-owned inherited runtime and cover default and rebound commands, exactly one move per invocation, both modes and directions, atomic source/target subtrees, collapsed descendants, Zoom-root and top/bottom no-ops, immediate setting changes and persistence after reload, on-disk order/depth, one-step undo/redo, focus/cursor/selection, and viewport stability. Record the exact probe command, runtime identity, output, and any remaining unproved behavior.

## TDD Slice Plan

The implementation agent must execute these slices in order, adding the focused behavior test at the start of each `tdd` slice and keeping the before/after evidence honest.

| Slice | Mode | Behavior | Public Seam | Before Evidence | Minimum Change | After Evidence | Refactor Allowance |
| --- | --- | --- | --- | --- | --- | --- | --- |
| S-1 | tdd | Same-level Up/Down moves the active block plus descendants around the adjacent direct sibling; source text/ids, relative subtree shape, selection, and boundary no-op behavior are preserved. | Exported pure movement operation returning `OutlinerEngineResult` in `src/features/file-outliner-view/engine.ts`. | Add focused engine cases, then run `corepack pnpm exec jest --runInBand src/features/file-outliner-view/__tests__/engine.test.ts`; the new cases should fail because no keyboard movement operation exists. | Add the movement mode/direction contract and same-level sibling-subtree target/move behavior, including clone/immutability and no-op results. | Repeat the same engine command with the new cases green and verify existing engine tests remain green. | Extract small pure subtree/index helpers only after green; do not alter existing drag/drop semantics. |
| S-2 | tdd | Cross-level-align moves against the immediate eligible visible-scope neighbor, aligns the moved root to the target depth, preserves descendant-relative depths, and respects collapsed descendants and the Zoom-root boundary. | The same pure engine operation with explicit mode and direction. | Extend focused engine cases and repeat the engine Jest command; cross-level, collapsed, and Zoom cases should fail for the expected missing behavior. | Add eligible-neighbor selection, target-subtree atomicity, depth alignment, affected-id reporting, and invalid/boundary no-ops without DOM dependence. | Repeat the engine command and assert both directions, depth/order, subtree preservation, dirty ids, and unchanged input. | Refactor target scanning or depth adjustment only from the green engine baseline. |
| S-3 | tdd | The persisted mode defaults to Same-level only, exposes exactly the two approved options, saves changes, and is readable immediately by the next invocation. | `DEFAULT_SETTINGS`, `PluginSettings`, `BlockLinkPlusSettingsTab.renderFileOutlinerTab`, and the existing `saveSettings` seam. | Add settings/default/UI assertions and run `corepack pnpm exec jest --runInBand src/ui/__tests__/SettingsTab.inline-edit-visibility.test.ts` plus the new focused settings test; assertions for the new key/options should fail before the setting exists. | Add the union/default, rely on the existing load merge, render the dropdown beside structural editing options, save on change, and add English/zh/zh-TW labels. | Repeat the focused settings commands, then run `corepack pnpm run build-with-types` to prove the typed setting and localization surfaces compile. | Share a small dropdown-label helper only after green; no per-file or transient setting path. |
| S-4 | tdd | Each standard command is available only for a focused File Outliner block editor and dispatches one `moveActiveBlock` call; successful moves use structural history/focus/save handling and no-ops do not create history or dirty state. | `registerFileOutlinerCommands`, `FileOutlinerView.moveActiveBlock`, `createOutlinerEditorState`, and `applyStructuralEngineResult`. | Add command-registration/availability/single-dispatch and view-history cases, then run `corepack pnpm exec jest --runInBand src/features/file-outliner-view/__tests__/editor-state.test.ts src/features/file-outliner-view/__tests__/view-structural-history-regression.test.ts` plus the new command/view tests; the new cases should fail before wiring exists. | Add the two named commands with default Alt+Arrow hotkeys, one view host path, active-selection handling, and central structural-result application. Do not add fixed Alt+Arrow CM6 bindings. | Repeat the same focused Jest command and verify command availability, one dispatch, selection/focus/viewport/history behavior, and no-op side effects. | Simplify local command/host plumbing only after the full focused suite is green. |
| S-5 | tdd | Real Obsidian behavior matches the accepted contract after rebuild/reload: commands move exactly once, both modes/directions and persistence work, boundaries are clean, and focus/selection/scroll/disk state remain correct. | Task-owned Obsidian/CDP command, editor, DOM, and on-disk proof package. | The approved baseline command `node scripts/obsidian-cdp.js eval-file '.tmp/PLANE-BLP-10/alt-move-design-baseline.js'` reports order `a,b,c` unchanged after both Alt+Arrow events, events unprevented, selection on `b`, and no movement-mode setting key. | Rebuild/reload the completed plugin and run a mixed-depth temporary-note proof; preserve the exact command and output in the implementation trace. | Run `corepack pnpm run build-with-types`, the exact post-change `node scripts/obsidian-cdp.js eval-file '.tmp/PLANE-BLP-10/alt-move-proof.js'` (or the actual probe path used), `corepack pnpm test`, and `corepack pnpm run agent:workflow-check`; record the post-change CDP package and any failed scenario rather than substituting reasoning. | N/A for runtime proof; any cleanup must follow a green post-change package and must not weaken coverage. |

## Child Tasks

None. This route keeps the full accepted contract on BLP-10; no Plane child keys exist.

## Risks / Open Questions

- No unresolved product decision remains; human review fixed the surface, default mode, subtree atomicity, Zoom boundary, settings scope, and shortcut registration model.
- The highest implementation risks are command availability for detached/embedded focused editors, selecting visible-scope neighbors without exposing collapsed descendants, and preserving the current editor selection while the view rebuilds. These are explicitly covered by S-2, S-4, and S-5.
- The current runtime preflight is healthy, but it is a pre-change check. The implementation stage must rebuild/reload and repeat the accepted CDP proof; prior saved traces cannot substitute for that evidence.
- The worktree already contains a modified `scripts/start-obsidian-debug-env.ps1` and the task-owned harness run directory. Routing does not authorize overwriting unrelated existing changes; implementation should keep its diff limited to the accepted product/test surfaces and its run evidence.
- If implementation evidence contradicts the accepted target or requires native Markdown support, a new history model, a per-file setting, or another product choice, stop and route the mismatch to Human Review rather than broadening this contract.

## Decision

BLP-10 is `same-task-ready`. Start the normal implementation loop on the same Plane item using S-1 through S-5, then send the implementation snapshot to code review. This routing stage changed no product code, tests, settings, or generated output.
