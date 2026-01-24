# enhanced-list-blocks Spec Delta

## ADDED Requirements
### Requirement: Built-in Outliner/Zoom respect Enhanced List Blocks scope
When built-in Outliner (`obsidian-outliner`) and/or built-in Zoom (`obsidian-zoom`) are enabled, the plugin SHALL be able to scope their list-related interactions and styling to Enhanced List Blocks enabled files.

When scoped:
- List interactions (e.g. click-to-zoom, drag-and-drop) MUST NOT intercept events in non-enabled files.
- List styling (vendored CSS) MUST NOT visually affect non-enabled files.
- Behavior MUST apply only in Live Preview.

#### Scenario: Enabled file uses built-in outliner/zoom list UX
- **WHEN** a file is Enhanced List Blocks enabled
- **AND** built-in Outliner/Zoom are enabled
- **AND** scoping to Enhanced List is enabled
- **THEN** built-in list interactions and styling are active in that file

#### Scenario: Non-enabled file is unaffected
- **WHEN** a file is NOT Enhanced List Blocks enabled
- **AND** built-in Outliner/Zoom are enabled
- **AND** scoping to Enhanced List is enabled
- **THEN** built-in list interactions and styling are not active in that file

