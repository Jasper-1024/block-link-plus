# file-outliner-view Specification (Delta)

## ADDED Requirements

### Requirement: Provide a reciprocal “Open as Outliner” toggle in Markdown view
When a scoped file is open in the native Markdown view, the pane menu MUST provide an action to open the same file in the File Outliner View (v2).

#### Scenario: Toggle from Markdown back to Outliner
- **GIVEN** a file is in File Outliner scope
- **AND** the file is currently open in the native Markdown view
- **WHEN** the user selects “Open as Outliner” from the pane menu
- **THEN** the current pane switches to the File Outliner View for the same file

