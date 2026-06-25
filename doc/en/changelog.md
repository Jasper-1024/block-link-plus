# Changelog

Version history and new features for Block Link Plus.

## Unreleased

## v2.0.16 (Current)

- Fix: block-link aliases now escape pipe characters (`|` -> `\|`) by default so copied links stay safe inside Markdown tables; disable with `escape_alias_pipe` if needed.
- Fix: inline embed editing no longer triggers passive Live Preview scroll jumps, preserves the native jump affordance, and removes extra bottom padding.
- Fix: inline-edit undo/redo keeps the embedded editor's visible range bounded so nearby note content does not leak into the embed.
- Fix: Outliner source-line navigation/search now resolves the owning block more reliably for continuation lines, system tail lines, and files with frontmatter.
- Docs: documentation deployment now uses the `doc/` site source and includes the related settings reference updates.

## v2.0.15

- Fix: Outliner structural edits (`Enter`, `Tab`, `Shift+Tab`) now preserve viewport position instead of jumping back to the top of the file.
- Fix: Outliner focus restoration after structural edits now keeps long-outline editing stable near the bottom of the note.

## v2.0.14

- Fix: embedded Outliner cards in Journal Feed no longer show a nested inner leaf header, so the editor content aligns with the outer day header on narrow/mobile layouts.
- Fix: embedded Outliner cards in Journal Feed no longer keep the standalone Outliner bottom spacer, making long notes easier to position inside the feed.
- Fix: embedded Outliner cards in Journal Feed now use a tighter left gutter/bullet column, removing the oversized left boundary on phones.

## v2.0.13

- Fix: Outliner block editing now keeps focus/scroll stable when clicking tabs or working near the bottom of a long outline.
- Fix: Outliner `Tab` / `Shift+Tab` now preserve visible block order whenever possible instead of moving the block to the target parent's tail.

## v2.0.12

- Fix: hide TaskNotes widgets inside inline embeds to avoid extra UI noise in embedded editors.

## v2.0.11

- Improved: Journal Feed now mounts outliner-enabled daily notes as embedded Outliner views for a consistent editing experience.
- Fix: the embedded Outliner editor command bridge now follows real editor focus, so suggests and editor commands stay reliable inside Journal Feed embeds.

## v2.0.10

- Fix: Journal Feed now hides Outliner system tail lines in the embedded editors (same as Outliner)

## v2.0.9

- Improved: Journal Feed now always discovers Daily Notes by recursively scanning the Daily Notes folder, using the configured date format (supports arbitrary subfolders)

## v2.0.8

- Fix: Journal Feed now discovers Daily Notes stored in subfolders (e.g. format `YYYY/M/YYYY-M-D`)

## v2.0.7

- New: Journal Feed view (anchor-only) for a continuous Daily Notes feed (Logseq-like Journals)

## v2.0.6

- Improved: Outliner V1 structural undo/redo now covers split, multiline paste, indent/outdent, merge, and drag/drop
- Improved: `Esc` now closes suggests first; otherwise it exits block edit mode or clears the current block-range selection

## v2.0.5

- Fix: Outliner block-range selection now supports right-click on selected blocks to open the bullet menu (no handle aiming)

## v2.0.4

- Improved: Outliner drag-select across blocks now selects a block range (whole-block highlight)

## v2.0.3

- Fix: Outliner multi-line blocks no longer render with extra blank lines (strict line breaks)

## v2.0.2

- Fix: Outliner display-mode embed preview (`![[...]]`) now renders closer to the inline editor (spacing/indent; avoid clipped list markers)

## v2.0.1

- Improved: Outliner edit mode supports core editor shortcuts (Ctrl+B, etc.) and allowlisted plugin editor commands (strict allowlist)
- New: Outliner settings for the editor command bridge + command allowlist, with a one-click copy action from the editor menu allowlist

## v2.0.0

- New: Outliner — a Logseq-like outliner view for scoped files; each list item is a stable referenceable block
- New: `blp-view` (Query/View) — Dataview-backed query/group/render (supports `embed-list` / `table`; optional `materialize` writeback)
- Improved: unified enable scope model (settings enabled folders/files + per-file frontmatter `blp_outliner: true/false`)
- Removed: legacy Timeline / Time section features (pin an old version if you still need them)

## v1.8.1

