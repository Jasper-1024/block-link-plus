# file-outliner-view Specification (Delta)

## ADDED Requirements

### Requirement: Provide a source-view escape hatch
The Outliner View MUST provide a pane menu action that opens the current file in the native Obsidian Markdown editor in source mode, bypassing outliner routing.

#### Scenario: Open the same file in Markdown source view
- **GIVEN** a scoped outliner file is open in the Outliner View
- **WHEN** the user selects "Open source view" from the pane menu
- **THEN** the current pane switches to the native Markdown view
- **AND** the editor is in source mode for the same file path

