# enhanced-list-blocks Spec Delta

## ADDED Requirements
### Requirement: Optional block selection mode (Live Preview)
When Enhanced List Blocks is enabled for a file, the plugin SHALL provide an optional “block selection mode” for list items in Live Preview, so users can select and operate on blocks as units (Roam/Logseq style).

The block selection mode:
- MUST be scoped to Enhanced List Blocks enabled files.
- MUST be configurable via a plugin setting.
- MUST operate only in Live Preview.
- MUST NOT modify note content.

#### Scenario: Click handle selects a block
- **WHEN** a file is Enhanced List Blocks enabled
- **AND** the user sets the handle click action to `select-block`
- **AND** the editor is in Live Preview
- **WHEN** the user clicks the unordered list handle of a list item
- **THEN** the plugin selects that list item as a block (block selection state updates)
- **AND** the editor shows a visual highlight for the selected block

#### Scenario: Shift-click selects a contiguous range of blocks
- **GIVEN** block selection mode is enabled
- **WHEN** the user shift-clicks another unordered list handle
- **THEN** the plugin selects the contiguous block range between the anchor block and the clicked block
- **AND** all blocks in the range are visually highlighted

#### Scenario: Escape clears block selection
- **GIVEN** one or more blocks are selected
- **WHEN** the user presses Escape
- **THEN** the plugin clears the block selection state and removes block highlights

#### Scenario: Dragging does not trigger selection
- **WHEN** the user drags a list item by its handle (outliner drag-and-drop)
- **THEN** the plugin MUST NOT toggle or change block selection as a side effect

