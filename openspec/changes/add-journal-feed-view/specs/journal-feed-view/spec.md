# journal-feed-view Specification (Delta)

## ADDED Requirements

### Requirement: Journal Feed View is anchor-only and opt-in
The plugin SHALL provide a Journal Feed View that activates only when the opened markdown file is an anchor note with `blp_journal_view: true`.

Anchor-note frontmatter MUST support:
- `blp_journal_view: true`
- `blp_journal_initial_days: <positive-integer>` (optional, default `3`)
- `blp_journal_page_size: <positive-integer>` (optional, default `7`)

The plugin MUST NOT alter:
- Obsidian Daily Notes creation/open commands
- direct opens of source daily-note files
- existing native Markdown / File Outliner routing for non-anchor notes

#### Scenario: Opening an anchor note routes to Journal Feed
- **GIVEN** a markdown file has `blp_journal_view: true`
- **WHEN** the user opens that file
- **THEN** the pane opens in Journal Feed View

#### Scenario: Opening a source daily note directly keeps existing behavior
- **GIVEN** a daily-note file is a valid Daily Notes note (based on the core Daily Notes settings)
- **AND** that daily-note file does not have `blp_journal_view: true`
- **WHEN** the user opens the daily-note file directly
- **THEN** the plugin does not route it to Journal Feed View

### Requirement: Journal Feed resolves source notes from existing daily files only
Journal Feed SHALL resolve source day sections only from existing Daily Notes Markdown files recognized by Obsidian core Daily Notes settings.

The plugin MUST use the core Daily Notes settings as the source of truth for:
- Daily Notes folder
- Daily Notes date format (Moment-style tokens)

Resolved source files MUST be sorted by resolved Daily Notes date in descending order.

Files that do not match the date format MUST be ignored and MUST NOT be rewritten.

#### Scenario: Non-journal files in the folder are ignored
- **GIVEN** the Daily Notes folder contains `2026-04-05.md` and `scratch.md`
- **AND** the Daily Notes date format is `YYYY-MM-DD`
- **WHEN** the anchor note is opened
- **THEN** `2026-04-05.md` is eligible for the feed
- **AND** `scratch.md` is ignored

### Requirement: Journal Feed loads a bounded descending window
Journal Feed MUST NOT eagerly mount every resolved source file when the anchor note opens.

It MUST:
- choose an initial starting point at today's journal if present
- otherwise choose the most recent resolved journal whose date is less than or equal to today
- otherwise fall back to the most recent resolved journal
- mount at most `blp_journal_initial_days` source files initially
- append at most `blp_journal_page_size` older source files per lazy-load step as the user scrolls downward

#### Scenario: Large journal folder opens with a bounded initial window
- **GIVEN** the Daily Notes folder contains hundreds of existing daily-note files
- **AND** `blp_journal_initial_days` is `3`
- **WHEN** the user opens the anchor note
- **THEN** Journal Feed initially mounts no more than `3` day sections
- **AND** older days remain unloaded until a later lazy-load step

### Requirement: Each loaded day section preserves source-file boundaries
Each loaded day section in Journal Feed MUST:
- display a day header for the resolved journal date
- provide a link or action that opens the underlying source file directly
- mount an editable embedded editor surface backed by that one source file
- persist edits only to that source file

Journal Feed MUST NOT provide cross-file structural editing semantics in V1.

#### Scenario: Editing one day does not rewrite another day file
- **GIVEN** Journal Feed has loaded day sections for `2026-04-05.md` and `2026-04-04.md`
- **WHEN** the user edits blocks inside the `2026-04-05.md` section
- **THEN** only `2026-04-05.md` is modified on disk
- **AND** `2026-04-04.md` remains unchanged

### Requirement: Editors are mounted lazily and may be unloaded when offscreen
To keep resource usage bounded, the Journal Feed View MUST support lazy mounting of embedded per-day editors based on viewport visibility (best-effort).

At minimum:
- Editors SHOULD be created only when a day section is in or near the viewport.
- Editors MAY be detached/unloaded after a short delay when the section leaves the viewport.
- A placeholder MUST remain so scroll position does not jump when an editor is unloaded.

#### Scenario: Offscreen day sections do not keep editors mounted
- **GIVEN** a Journal Feed has loaded many day sections
- **WHEN** the user scrolls such that a day section is far outside the viewport
- **THEN** the plugin MAY unload that section's embedded editor
- **AND** the section remains present with a placeholder to preserve scroll layout

### Requirement: Missing Daily Notes or empty sources fail safely
If Obsidian core Daily Notes is unavailable/disabled, or Journal Feed resolves no source daily-note files, the plugin SHALL fail safely.

Fail-safe behavior MUST:
- show an actionable error or empty state inside Journal Feed View
- provide a source-view escape hatch back to the anchor markdown file
- avoid modifying anchor or source files

#### Scenario: Daily Notes disabled shows safe error state
- **GIVEN** a markdown file has `blp_journal_view: true`
- **AND** Obsidian core Daily Notes is disabled or unavailable
- **WHEN** the user opens the file
- **THEN** Journal Feed View shows an actionable configuration error
- **AND** the user can switch back to the anchor file's source view
- **AND** no file content is modified
