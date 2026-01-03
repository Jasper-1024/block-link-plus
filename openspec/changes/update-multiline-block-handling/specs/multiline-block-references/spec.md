## ADDED Requirements
### Requirement: Generate block IDs per selected block in multi-block mode
When the multi-line selection behavior is configured to **Add multi block IDs**, the plugin SHALL generate exactly one block ID per selected Markdown block (Obsidian block), not per visual/editor line.

Notes:
- A paragraph without blank lines is one block, even if it spans multiple editor lines.
- Each list item is a block.
- Blocks separated by blank lines are distinct blocks.

#### Scenario: Paragraph without blank lines yields one ID
- **WHEN** the selection spans multiple consecutive lines that belong to the same paragraph block (no blank line inside)
- **THEN** the plugin inserts (or reuses) a single `^id` for that paragraph block and copies exactly one link

#### Scenario: Partially selected block is included
- **WHEN** the selection starts and/or ends within a block (partial overlap), and the selection intersects that block
- **THEN** the plugin treats that block as selected and inserts (or reuses) exactly one `^id` for it

#### Scenario: Multiple blocks yield multiple IDs
- **WHEN** the selection spans multiple blocks (e.g., multiple list items, or multiple paragraphs separated by blank lines)
- **THEN** the plugin inserts (or reuses) one `^id` per block and copies one link per block (preserving selection order)

#### Scenario: Existing IDs are reused
- **WHEN** a selected block already ends with a `^id`
- **THEN** the plugin MUST reuse that ID and MUST NOT add a second ID to the same block

## MODIFIED Requirements
### Requirement: Generate range-based block references
Range end marker `^startId-endId` MUST be inserted as a standalone line and MUST NOT be inserted as a prefix of the following content line. If there is existing content on the next line, the marker insertion MUST preserve that content on its own line (i.e., the marker line must be terminated so the next line does not get prefixed).

#### Scenario: End marker does not prefix the next line
- **WHEN** the line immediately after the selection already contains non-empty content
- **THEN** the end marker appears on its own line between the selection and the next line, and the next line content is preserved

#### Scenario: End marker at end-of-file remains a standalone line
- **WHEN** a range end marker is inserted after a selection that ends at end-of-file
- **THEN** the marker appears on its own line at the end of the note

## ADDED Requirements
### Requirement: Reading/preview processing fails open
The plugin MUST NOT cause unrelated note content to disappear. If custom rendering for multiline embeds fails (or the environment does not support required APIs), the plugin SHALL keep Obsidian's native embed rendering visible (fail open).

#### Scenario: Processor error does not blank the note
- **WHEN** multiline embed post-processing throws an error or fails to initialize
- **THEN** the note continues to render normally and the native embed content remains visible
