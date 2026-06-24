# Proposal: add-journal-feed-view

## Why
Block Link Plus now provides a stable per-file Outliner workflow, but Obsidian daily notes still open as one file per pane.
That leaves a major gap versus Logseq Journals: users cannot stay inside one continuous "today + previous days" working surface while keeping each day stored as its own Markdown file.

The target is not to replace or interfere with Obsidian's existing Daily Notes behavior.
The target is to let one explicitly marked anchor note open a dedicated Journal Feed View that projects multiple existing daily-note files into one continuous, bounded, editable surface.

## What Changes

- Add a new `Journal Feed View` that routes only from anchor notes marked with `blp_journal_view: true`.
- Resolve Journal Feed sources from Obsidian's core Daily Notes settings (folder + date format).
- Configure Journal Feed behavior from anchor-note frontmatter:
  - `blp_journal_initial_days` (optional, default `3`)
  - `blp_journal_page_size` (optional, default `7`)
- Resolve existing daily-note source files from the Daily Notes config, sort them in descending date order, and open a bounded initial window near today.
- Append older day files lazily as the user scrolls, instead of loading the entire journal folder at once.
- Render each loaded day as a distinct section with:
  - a day header linked to the underlying source note
  - an editable embedded editor surface backed by that day's real Markdown file
- Mount/unmount per-day editors lazily based on viewport visibility to keep memory and DOM work bounded (similar to community implementations).
- Provide a safe error state and source-view escape hatch when the anchor config is missing or invalid.

## Non-Goals

- Do not change Obsidian core Daily Notes behavior, commands, templates, or note creation flow.
- Do not auto-route direct opens of daily-note source files into Journal Feed View.
- Do not support Periodic Notes configuration in V1 (core Daily Notes only).
- Do not provide cross-file block moves, merges, drag/drop, or unified undo/redo across multiple day files.
- Do not introduce global plugin settings for Journal Feed in V1; anchor-note frontmatter is the only configuration surface.

## Impact

- Affected specs:
  - `journal-feed-view` (new capability)
- Affected code:
  - `src/main.ts`
  - `src/features/journal-feed-view/*` (new)
  - `src/shared/i18n.ts`
  - docs for Journal Feed usage
- User-facing result:
  - One marked anchor note can open a Logseq-like continuous journal feed.
  - Existing daily-note files and Obsidian Daily Notes workflows continue to behave as before when opened directly.
