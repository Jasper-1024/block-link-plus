# file-outliner-view Specification (Delta)

## ADDED Requirements

### Requirement: Outliner View provides toggles for key Logseq-like affordances
The system SHALL provide user-facing settings (with localization support) to enable/disable the following Outliner View behaviors:
- bullet-handle drag-and-drop (move block subtrees)
- bullet-click zoom navigation (zoom into subtree)
- active-block emphasis line/highlight

Disabling a behavior MUST gate the corresponding UI interactions without changing the underlying file protocol.

#### Scenario: Drag-and-drop disabled prevents subtree moves
- **GIVEN** an outliner file is open in the Outliner View
- **AND** drag-and-drop is disabled in settings
- **WHEN** the user drags a block by its bullet handle
- **THEN** no move is applied to the block subtree

#### Scenario: Zoom disabled prevents zoom navigation
- **GIVEN** an outliner file is open in the Outliner View
- **AND** zoom is disabled in settings
- **WHEN** the user clicks a block bullet
- **THEN** the view does not enter a zoomed subtree state

#### Scenario: Active highlight disabled removes emphasis line
- **GIVEN** an outliner file is open in the Outliner View
- **AND** active highlight is disabled in settings
- **WHEN** the user edits a block
- **THEN** the active block does not render with an emphasis line/highlight style

