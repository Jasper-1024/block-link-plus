# enhanced-list-blocks Spec Delta

## ADDED Requirements
### Requirement: Optional list-handle actions in Live Preview
When Enhanced List Blocks is enabled for a file, the plugin SHALL provide optional list-item handle actions in Live Preview to improve discoverability of outliner-like interactions.

The handle actions:
- MUST be scoped to Enhanced List Blocks enabled files.
- MUST be configurable via a plugin setting.
- MUST operate only in Live Preview.

#### Scenario: Clicking the handle toggles folding
- **WHEN** a file is Enhanced List Blocks enabled
- **AND** the user enables the handle actions setting
- **AND** the editor is in Live Preview
- **AND** the user left-clicks the unordered-list handle of a list item
- **THEN** the plugin toggles folding for that list item (fold/unfold)

#### Scenario: Dragging does not trigger folding
- **WHEN** the user drags a list item by its handle
- **THEN** the plugin MUST NOT trigger click-to-fold as a side effect

#### Scenario: Right-click shows a handle actions menu
- **WHEN** the user right-clicks a list item's handle
- **THEN** the plugin shows a context menu with handle actions for that list item

### Requirement: Copy block link/embed from handle actions
The plugin SHALL support copying a block link and embed link for the target list item from the handle actions menu.

#### Scenario: Copy block link
- **WHEN** the user selects "Copy block link" from the handle actions menu
- **THEN** the plugin copies `[[file#^id]]` for that list item to the clipboard

#### Scenario: Copy block embed
- **WHEN** the user selects "Copy block embed" from the handle actions menu
- **THEN** the plugin copies `![[file#^id]]` for that list item to the clipboard

