# enhanced-list-blocks Spec Delta

## ADDED Requirements
### Requirement: Subtree clipboard in block selection mode (Live Preview)
When Enhanced List Blocks is enabled for a file, and block selection mode has one or more selected blocks, the plugin SHALL treat clipboard operations (copy/cut/paste) as **block subtree** operations.

The subtree clipboard behavior:
- MUST be scoped to Enhanced List Blocks enabled files.
- MUST operate only in Live Preview.
- MUST NOT persist any index/cache to disk.
- MUST keep `text/plain` external-friendly (system lines removed).
- SHOULD preserve block structure on paste (nested list indentation remains correct).

#### Scenario: Copy serializes selected subtree and strips system lines from text/plain
- **GIVEN** one or more blocks are selected in block selection mode
- **WHEN** the user triggers copy
- **THEN** the plugin writes `text/plain` that excludes system lines (`[date:: ...] ^id`)
- **AND** the plugin writes an internal clipboard payload that includes full text with system lines

#### Scenario: Cut removes selected subtree
- **GIVEN** one or more blocks are selected in block selection mode
- **WHEN** the user triggers cut
- **THEN** the plugin removes the selected blocks and all of their nested children from the document
- **AND** the clipboard payload is written as in copy

#### Scenario: Paste replaces selected subtree using internal payload
- **GIVEN** one or more blocks are selected in block selection mode
- **AND** the clipboard contains an internal subtree payload
- **WHEN** the user triggers paste
- **THEN** the plugin replaces the selected subtree ranges with the pasted subtree
- **AND** the pasted subtree is reindented to the destination block indent level

#### Scenario: Copy-paste remaps ids
- **GIVEN** the internal subtree payload was produced by copy (not cut)
- **WHEN** the user pastes into an Enhanced List Blocks file
- **THEN** the plugin SHOULD generate new `^id` system line IDs for pasted blocks to avoid duplicates