- Fix: Inline Edit preserves list item children when embedding list-item block references (e.g., `#^123`).
- Fix: Inline Edit no longer shows the embedded backlinks panel ("Link to current file").

## v1.8.0

- Inline Edit: migrated to a native leaf-based engine (ported from sync-embeds; more reliable in Live Preview).
- Removed legacy `!![[...]]` embed syntax; use `![[...]]`.
- Multi-line blocks: improved `^id-id` range creation (inline end marker when safe; otherwise inserted as a standalone line).
- Fix: multi-block mode now targets blocks (paragraphs/list items), not individual lines (#22/#27).
- Fix: when a list item has continuation lines, insert the block ID at the end of the item so Obsidian can index it.
- Fix: when selection stays within a single list item, range markers stay scoped to that item (no accidental expansion to the whole list).
- Fix: `^id-id` range embeds render consistently (including when Inline Edit is disabled).
- Fix: reading-mode postprocessor no longer blanks notes/embeds (#29).
- New: show a What's New modal once after upgrade.

## v1.7.6

- Fixed Timeline link matching to support full path link formats (e.g., `[[Task/path/file.md|alias]]`)
- Improved link matching with dual strategy: path resolution + basename matching
- Maintained backward compatibility with existing short-form links

## v1.7.5

- Enhanced multi-line block handling by extracting actual links without aliases in markdown processing and flow editor
- Update regex patterns to support both alias and non-alias formats
- Fix typo in settings for block ID prefix and update localization files for Chinese and Traditional Chinese
- Add new command for copying blocks as editable embeds
- Update UIMultilineBlock to conditionally create line click handler based on showEditIcon prop

## v1.5.3

- Improved **Timeline** output format for better readability and organization
- Added file links as entry points for each file group
- Added separators between file groups and empty lines between content
- Preserved user customizations to embedded links
- Updated documentation with new format examples
- Fixed link matching issues in Timeline filtering

## v1.5.0

- Added **Debug Mode** to Timeline feature for troubleshooting filtering issues
- Fixed section extraction in Timeline to properly match links
- Improved Timeline filtering accuracy with basename matching
- Added hash-based optimization to prevent unnecessary file updates
- Fixed various edge cases in Timeline functionality

## v1.4.0

- Added **Embed Block Editing** feature for a seamless inline editing experience
- Added **Timeline** feature (`blp-timeline`) to dynamically query and aggregate sections from your vault
- Migrated project to a standardized structure with source code in the `src` directory
- Refactored major components like Flow Editor into separate modules for better maintainability

## v1.3.0

- Added Time Section feature for inserting timestamps as headings
- Added automatic heading level determination for time sections
- Added special handling for daily notes with customizable pattern matching
- Added option to display time sections as plain text in preview mode
- Improved heading analysis with better level detection
- Fixed cursor positioning after inserting elements

## v1.2.4

- Added validation for edge cases in heading analysis to improve stability
- Enhanced error handling for the analyzeHeadings function
- Fixed potential issues when start_line and end_line are both zero

## v1.2.3

- Improved multi-line block handling, especially for list items
- Enhanced alias generation for multi-line blocks
- Added configurable notifications for block link copying
- Fixed list block ID handling and positioning
- Improved selected text handling for aliases

## v1.2.0

- Reorganized settings menu structure for better usability
- Fixed heading block handling when text contains headings
- Added experimental option: heading_id_newline for controlling heading block ID newline behavior
- Improved settings text clarity and organization

## v1.1.3

- Fixed block ID handling for list items
- Optimized block ID insertion position for list type blocks
- Improved list block handling logic

## v1.1.2

- Added new block link alias type: Selected text
- Improved alias handling for heading blocks
- Fixed alias generation for single-line blocks
- Enhanced alias type configuration options
- Improved documentation and settings descriptions

## v1.1.0

- Added support for Obsidian URI links
- Added customizable block link alias types:
  - First x characters of block content
  - Nearest heading title
- Improved command and menu text for better clarity
- Fixed consistency between command palette and right-click menu functionality

## Contributing

If you find issues or have feature suggestions:

1. Check [GitHub Issues](https://github.com/Jasper-1024/obsidian-block-link-plus/issues)
2. Submit detailed bug reports or feature requests
3. Participate in community discussions and testing
