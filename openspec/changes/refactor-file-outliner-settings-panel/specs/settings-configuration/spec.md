# settings-configuration Specification (Delta)

## ADDED Requirements

### Requirement: Outliner scope settings are edited via list-based controls
The settings UI MUST provide list-based editors for File Outliner scope configuration:
- Enabled folders (vault-relative)
- Enabled files (vault-relative)

Each list editor MUST support:
- Adding a new row
- Removing a row
- Reordering rows
- Path suggestions (best-effort) to reduce typos

#### Scenario: User adds an enabled folder via list UI
- **GIVEN** the user opens the Outliner settings tab
- **WHEN** the user adds a new enabled folder row and selects a folder suggestion
- **THEN** the folder path is persisted to `fileOutlinerEnabledFolders`

### Requirement: Editor-menu allowlist is edited via list-based controls with suggestions
The settings UI MUST provide a list-based editor for `fileOutlinerEditorContextMenuAllowedPlugins`.

The editor SHOULD provide plugin id suggestions from the installed plugin manifests, and MUST include `core` as an option.

#### Scenario: User adds an allowlisted plugin id
- **GIVEN** the user opens the Outliner settings tab
- **WHEN** the user adds a plugin id row and selects an installed plugin id suggestion
- **THEN** the plugin id is persisted to `fileOutlinerEditorContextMenuAllowedPlugins`

### Requirement: Outliner settings are grouped by functional headings
The settings UI MUST group File Outliner settings into multiple headings so users can scan them quickly.

#### Scenario: User finds settings by scanning group headings
- **GIVEN** the Outliner settings tab is open
- **WHEN** the user scans the headings
- **THEN** scope, editing, integrations, and debug-related items are visually separated
