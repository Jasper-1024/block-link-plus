# Proposal: update-journal-feed-view-outliner-embed

## Why

Journal Feed V1 achieves the "many daily notes in one continuous scroll" workflow, but each day section currently mounts a native Markdown editor surface.

For users who rely on BLP File Outliner View for daily notes, this is a significant experience gap:
- no outliner bullet handles
- no Logseq-like threading/highlight affordances
- no outliner drag-and-drop within the day section

The feed is only "daily-note correct" (same files) but not "editing-experience correct" (same view semantics) compared to opening a daily note directly in File Outliner View.

## What Changes

- Journal Feed day sections MUST choose their embedded editor surface based on the existing File Outliner scope rules:
  - If the day file is outliner-enabled and File Outliner View is enabled, mount it as a detached `blp-file-outliner-view`.
  - Otherwise, keep the existing native Markdown editor embed behavior.
- Keep all Journal Feed V1 boundaries:
  - anchor-only routing (`blp_journal_view: true`)
  - core Daily Notes settings remain the source of truth
  - per-file save boundaries; no cross-file structural semantics
  - lazy mount/unmount based on viewport visibility
- Make File Outliner View's editor command bridge install/uninstall based on editor focus (best-effort), so embedded outliner sessions can drive core EditorSuggest and editor commands without requiring the leaf to be a normal workspace leaf.

## Non-Goals

- Do not change Obsidian core Daily Notes behavior or note creation.
- Do not auto-route direct opens of daily notes into Journal Feed.
- Do not introduce cross-file moves/merges/undo across multiple day files.
- Do not change File Outliner scope rules (frontmatter + enabled files/folders remain the source of truth).

## Impact

- Affected specs:
  - `journal-feed-view`
  - `file-outliner-view`
- Affected code:
  - `src/features/journal-feed-view/view.ts`
  - `src/features/file-outliner-view/view.ts`
  - new journal-feed embedding helper/manager (detached outliner leaf mounting)
- User-facing result:
  - Journal Feed retains its continuous journal UX.
  - Outliner-enabled daily notes render and behave like the standalone File Outliner View inside the feed.

