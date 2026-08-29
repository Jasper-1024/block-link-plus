# Design Intake: BLP-10

## Status

- State: Design Intake
- Verdict: human-review-required

## Plane Reply

Human approval was confirmed on 2026-08-25 for the bounded File Outliner
Alt+ArrowUp/Down design. Use standard Obsidian commands with default hotkeys
that users can rebind, a persistent movement-mode setting defaulting to
Same-level only, atomic source and target subtrees, and a non-crossable Zoom
root. The item is ready for `Review Approved` and implementation routing.

## Current Understanding

BLP-10 is a Plane-only enhancement with the `cdp-required` label. It asks for
VS Code-style Alt+ArrowUp/Down movement of the block containing the current
cursor, including its nested child subtree, with clean boundary no-ops and
best-effort preservation of editor focus, cursor/selection, content, and view
position.

The user-visible mode choices are:

- **Same-level only:** move only among sibling blocks at the same nesting level;
  do not change indentation or cross a parent/child boundary.
- **Cross-level align:** use the previous/next block regardless of nesting and
  align the moved block's indentation to that adjacent target.

Human review fixed the remaining product choices: the feature is only a faster
alternative to existing drag-and-drop in File Outliner; both source and target
blocks move as complete subtrees; the Zoom root is a hard movement boundary;
the movement mode is the only new BLP setting; and shortcut customization uses
Obsidian's standard Hotkeys UI.

The source issue contains the full claim and acceptance criteria; there is no
configured external issue to fetch. The current worktree is the reset master
baseline mentioned by the latest tracker feedback, so the prior implementation
and saved traces are not treated as current product evidence. The current
runtime baseline below was collected again from the task-owned instance.

## Repo Findings

### Existing block model and structural seams

- `src/features/file-outliner-view/protocol.ts:30` models each
  `OutlinerBlock` as a node with `depth`, editable `text`, and nested
  `children`. This makes the block plus descendants the existing natural
  atomic move unit.
- `src/features/file-outliner-view/engine.ts:338` and `:400` already provide
  linearize/rebuild-based indentation operations that preserve visible order.
  `moveBlockSubtree` at `:443` already moves a tree node before/after another
  node for drag/drop, rejects moves relative to descendants, and recomputes
  depths. It currently returns a zeroed selection and has no movement-mode or
  cross-level target selection semantics, so it should be extended or wrapped
  rather than called directly for the keyboard feature.
- `src/features/file-outliner-view/view.ts:1925` is the shared structural
  application boundary. It records view-local undo/redo snapshots, marks dirty
  blocks, schedules persistence, rebuilds the DOM, restores focus, and captures
  the viewport when `scroll` is false. Routing keyboard movement through this
  boundary avoids creating a second history or focus model.
- The current selection type is `{ id, start, end }`. A move can preserve the
  block id and range offsets because block text does not change; preserving
  selection direction would require a broader selection-model change and is
  not necessary for the first slice.

### Keyboard, command, and settings patterns

- `src/features/file-outliner-view/editor-state.ts:58` installs the Outliner
  CodeMirror keymap. It handles existing structural keys (`Enter`, `Tab`,
  `Shift-Tab`, `Backspace`, and `Delete`) through host callbacks, while plain
  ArrowUp/Down are reserved for vertical navigation.
- `src/features/file-outliner-view/view.ts:1004` wires those host callbacks to
  `FileOutlinerView`; `onEditorTab` at `:2277` demonstrates the expected
  selection-to-engine-to-structural-apply path.
- `src/features/file-outliner-view/commands.ts:5` and `:22` register named
  Outliner commands with default hotkeys for task operations. The existing
  pattern supports exposing named movement commands while the CM6 keymap
  guarantees that an editor-local Alt+Arrow event is intercepted.
- `src/types/index.ts:66-80` and `:115-129` hold the persisted Outliner
  settings and defaults. `src/main.ts:223` merges defaults with saved data, so
  adding a new setting is backward-compatible for existing users.
- `src/ui/SettingsTab.ts:610-655` already has an Outliner Editing group with
  persisted dropdowns. `src/shared/i18n.ts:170`, `:730`, and `:1289` contain
  the English, Simplified Chinese, and Traditional Chinese setting strings.
  The mode setting belongs beside the existing structural editing options.

