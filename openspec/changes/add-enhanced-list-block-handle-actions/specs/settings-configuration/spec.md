# settings-configuration Spec Delta

## ADDED Requirements
### Requirement: Configure Enhanced List Blocks handle actions
The plugin SHALL provide a setting to enable/disable Enhanced List Blocks list-handle actions (click-to-fold and handle actions menu).

The setting:
- MUST default to enabled.
- MUST only affect Live Preview and Enhanced List Blocks enabled files.

#### Scenario: Disable handle actions
- **WHEN** the user disables the handle actions setting
- **THEN** clicking/right-clicking list handles does not trigger any handle actions

