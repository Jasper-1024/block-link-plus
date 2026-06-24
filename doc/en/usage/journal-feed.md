# Journal Feed

Journal Feed is an **anchor-only** view that lets you read and edit multiple Daily Notes in one continuous scroll (similar to Logseq Journals), while keeping each day stored as its own Markdown file.

## Requirements

- Obsidian core plugin **Daily Notes** is enabled.
- Daily Notes folder + date format are configured (Settings → Daily Notes).

Journal Feed **only reads** these settings. It does not replace or interfere with Daily Notes features.

## Enable (Anchor Note)

Create any Markdown note (it does **not** need to be a daily note), and add this frontmatter:

```yaml
---
blp_journal_view: true

# Optional:
blp_journal_initial_days: 3   # default 3
blp_journal_page_size: 7      # default 7
---
```

Open this note normally. When `blp_journal_view: true` is present, Block Link Plus routes it into the Journal Feed view.

## Behavior

- Sources are resolved from Obsidian core **Daily Notes** settings (folder + format).
- The feed shows existing daily-note files in **descending** date order.
- Only a bounded window is loaded initially; older days are appended lazily as you scroll.
- Each day is rendered as its own section:
  - A day header + an **Open** button (opens the underlying day file normally)
  - An embedded editor backed by the real day file

## V1 Limits / Non-goals

- Does **not** create daily notes, manage templates, or replace Daily Notes commands.
- Opening a daily-note file directly keeps the existing behavior (normal Markdown view).
- Core Daily Notes only (no Periodic Notes support in V1).
- No cross-file operations (move blocks across days, unified undo/redo across multiple files, etc.).

## Troubleshooting

- If the feed says Daily Notes is disabled: enable Settings → Core plugins → Daily Notes.
- If it shows “No Daily Notes files found”: create daily notes first (in the configured folder).
- Use the **Open Anchor** button to open the anchor note as a normal Markdown source view.

