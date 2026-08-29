## Status

- Verdict: accepted
- Review Snapshot: base `7b2f8b588e6dc76b1e7876c7999784a63986341c`, review tree `66e29cfb1997435b18e8c4af1d6d169bad330197`, diff SHA-256 `e135de5bead42c5cae153c3f21a4a25fb3e93f26c86f3b5e99a4147b2fdce861`
- Snapshot freshness: all 13 pinned product/test paths matched the review-tree blobs, and the recomputed binary diff hash matched the snapshot. The review worktree remained unchanged by validation.

## Plane Reply

The pinned implementation is accepted for the Human Review gate. It adds the two persisted File Outliner movement modes, registered Alt+Arrow commands, atomic subtree movement, focus/selection/viewport/history handling, and detached Journal Feed routing required by the accepted implementation contract. Both review axes pass and no blocking finding remains.

## Blocking Findings

None.

## Non-Blocking Risks

- The runtime evidence is JSON/geometry evidence rather than a screenshot or video. It includes non-zero before/after viewport offsets and direct state assertions, so this is an evidence limitation rather than a correctness blocker.
- Unit tests mock some Obsidian seams. Fresh normal and detached runtime probes independently exercised the real command registration, focus gate, embedded-view registry, persistence, disk writes, and editor state.

## Contract Compliance

| Contract area | Result | Evidence |
| --- | --- | --- |
| Active-block movement and registered commands | Pass | `moveActiveBlock` is routed through the focused File Outliner view; up/down commands use default Alt+ArrowUp/Down hotkeys and remain rebindable. |
| Same-level mode | Pass | The engine selects the adjacent direct sibling only, rejects cross-parent/indent changes, preserves the complete source subtree, and no-ops at boundaries. |
| Cross-level-align mode | Pass | The engine scans the adjacent eligible visible block, aligns the moved subtree to the target depth, and preserves relative child indentation. |
| Visibility, Zoom, and collapsed subtrees | Pass | The engine receives the view's Zoom root and collapsed IDs; collapsed source/target subtrees are atomic, and invalid/edge targets no-op. |
| State preservation and structural history | Pass | Structural application preserves the original selection and editor focus, supports undo/redo, updates affected IDs, and preserves viewport position. No-op operations do not create history or dirty/save work. |
| Persistence and localization | Pass | The two-value setting defaults to same-level, persists across reload, and has labels/options in all three supported locales. |
| Detached Journal Feed routing | Pass | The active embedded-view registry makes the command discoverable when the File Outliner is detached from the active Journal Feed leaf. |
| Scope and architecture | Pass | Movement is implemented in the pure engine and applied through the existing structural-history/focus/save path; no second CodeMirror movement keymap or block-ID/serialization change was introduced. |

The implementation-routing contract at `implementation-routing.md` sections 17-21 and the six-item implementation contract in sections 46-51 are covered by the current diff and the runtime traces.

## Correctness And Standards

### Axis A: Contract / Spec

Pass. The implementation matches the requested behavior: the active block is moved up or down, the source subtree moves atomically, same-level mode is sibling-only, cross-level-align mode can cross indentation boundaries, boundaries and missing targets are no-ops, and the setting/commands are registered and persisted. Focus, selection, cursor, viewport, disk, and structural history behavior were checked in both code and runtime.

The implementation does not expand the feature into multi-block selection movement, cross-file movement, Native Markdown behavior, Inline Edit Embeds, drag/drop semantics, per-file settings, or a second editor keymap.

### Axis B: Correctness / Standards

Pass. The directional engine is pure and immutable at its boundary, linearizes complete subtrees, guards against ancestor-overlap targets, rebuilds normalized trees, clears parser source ranges on moved results, and reports only changed IDs. The view applies its result through the established structural history path. Command lookup handles the active leaf, workspace outliner leaves, and detached embedded views while requiring an actually focused editor.

Independent validation passed:

- Focused regression suites: 8 suites, 62 tests.
- Full test suite: 45 suites, 244 tests.
- Type/build validation: `corepack pnpm run build-with-types` passed.
- Workflow validation: `corepack pnpm run agent:workflow-check` passed.
- Snapshot diff validation: recomputed diff hash matched and `git diff --check` passed.

No current source-range, stale drag/drop, focus, history, persistence, or viewport defect was found in the pinned tree. The prior review artifact's findings were against a different snapshot and are not carried forward as findings here.

## Validation Limitations

- No screenshot/video was captured. The normal proof recorded non-zero viewport geometry (`scrollTop` 47.3333, `scrollHeight` 1820, `clientHeight` 160) before and after movement and history operations, and the detached proof recorded the real detached topology and disk result.
- The `implementation.md` R1 RED/GREEN narrative cannot be independently attributed to this pinned diff: the pinned base already omits `_sourceLineRanges` in `cloneBlock` and `cloneBlockShallow`. That self-report was treated as context rather than independent evidence; the current focused regressions and fresh runtime checks passed.
- The detached live probe exercised the up direction; the normal live probe exercised both directions, both modes, rebinding, collapsed/Zoom/boundary no-ops, persistence, history, focus, selection, viewport, and disk behavior.

## Required Revisions

None.

## Decision

`accepted`. Both the Contract / Spec and Correctness / Standards axes pass for the pinned review snapshot. Route the item to the Human Review gate; no implementation revision is required from this code review.
