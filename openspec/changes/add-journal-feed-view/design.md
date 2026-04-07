## Context

The current File Outliner View is designed around one real Markdown file per view.
That gives clear save boundaries, canonical normalization, and stable editing semantics.

Journal Feed needs a higher-level surface:
- one anchor note controls the view
- multiple existing daily-note files appear in one descending continuous feed
- each source file must keep its own storage boundary and save lifecycle
- opening a daily-note file directly must keep existing Obsidian / BLP behavior

## Goals

- Add an anchor-only continuous journal surface similar to Logseq Journals.
- Keep all source daily notes as normal Markdown files with normal vault paths.
- Reuse as much of the existing File Outliner editing model as possible.
- Keep first open and scrolling bounded for large journal folders.
- Fail safely when Daily Notes sources are unavailable.

## Non-Goals

- No global takeover of daily-note routing.
- No Periodic Notes support in V1 (core Daily Notes only).
- No multi-file unified history, clipboard, drag/drop, or structural operations.
- No change to on-disk daily-note format beyond normal per-file Markdown editing.

## Decisions

### 1. Anchor-only routing

Journal Feed is activated only when a markdown file has:

```yaml
blp_journal_view: true
```

Direct opens of source daily-note files are never routed into Journal Feed automatically.
They continue to open via existing behavior:
- native Markdown view, or
- File Outliner View if they already match existing outliner scope/frontmatter rules.

This preserves Obsidian Daily Notes commands and user expectations.

### 2. Resolve sources from core Daily Notes settings

V1 uses Obsidian's core Daily Notes settings for source resolution:
- daily note folder
- daily note date format (Moment tokens)

```yaml
blp_journal_view: true
blp_journal_initial_days: 3
blp_journal_page_size: 7
```

Rules:
- `blp_journal_initial_days` defaults to `3`.
- `blp_journal_page_size` defaults to `7`.

Daily Notes settings are resolved at runtime from the internal plugin instance (best-effort):
- `app.internalPlugins.getPluginById('daily-notes')?.instance.getFolder()`
- `app.internalPlugins.getPluginById('daily-notes')?.instance.getFormat()`
- `app.internalPlugins.getPluginById('daily-notes')?.instance.iterateDailyNotes(cb)`

If Daily Notes is disabled/unavailable, Journal Feed fails safely with an actionable error.

### 3. Source resolution is descending and bounded

Given the Daily Notes config, resolve existing daily notes using Daily Notes' own iteration API
and sort them by timestamp descending.

Initial window:
- if a file dated today exists, start there
- otherwise start from the most recent resolved daily note with date `<= today`
- otherwise fall back to the most recent resolved daily note

Loading policy:
- mount at most `initial_days` on first open
- append at most `page_size` older files when the user scrolls near the bottom
- never eagerly mount the full journal folder

This keeps the feed aligned with the "today, yesterday, older..." mental model.

### 4. Preserve per-file editing boundaries

Journal Feed is a multi-document host, not one merged `ParsedOutlinerFile`.

Each day section owns:
- one source file path
- one isolated embedded editor session
- one independent save boundary
- no cross-file history semantics

Editing a block inside one day section must write only that source file.
No operation may implicitly restructure another day file.

### 5. Embed native Markdown editors via detached leaves (V1)

Community implementations (e.g. Daily Notes Editor) achieve the "many notes in one scroll" experience by mounting native Markdown editors into a custom view and unloading them when offscreen.

BLP already has a safe pattern for internal/detached leaves (InlineEditEngine):
- create `new WorkspaceLeaf(app)`
- mark it with `markLeafAsDetached(leaf)` so user-facing routing ignores it
- open the file in source mode and reparent the view DOM into a host container

V1 SHOULD follow this approach:
- Each day section mounts a detached leaf running the native markdown editor in Live Preview (best-effort).
- Day sections mount/unmount editors based on viewport visibility (intersection observer + root margin).
- The view remains anchor-only: these detached leaves are internal implementation detail and MUST NOT become normal workspace panes.

This avoids a large refactor of the existing File Outliner View while still delivering a practical, editable continuous journal.

### 6. Safe invalid-config behavior

If Daily Notes is disabled/unavailable, or Journal Feed cannot resolve any source daily notes:
- open the Journal Feed shell
- show an actionable error/empty state
- offer a source-view escape hatch back to the anchor markdown file
- do not write to anchor or source files

## Risks / Trade-offs

- Extracting a reusable single-file outliner session touches mature code and must avoid regressions in the standalone File Outliner View.
- Multiple mounted day sections can still be expensive; bounded loading is required from day one.
- Command routing and "active editor" behavior inside a multi-document host may expose assumptions currently tied to one active leaf.
- Journal Feed must ensure editor commands route to the focused embedded day editor (BLP already has a proven command routing mechanism via InlineEditEngine focus tracking).

## Verification Strategy

- Unit tests for:
  - anchor config parsing/defaulting
  - source-file resolution and descending date order
  - initial window selection
  - lazy append of older days
  - per-file persistence isolation
- Targeted regression tests to ensure direct opens of source daily notes are not rerouted into Journal Feed.
- Build verification with `npm run build-with-types`.
- Obsidian/CDP smoke test for:
  - open anchor note
  - view shows today + prior days
  - scroll loads older days
  - edit one day and verify only that source file changes