### Existing verification seams

- `src/features/file-outliner-view/__tests__/engine.test.ts:130-274` covers
  indentation and subtree moves, including nested descendants, boundary
  protection, input immutability, and selection results.
- `src/features/file-outliner-view/__tests__/editor-shortcuts.test.ts` covers
  modifier detection, and `editor-state.test.ts` exercises host callback
  routing. These are the natural places for Alt+Arrow keymap tests.
- `view-structural-history-regression.test.ts` already protects the focus and
  stale-editor-text behavior that a keyboard move must reuse.

### Runtime baseline

The runner-owned runtime was validated with `ensure_runtime({ fresh: false })`:

- Task identity: `blp-BLP-10`; vault: `blp-BLP-10`; Obsidian target title:
  `start - blp-BLP-10 - Obsidian 1.13.4`; plugin: `block-link-plus` 2.0.16;
  CDP port: `19233`.
- Probe command:
  `node scripts/obsidian-cdp.js eval-file '.tmp/PLANE-BLP-10/alt-move-design-baseline.js'`.
- The probe opened a real `blp-file-outliner-view` containing root blocks `a`,
  `b` (with child `bc`), and `c`, entered block `b`, and dispatched Alt+ArrowUp
  and Alt+ArrowDown. Both orders stayed `a, b, c`, the child remained under
  `b`, `editingId` stayed `b`, the cursor stayed at `{ from: 1, to: 1 }`, and
  both events remained unprevented. The current settings object has no
  `fileOutlinerMoveMode` key.
- The temporary note was removed; the active file returned to
  `_debug/start.md`; enabled-file settings returned to `[]`.
- Durable trace: `docs/harness/runs/PLANE-BLP-10/trace/design-intake/alt-move-baseline.json`.

This is baseline evidence, not post-change validation. No product code,
tests, settings, or build output were changed in this stage.

## Discussion Questions

All design questions were resolved by human review on 2026-08-25.

1. **Which editor surfaces own the shortcut? — Confirmed**

   Decision: scope the first implementation to focused
   `FileOutlinerView` editors, including a detached/embedded Outliner instance
   when its own editor has focus; do not add structural movement to the native
   Markdown editor or Inline Edit Embed.

   Why it matters: the existing `OutlinerBlock` tree and structural history
   only exist in `FileOutlinerView`. Extending native Markdown would require a
   separate parser, selection model, and persistence contract rather than a
   bounded BLP change.

2. **How are Alt+ArrowUp/Down registered? — Confirmed**

   Decision: add two standard Obsidian commands with default Alt+Arrow hotkeys
   and `checkCallback` availability limited to an active File Outliner block
   editor. Users may remove or rebind them in Obsidian Hotkeys. Do not register
   duplicate fixed CM6 Alt+Arrow bindings. Both commands call one view
   interface, `moveActiveBlock(up | down)`, so one keypress has one
   execution path.

   Why it matters: standard commands provide discoverability and rebinding,
   while a single execution path prevents a block from moving twice.

3. **What is the default movement mode? — Confirmed**

   Decision: default to `same-level` (Same-level only).

   Why it matters: this is the least surprising and least destructive behavior
   for existing Outliner users; it never changes indentation. Users can opt in
   to cross-level indentation rewrites through the persisted setting.

4. **What is the target and Zoom behavior? — Confirmed**

   Decision: use the immediate previous/next eligible block in the current
   visible Outliner scope, excluding the current subtree and collapsed hidden
   descendants. Treat both the current block and the target block as complete
   subtree units. Move before the target subtree for Up or after the target
   subtree for Down, align the moved root to the target root's depth, and
   preserve descendant-relative depths. The current Zoom root is not eligible
   as a crossable target; movement at that boundary is a handled no-op.

   Why it matters: this matches the visible Outliner operation, prevents
   cycles and stale out-of-scope DOM, and avoids moving the active editor out
   of a Zoom context.

