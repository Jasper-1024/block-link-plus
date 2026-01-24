## MODIFIED Requirements

### Requirement: Generate range-based block references
The plugin SHALL generate a stable range-based reference for a multi-line selection using the `^id-id` format.

#### Scenario: Create a multiline reference using an inline end marker (default)
- **WHEN** a user selects multiple lines and runs the command to create a multiline range block
- **AND** the start insertion line and end insertion line do not already end with a block ID
- **AND** appending `^id-id` inline at the end insertion line is safe
- **THEN** the plugin appends `^id` to the end of the start insertion line
- **AND** the plugin appends `^id-id` to the end of the end insertion line

#### Scenario: Auto-expand insertion points to Markdown block boundaries
- **WHEN** the selection start or end falls within a composite Markdown block (e.g. list, blockquote, fenced code, table, comment block)
- **THEN** the plugin MAY expand the effective insertion positions to the boundary of that block (typically the end boundary) so that inserted markers are parsed as block IDs

#### Scenario: Fallback to a standalone end marker when inline append is unsafe
- **WHEN** a user selects multiple lines and runs the command to create a multiline range block
- **AND** appending `^id-id` inline at the end insertion line is unsafe (e.g. the insertion point is inside code/table/blockquote/list context)
- **THEN** the plugin inserts a standalone `^id-id` marker line immediately after the end insertion block boundary
- **AND** the plugin inserts an additional blank line after the marker ONLY when required to ensure the marker forms its own Markdown block (e.g. the next line is a plain-text paragraph continuation)

#### Scenario: Fail without modifying the document when insertion points already have a block ID
- **WHEN** a user runs the command to create a multiline range block
- **AND** the start insertion line or end insertion line already ends with a block ID
- **THEN** the plugin does not modify the document
- **AND** the plugin notifies the user that the operation cannot be completed

#### Scenario: Fail without modifying the document when the selection is invalid
- **WHEN** a user runs the command to create a multiline range block
- **AND** the selection is invalid (e.g. single-line selection, crosses frontmatter, begins at empty-file start)
- **THEN** the plugin does not modify the document
- **AND** the plugin notifies the user that the operation cannot be completed

#### Scenario: Atomic insertion and rollback
- **WHEN** the plugin encounters any error while inserting the start marker or end marker
- **THEN** the plugin restores the document to its original state (no partial marker remains)
- **AND** the plugin notifies the user that the operation failed
