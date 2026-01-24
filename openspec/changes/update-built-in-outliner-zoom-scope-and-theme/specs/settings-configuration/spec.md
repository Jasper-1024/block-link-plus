# settings-configuration Spec Delta

## ADDED Requirements
### Requirement: Configure built-in Outliner/Zoom scope
The plugin SHALL provide settings to scope built-in Outliner/Zoom list interactions and styling to Enhanced List Blocks enabled files.

The settings:
- MUST be user-configurable in the settings tab.
- MUST be opt-in (to avoid changing behavior for existing users).

#### Scenario: User enables scoping
- **WHEN** the user enables built-in Outliner/Zoom
- **AND** the user enables the "scope to Enhanced List" option
- **THEN** built-in list UX only applies to Enhanced List Blocks enabled files

### Requirement: Built-in Outliner list visuals support community themes
The plugin SHALL allow built-in Outliner list visuals (better list styling, vertical indentation lines) to work even when a community theme is enabled.

#### Scenario: Community theme still shows list visuals
- **WHEN** the user enables a non-default Obsidian theme
- **AND** the user enables built-in Outliner list visuals
- **THEN** the list visuals are still applied
