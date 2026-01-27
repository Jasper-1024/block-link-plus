# settings-configuration Spec Delta

## ADDED Requirements
### Requirement: Configure Enhanced List block selection mode
The plugin SHALL allow users to enable block selection mode for Enhanced List Blocks by configuring the list handle click action to `select-block`.

#### Scenario: Select-block option is available
- **WHEN** the user opens the Enhanced List settings
- **THEN** the handle click action dropdown includes a `select-block` option

#### Scenario: Disable by choosing another click action
- **WHEN** the user changes the handle click action away from `select-block`
- **THEN** clicking list handles no longer triggers block selection behavior

