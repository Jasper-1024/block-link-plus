
## ADDED Requirements

### Requirement: Block-range selection supports the bullet context menu via right-click
When block-range selection is active in the File Outliner View, right-clicking within a selected block MUST open
the existing Outliner bullet context menu at the mouse position.

This behavior MUST be implemented via event delegation on the Outliner root and MUST NOT override context menus
inside embedded editors (`.markdown-source-view`) or the Outliner CM6 editor host.

#### Scenario: Right-click on a selected block opens the bullet menu
- **GIVEN** a scoped outliner file is open in the File Outliner View
- **AND** the user has an active block-range selection covering blocks `A..C`
- **WHEN** the user right-clicks on the display area of block `B`
- **THEN** the Outliner bullet context menu opens (equivalent to right-clicking the bullet handle)
