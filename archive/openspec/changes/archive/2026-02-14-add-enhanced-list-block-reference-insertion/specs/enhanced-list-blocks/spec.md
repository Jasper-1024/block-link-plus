# enhanced-list-blocks Spec Delta

## ADDED Requirements
### Requirement: Block reference picker (insert `[[file#^id]]` / `![[...]]`)
When Enhanced List Blocks is enabled for a file, the plugin SHALL provide an editor workflow to search blocks and insert a reference or embed to a chosen block (`[[file#^id]]` / `![[file#^id]]`).

The block reference picker:
- MUST be scoped to Enhanced List Blocks enabled files.
- MUST operate in Live Preview (safe no-op / no trigger in non-Live Preview).
- MUST NOT persist a vault-wide block index to disk (in-memory only).

#### Scenario: Command opens picker and inserts a reference
- **GIVEN** the active file is Enhanced List Blocks enabled
- **WHEN** the user runs the “Insert Block Reference” command
- **THEN** the plugin opens a block picker modal
- **AND** selecting a block inserts `[[file#^id]]` at the cursor

#### Scenario: Command inserts an embed
- **GIVEN** the active file is Enhanced List Blocks enabled
- **WHEN** the user runs the “Insert Block Embed” command
- **THEN** selecting a block inserts `![[file#^id]]` at the cursor

#### Scenario: Typing `((` triggers picker and replaces the typed token
- **GIVEN** the active file is Enhanced List Blocks enabled
- **AND** the editor is in Live Preview
- **WHEN** the user types `((`
- **THEN** the plugin opens the block picker modal
- **AND** selecting a block replaces the typed `((` with the inserted `[[file#^id]]`