5. **Which behavior is configurable? — Confirmed**

   Decision: add one global persisted dropdown under Outliner → Editing with
   the two explicit mode labels. Read it at invocation time so changes apply to
   the next move without reload. Do not add a per-file override, transient
   menu, toolbar action, or automatic mode switch.

   Why it matters: movement policy is a genuine user preference; subtree,
   Zoom, history, focus, and persistence rules remain stable correctness
   invariants rather than a growing matrix of settings.

## Candidate Scope

After human approval, the smallest coherent implementation slice is:

1. Add a persisted `FileOutliner` movement-mode union and conservative default,
   merge it through `DEFAULT_SETTINGS`, and render the two options in the
   existing Outliner Editing settings group with English, Simplified Chinese,
   and Traditional Chinese labels.
2. Add a pure engine operation for direction + mode that:
   - treats the selected block and all descendants as one source subtree;
   - selects only the adjacent direct sibling subtree in Same-level mode;
   - selects the immediate eligible visible-scope neighbor outside the source
     subtree in Cross-level align mode, treating the target and its descendants
     as one atomic subtree rather than exposing collapsed descendants as
     individual targets;
   - treats the current Zoom root as a non-crossable boundary;
   - moves the source before the target subtree for Up or after the target
     subtree for Down, keeps block text and ids unchanged, aligns the source
     root to the target root in Cross-level mode, preserves descendant-relative
     depths, and recomputes valid absolute depths;
   - returns the original block selection for a successful move and a
     `didChange: false` result at boundaries or invalid targets; and
   - reports every affected block id needed for correct rendering/persistence,
     including descendants whose indentation changes.
3. Add one view interface, `moveActiveBlock(up | down)`, and register two
   standard Obsidian commands whose default Alt+Arrow hotkeys users can remove
   or rebind through Obsidian Hotkeys. Do not add duplicate fixed CM6 Alt+Arrow
   bindings. Route successful moves through `applyStructuralEngineResult` so
   undo/redo, stale-editor protection, focus, cursor range, viewport
   restoration, and debounced save behavior remain centralized. A handled
   boundary no-op must create no history entry, dirty state, or save.
4. Add focused unit tests for command availability and single dispatch,
   same-level sibling-subtree movement, source/target subtree preservation,
   cross-level up/down alignment, collapsed descendants and Zoom boundaries,
   selection preservation, invalid-target no-ops, setting defaults and
   persistence, and structural-history integration.
5. Rebuild/reload the plugin and collect CDP proof in the implementation stage
   using a mixed-depth temporary note. The proof should cover the default and
   rebound commands, exactly one move per invocation, both movement modes,
   top/bottom and Zoom-root no-ops, atomic source/target subtree movement,
   immediate setting changes and persistence after reload, on-disk
   indentation/order, one-step undo/redo, focus/cursor/selection, and viewport
   stability. The implementation artifact must record exact commands and
   post-change trace output.

## ADR Candidates

None. The recommended design extends the existing pure engine and view-local
structural-history seams and adds a reversible persisted setting. It does not
introduce a hard-to-reverse boundary or a surprising architecture decision.
Reconsider an ADR only if approval expands the feature to native Markdown
editing, a shared cross-view reorder service, or a new global history model.

## Non-Goals

- Structural movement in the native Markdown editor, arbitrary Markdown
  blocks, or Inline Edit Embeds.
- Moving a block-range selection or multiple independently selected blocks;
  the first slice acts only on the block owning the active editor selection.
- Changing drag/drop semantics, zoom/collapse behavior, block IDs, protocol
  versioning, cross-file moves, or the existing Outliner serialization format.
- Crossing the current Zoom root or acting through a stale editor outside the
  active visible Outliner scope.
- Adding duplicate fixed CM6 Alt+Arrow bindings alongside the standard Obsidian
  commands.
- Adding a per-file mode override, automatic mode switching, quick menu,
  toolbar control, or a second transient menu state.
- Replacing CodeMirror text history or creating a new global undo journal;
  keyboard moves remain one view-local structural history entry each.
- Claiming post-change command behavior, indentation alignment, persistence,
  or focus/scroll validation during design intake; those remain implementation
  and CDP validation gates.
