## Context

Journal Feed V1 mounts each day section as a detached native Markdown editor leaf.
This provides a stable multi-file "infinite journal" surface, but it loses the File Outliner View experience for users who have outliner enabled for daily notes.

The goal is not to merge files or change storage.
The goal is to render each day section using the correct *view* for that file:
- outliner-enabled file => File Outliner View UX
- non-outliner file => native Markdown editor UX

## Goals

- Preserve Journal Feed V1 boundaries (anchor-only, per-file saves, bounded lazy loading).
- When a day file is outliner-enabled, the day section should look and behave like opening that file directly (handles, highlighting, drag/drop, block semantics).
- Keep the implementation safe by reusing existing detached-leaf patterns.

## Non-Goals

- No new cross-file semantics inside Journal Feed.
- No changes to File Outliner scope rules.
- No forced migration of daily notes into outliner format.

## Decisions

### 1) Per-day renderer selection based on existing scope rules

For each day file:
- If `isFileOutlinerEnabledFile(plugin, file)` and `fileOutlinerViewEnabled !== false`, mount a detached `FileOutlinerView`.
- Else mount the existing detached `MarkdownView`.

This keeps Journal Feed compatible for users who do not enable Outliner at all.

### 2) Detached Outliner leaves are created via `leaf.setViewState`

Detached leaves skip user-facing routing (`isDetachedLeaf` guard), so opening files via `leaf.openFile(...)` will always produce MarkdownView.

For an embedded Outliner session we must explicitly request:

```ts
await leaf.setViewState({ type: FILE_OUTLINER_VIEW_TYPE, state: { file: file.path }, active: false });
```

Then reparent `leaf.view.containerEl` into the section host container, matching the existing EmbedLeafManager pattern.

### 3) Make Outliner active editor bridge focus-based (embedded-safe)

File Outliner View currently installs its `workspace.activeEditor` bridge only when:
- editing a block
- AND the Outliner leaf is the active workspace leaf

Embedded Outliner leaves are detached and will not become `workspace.activeLeaf`, so the bridge never installs.
That can break core EditorSuggest UIs (`[[`, `/`) and editor commands that depend on `workspace.activeEditor`.

We will update the bridge gate to allow installation when the Outliner editor is focused (e.g. `:focus-within`), and we will trigger bridge updates on focusin/focusout events.

This keeps normal workspace behavior intact while enabling embedded Outliner sections to behave like first-class editors when the user is interacting with them.

## Risks / Trade-offs

- Multiple embedded Outliner editors could compete for `workspace.activeEditor`. Focus-based gating should avoid conflicts (only the focused editor installs the bridge).
- Detached leaves are internal; we must ensure they never leak into workspace routing, history, or pane management.
- Per-day Outliner View mounting is heavier than MarkdownView; lazy mount/unmount remains required.

