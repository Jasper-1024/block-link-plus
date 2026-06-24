## ADDED Requirements
### Requirement: Search Result Line Navigation
The File Outliner view SHALL honor line-oriented Obsidian open state by scrolling to the Outliner block that owns the requested source line.

#### Scenario: Search result opens an outliner block
- **GIVEN** an Outliner-enabled markdown file is routed into the File Outliner view
- **AND** Obsidian opens it with ephemeral state containing `line` or `startLoc.line`
- **WHEN** the requested line belongs to an Outliner block body or system tail line
- **THEN** the File Outliner view scrolls that block into view

#### Scenario: Search result opens a legacy nested outliner block
- **GIVEN** an Outliner-enabled markdown file uses a legacy tail-after-children layout
- **AND** Obsidian opens it with ephemeral state pointing to a child block body line
- **WHEN** the File Outliner view receives the ephemeral state
- **THEN** it scrolls the child block into view rather than the parent block

#### Scenario: Block subpath remains preferred
- **GIVEN** Obsidian opens an Outliner-enabled markdown file with both a `#^block-id` subpath and line-oriented state
- **WHEN** the File Outliner view receives the ephemeral state
- **THEN** it scrolls to the block identified by the subpath

#### Scenario: Unmapped line is ignored
- **GIVEN** Obsidian opens an Outliner-enabled markdown file with line-oriented state
- **WHEN** the requested line does not map to any Outliner block
- **THEN** the File Outliner view opens normally without throwing, modifying content, or entering edit mode
