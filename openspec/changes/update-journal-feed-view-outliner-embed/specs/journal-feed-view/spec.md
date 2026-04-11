# journal-feed-view Specification (Delta)

## ADDED Requirements

### Requirement: Outliner-enabled source days mount as File Outliner View

Journal Feed MUST mount outliner-enabled day files using the File Outliner View, and MUST mount non-outliner day files using a native Markdown editor embed.

For each mounted day section in Journal Feed:
- **IF** the day file is within the existing File Outliner scope (frontmatter or configured folders/files),
- **AND** File Outliner View is enabled,
- **THEN** the day section MUST mount its embedded editor surface using `blp-file-outliner-view` for that file.

If the day file is not outliner-enabled, the day section MUST mount a native Markdown editor embed (existing behavior).

This MUST NOT change how daily notes behave when opened directly in normal workspace leaves (existing routing rules still apply).

#### Scenario: Outliner-enabled day renders as Outliner View inside the feed
- **GIVEN** a daily-note file is within File Outliner scope
- **AND** a Journal Feed anchor note is opened
- **WHEN** the feed mounts the day section for that file
- **THEN** the embedded editor surface is a File Outliner View for that same file

#### Scenario: Non-outliner day still renders as Markdown editor inside the feed
- **GIVEN** a daily-note file is not within File Outliner scope
- **WHEN** the feed mounts the day section for that file
- **THEN** the embedded editor surface is a native Markdown editor for that same file
